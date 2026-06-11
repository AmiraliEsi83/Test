import base64
import sys
import time

from doc2vec_shared import Doc2Vec, ensure_shared_model, score_candidate_shard


SCORE_PREFIX = "DOC2VEC_SCORE"
ERROR_PREFIX = "DOC2VEC_ERROR"
DONE_PREFIX = "DOC2VEC_DONE"


def usage():
    print(
        "usage: doc2vec_batch.py <topn> <dataset_file> <node_number> "
        "<num_nodes> <workers> <users_file>",
        file=sys.stderr,
    )


def parse_args():
    if len(sys.argv) != 7:
        usage()
        sys.exit(2)

    topn = max(int(sys.argv[1]), 1)
    dataset_file = sys.argv[2]
    node_number = max(int(sys.argv[3]), 1)
    num_nodes = max(int(sys.argv[4]), 1)
    workers = max(int(sys.argv[5]), 1)
    users_file = sys.argv[6]

    if node_number > num_nodes:
        node_number = ((node_number - 1) % num_nodes) + 1

    with open(users_file, "r", encoding="utf-8") as input_file:
        users = [line.rstrip("\r\n") for line in input_file]
    users = [user for user in users if user]
    if not users:
        raise RuntimeError("No users were supplied for Doc2Vec batch scoring")

    return topn, dataset_file, node_number, num_nodes, workers, users


def encode_field(value):
    return base64.b64encode(str(value).encode("utf-8")).decode("ascii")


def emit_score(user, candidate, score):
    print(
        "%s\t%s\t%s\t%s"
        % (SCORE_PREFIX, encode_field(user), encode_field(candidate), repr(float(score)))
    )


def emit_error(user, error):
    message = str(error).replace("\r", " ").replace("\n", " ")
    print("%s\t%s\t%s" % (ERROR_PREFIX, encode_field(user), encode_field(message)))


def emit_done(user):
    print("%s\t%s" % (DONE_PREFIX, encode_field(user)))


def fallback_candidate_shard(model, user, topn, node_number, num_nodes):
    query_index = model.dv.key_to_index.get(user)
    node_offset = node_number - 1
    candidates = []
    for index, tag in enumerate(model.dv.index_to_key):
        if query_index is not None and index == query_index:
            continue
        if num_nodes > 1 and (index % num_nodes) != node_offset:
            continue
        candidates.append((tag, -1.0))
        if len(candidates) >= topn:
            break
    return candidates


def main():
    start_time = time.time()
    topn, dataset_file, node_number, num_nodes, workers, users = parse_args()
    print(
        "batch model config: users=%s topn=%s node=%s/%s workers=%s"
        % (len(users), topn, node_number, num_nodes, workers)
    )

    model_path = ensure_shared_model(dataset_file, workers)
    model = Doc2Vec.load(model_path)

    for user in users:
        try:
            results = score_candidate_shard(model, user, topn, node_number, num_nodes)
        except Exception as error:
            emit_error(user, error)
            results = fallback_candidate_shard(model, user, topn, node_number, num_nodes)

        for candidate, score in results:
            emit_score(user, candidate, score)
        emit_done(user)

    completion_time_ms = (time.time() - start_time) * 1000.0
    print("completionTime", completion_time_ms)


if __name__ == "__main__":
    main()
