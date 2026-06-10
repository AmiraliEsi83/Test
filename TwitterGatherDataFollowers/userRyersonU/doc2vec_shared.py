import csv
import hashlib
import json
import math
import os
import pickle
import sys
import time

os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

import numpy as np
import pandas as pd
from gensim.models import Doc2Vec
from gensim.models.doc2vec import TaggedDocument
from gensim.parsing.preprocessing import STOPWORDS as gensim_stop_words
from gensim.utils import simple_preprocess
from nltk.stem.lancaster import LancasterStemmer
from sklearn.feature_extraction import text


MODEL_DIR = "Stored_Doc2VecModel"
CACHE_DIR = os.path.join(MODEL_DIR, "shared_cache")
DATASET_CACHE_DIR = os.path.join("Dataset", "424k")

MODEL_PARAMS = {
    "dm": 0,
    "dbow_words": 1,
    "min_count": 4,
    "negative": 3,
    "hs": 0,
    "sample": 1e-4,
    "window": 5,
    "vector_size": 300,
    "epochs": 20,
}


def usage():
    print(
        "usage: doc2vec_shared.py <user> <topn> <dataset_file> <node_number> <num_nodes> [workers]",
        file=sys.stderr,
    )


def parse_args():
    if len(sys.argv) < 6:
        usage()
        sys.exit(2)

    user = str(sys.argv[1])
    topn = int(sys.argv[2])
    dataset_file = sys.argv[3]
    node_number = int(sys.argv[4])
    num_nodes = int(sys.argv[5])
    if len(sys.argv) > 6:
        workers = int(sys.argv[6])
    else:
        cpu_count = os.cpu_count() or 4
        workers = min(max(cpu_count - 1, 1), 12)

    if topn < 1:
        topn = 1
    if node_number < 1:
        node_number = 1
    if num_nodes < 1:
        num_nodes = 1
    if node_number > num_nodes:
        node_number = ((node_number - 1) % num_nodes) + 1
    if workers < 1:
        workers = 1

    return user, topn, dataset_file, node_number, num_nodes, workers


def dataset_signature(dataset_file, workers):
    absolute_path = os.path.abspath(dataset_file)
    stat_info = os.stat(absolute_path)
    signature = {
        "dataset_path": absolute_path,
        "dataset_size": stat_info.st_size,
        "dataset_mtime_ns": stat_info.st_mtime_ns,
        "model_params": MODEL_PARAMS,
        "workers": workers,
        "script_version": 1,
    }
    encoded = json.dumps(signature, sort_keys=True).encode("utf-8")
    cache_key = hashlib.sha256(encoded).hexdigest()[:24]
    return cache_key, signature


def read_dataset_rows(dataset_file):
    rows = []
    with open(dataset_file, "r", encoding="utf-8", errors="ignore", newline="") as input_file:
        reader = csv.reader(input_file, delimiter="\t")
        for fields in reader:
            if len(fields) >= 6:
                tweet_text = fields[5]
                follower = fields[4]
            elif len(fields) >= 2:
                tweet_text = fields[0]
                follower = fields[1]
            else:
                continue

            if tweet_text is None or follower is None:
                continue

            tweet_text = str(tweet_text).strip()
            follower = str(follower).strip()
            if tweet_text and follower:
                rows.append((tweet_text, follower))
    return rows


def make_stop_words():
    letters = list("abcdefghijklmnopqrstuvwxyz")
    numbers = list("0123456789")
    words = [
        "a",
        "able",
        "about",
        "above",
        "abst",
        "accordance",
        "according",
        "actually",
        "added",
        "affected",
        "affecting",
        "another",
        "anybody",
        "anyhow",
        "around",
        "back",
        "became",
        "because",
        "become",
        "beginnings",
        "cant",
    ]
    stopwords = gensim_stop_words.union(set(letters)).union(set(numbers)).union(set(words))
    return text.ENGLISH_STOP_WORDS.union(stopwords)


def preprocess_text(tweet_text, stop_words, stemmer):
    simple = simple_preprocess(tweet_text)
    return [stemmer.stem(word) for word in simple if word not in stop_words]


def build_tagged_documents(rows):
    stop_words = make_stop_words()
    stemmer = LancasterStemmer()
    tagged_docs = []
    for tweet_text, follower in rows:
        words = preprocess_text(tweet_text, stop_words, stemmer)
        tagged_docs.append(TaggedDocument(words=words, tags=[str(follower)]))
    return tagged_docs


def write_dataset_cache(rows, cache_key):
    os.makedirs(DATASET_CACHE_DIR, exist_ok=True)
    csv_path = os.path.join(DATASET_CACHE_DIR, "shared_doc2vec_" + cache_key + ".csv")
    pickle_path = os.path.join(DATASET_CACHE_DIR, "shared_doc2vec_" + cache_key + ".pkl")
    lookup_path = os.path.join(DATASET_CACHE_DIR, "shared_doc2vec_" + cache_key + "_lookup_dict.pickle")

    df = pd.DataFrame(rows, columns=["Tweets", "Follower"])
    df.to_csv(csv_path, index=False)
    df.to_pickle(pickle_path)

    lookup_df = df[["Tweets", "Follower"]].copy()
    lookup_df["Follower"] = lookup_df["Follower"].astype(str)
    lookup_df = lookup_df.set_index("Follower")
    lookup_df = lookup_df.loc[~lookup_df.index.duplicated(keep="first")]
    with open(lookup_path, "wb") as output_file:
        pickle.dump(lookup_df.to_dict(orient="index"), output_file, pickle.HIGHEST_PROTOCOL)


def valid_cached_model(model_path, meta_path, expected_signature):
    if not os.path.exists(model_path) or not os.path.exists(meta_path):
        return False
    try:
        with open(meta_path, "r", encoding="utf-8") as meta_file:
            actual_signature = json.load(meta_file)
        return actual_signature == expected_signature
    except Exception:
        return False


def acquire_lock(lock_path):
    try:
        fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        with os.fdopen(fd, "w", encoding="utf-8") as lock_file:
            lock_file.write(str(os.getpid()))
        return True
    except FileExistsError:
        return False


def wait_for_model(model_path, meta_path, expected_signature, lock_path):
    last_message_time = 0.0
    while True:
        if valid_cached_model(model_path, meta_path, expected_signature):
            return

        if not os.path.exists(lock_path):
            return

        now = time.time()
        if now - last_message_time > 30:
            print("model wait: another Doc2Vec node is training the shared model")
            last_message_time = now
        time.sleep(2)


def train_shared_model(dataset_file, cache_key, signature, model_path, meta_path, workers):
    print("model train: building shared Doc2Vec model")
    rows = read_dataset_rows(dataset_file)
    if not rows:
        raise RuntimeError("No usable rows found in dataset: " + dataset_file)

    write_dataset_cache(rows, cache_key)
    tagged_docs = build_tagged_documents(rows)

    model = Doc2Vec(
        dm=MODEL_PARAMS["dm"],
        dbow_words=MODEL_PARAMS["dbow_words"],
        min_count=MODEL_PARAMS["min_count"],
        negative=MODEL_PARAMS["negative"],
        hs=MODEL_PARAMS["hs"],
        sample=MODEL_PARAMS["sample"],
        window=MODEL_PARAMS["window"],
        vector_size=MODEL_PARAMS["vector_size"],
        workers=workers,
    )
    model.build_vocab(tagged_docs, progress_per=100)
    model.train(tagged_docs, total_examples=model.corpus_count, epochs=MODEL_PARAMS["epochs"])
    model.save(model_path)
    with open(meta_path, "w", encoding="utf-8") as meta_file:
        json.dump(signature, meta_file, sort_keys=True, indent=2)
    print("model train: shared Doc2Vec model saved")


def ensure_shared_model(dataset_file, workers):
    os.makedirs(CACHE_DIR, exist_ok=True)
    cache_key, signature = dataset_signature(dataset_file, workers)
    model_path = os.path.join(CACHE_DIR, "shared_" + cache_key + ".model")
    meta_path = os.path.join(CACHE_DIR, "shared_" + cache_key + ".json")
    lock_path = os.path.join(CACHE_DIR, "shared_" + cache_key + ".lock")

    if valid_cached_model(model_path, meta_path, signature):
        print("model cache: using existing shared Doc2Vec model")
        return model_path

    if acquire_lock(lock_path):
        try:
            if not valid_cached_model(model_path, meta_path, signature):
                train_shared_model(dataset_file, cache_key, signature, model_path, meta_path, workers)
        finally:
            try:
                os.remove(lock_path)
            except OSError:
                pass
    else:
        wait_for_model(model_path, meta_path, signature, lock_path)
        if not valid_cached_model(model_path, meta_path, signature):
            return ensure_shared_model(dataset_file, workers)

    return model_path


def score_candidate_shard(model, user, topn, node_number, num_nodes):
    if user not in model.dv.key_to_index:
        raise RuntimeError("User is not present in Doc2Vec model: " + user)

    query_index = model.dv.key_to_index[user]
    normed_vectors = model.dv.get_normed_vectors()
    query_vector = normed_vectors[query_index]

    node_offset = node_number - 1
    scored_candidates = []
    for index, tag in enumerate(model.dv.index_to_key):
        if index == query_index:
            continue
        if num_nodes > 1 and (index % num_nodes) != node_offset:
            continue

        score = float(np.dot(normed_vectors[index], query_vector))
        if math.isnan(score) or math.isinf(score):
            continue
        scored_candidates.append((tag, score))

    scored_candidates.sort(key=lambda item: item[1], reverse=True)
    return scored_candidates[:topn]


def main():
    start_time = time.time()
    user, topn, dataset_file, node_number, num_nodes, workers = parse_args()
    print(
        "model config: user=%s topn=%s node=%s/%s workers=%s"
        % (user, topn, node_number, num_nodes, workers)
    )

    model_path = ensure_shared_model(dataset_file, workers)
    model = Doc2Vec.load(model_path)
    results = score_candidate_shard(model, user, topn, node_number, num_nodes)

    for candidate, score in results:
        print("python", (candidate, score))

    completion_time_ms = (time.time() - start_time) * 1000.0
    print("completionTime", completion_time_ms)


if __name__ == "__main__":
    main()
