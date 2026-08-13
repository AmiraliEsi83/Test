# DSMP Social Network Simulator v3.2 User Guide

This guide describes the software that is actually in the v3.2 branch. Use it for student lab work: loading a dataset, running SVM or MLP, measuring performance, and comparing original vs balanced training data.

## 1. Start the simulator

1. Complete setup with `python build.py setup` (Python 3.9 or 3.10, JDK 8+, Maven). See the README for details.
2. Run with `python build.py run`.
3. The window title area shows **DSMP Lab v3.2**.
4. Click **Performance Measurement** if you are on the User Sim screen.

Typical Performance Measurement workflow:

1. **File -> Dataset From Text**
2. **Get Users**
3. Set algorithm and other parameters
4. **Initialize**
5. Select a user to recommend for
6. **Start Simulation**
7. Read results and timings in the results panes

If you change parameters (including Data Balancing or MLP Settings), **Initialize** again before the next run.

## 2. Load a dataset

Use **File -> Dataset From Text**.

- Choose a tab-separated text corpus (examples are under `TestedDataset/` and `important-stuff/`).
- The import dialog includes a **Data Balancing** panel. This is a v3.2 control; it does not rewrite the file on disk.
- After you approve a file, a confirmation dialog repeats the file name and the current balancing setting.
- Press **Get Users**, then **Initialize**.

The same Data Balancing combo also appears on the main Performance Measurement panel so you can change it without re-opening the file dialog.

Repeated loading is supported: choose another file, press **Get Users**, then **Initialize**.

## 3. Algorithms

The **Algorithm** combo includes Similarity, K-Means, **SVM**, **MLP**, Doc2Vec, Common-Neighbors, and K-meansEuclidean.

- **SVM** is the faster classifier baseline for most student checks.
- **MLP** trains a neural network on TF-IDF user vectors to predict followee/class labels. It is slower than SVM, especially on large vocabularies.

When **MLP** is selected, **MLP Settings** becomes enabled.

## 4. MLP settings

Open **MLP Settings** after selecting MLP.

Default Legacy Neuroph MLP (safe student defaults):

- Engine: Legacy Neuroph MLP
- Hidden layers: 1
- Hidden neurons per layer: 10
- Learning rate: 0.1
- Max error: 0.01
- **Max iterations: 100**

These defaults keep the original network shape from earlier DSMP versions, but they **always cap iterations at 100** unless you raise the limit. Neuroph otherwise trains until the max-error target is reached, which may never happen on a large TF-IDF dataset.

You can set **Max iterations** from 1 to 2000. Higher values can improve fit but take longer. They do not remove the cap.

**Sparse Federated MLP** is optional and experimental. It uses a separate **Sparse epochs** limit (default 8), not the Legacy Neuroph iteration cap.

### Expected behavior on large datasets

- Training runs on a JADE agent thread, not on the Swing event thread, so the window should remain usable.
- **Current Progress** and the results pane report start, iteration/epoch updates, and completion.
- A long pause with updating iteration text means the model is still training. That is not a crash.
- Dense Legacy Neuroph MLP on a full large corpus can still take several minutes because each iteration is expensive. The run is bounded by max iterations.
- For a quick functional check, use **SVM**, a smaller file, or a lower **Tweet Limit**.

## 5. Performance Measurement

After a run finishes, the results pane shows mapper/reducer timings, including algorithm time. A second run moves the previous pane’s text into **previous results** so you can compare.

Re-Initialize between runs that change Data Balancing, algorithm, or MLP settings so stale agent state is not reused.

## 6. Original vs balanced comparison

1. Set **Data Balancing** to **Use Original Dataset (no balancing)**.
2. Initialize and run SVM or MLP. Record Performance Measurement.
3. Set **Data Balancing** to **Use Balanced Dataset (oversample training classes)**.
4. **Initialize** again, then run the same algorithm.
5. Compare the new results with the previous-results pane.

Do not expect the two runs to share a live in-memory model. Each Initialize/Start builds a fresh training set from the loaded file.

## 7. Data Balancing

### 7.1 Where the control is

There are two views of the **same** setting:

1. **File -> Dataset From Text** — a **Data Balancing** panel on the right of the file chooser.
2. The Performance Measurement panel — combo labeled **Data Balancing**, next to the SVM batch-users field.

Changing either combo updates the other.

### 7.2 How to enable or disable it

- **Use Original Dataset (no balancing)** — default. Training keeps the imported followee/class counts.
- **Use Balanced Dataset (oversample training classes)** — minority training classes are randomly oversampled (with replacement) until they match the majority-class count.

The source text file is never rewritten. Only the in-memory **training** user list is copied and, when enabled, expanded.

### 7.3 What happens when balancing is enabled

- The class/target variable is the **followee** label already used by SVM and MLP.
- Train/test splitting still happens first (stratified). Balancing is applied **only to the training users**.
- Test and recommendation rows are not oversampled, which avoids leaking copies of test users into training.
- Binary and multiclass followee labels are both supported.
- If classes are already equal, the original training list is kept and the results pane says so.
- A class with only one training example is duplicated as needed.
- Users with a missing followee label stay in the list but are not used as a balancing class; the report counts them.

### 7.4 How to view class distributions

After Initialize/Start, the results pane prints a report in this form:

```
Original class distribution:
Class A: X
Class B: Y
Balanced class distribution:
Class A: X
Class B: Y
```

When balancing is off, only the original distribution is shown.

### 7.5 Algorithm used

v3.2 uses **seeded random oversampling** of training users by followee class. It does not use SMOTE. Feature vectors stay aligned with labels because the same user id (and therefore the same TF-IDF vector) is reused.

## 8. Troubleshooting

### MLP taking a long time

1. Confirm **Current Progress** is still advancing (iteration N of 100, or similar).
2. Default cap is 100 Legacy Neuroph iterations. Lower it in **MLP Settings** for a faster lab check.
3. Use **SVM** if you only need to verify the dataset and Performance Measurement path.
4. Reduce **Tweet Limit** or use a smaller file from `TestedDataset/`.

The GUI is not frozen merely because training is slow. Iteration messages mean work is happening in the background.

### Cannot find Data Balancing

Look in **File -> Dataset From Text** (accessory panel) and on the Performance Measurement panel labeled **Data Balancing**. There is no separate hidden menu. If the combo says **Use Original Dataset**, balancing is off.

### Invalid or malformed dataset

Load a correctly formatted tab-separated corpus. If Initialize fails, an error dialog appears and the console has the stack trace. Choose another file, then **Get Users** and **Initialize** again.

### Model execution failed

SVM and MLP failures show a dialog instead of only a console stack trace. Console logging is still written for debugging. Re-Initialize after fixing the dataset or settings. Do not click **Start Simulation** repeatedly while a run is in progress; wait or use **Reset Experiment**.

### Buttons stay disabled

Wait for the finished-simulation dialog, or press **Reset Experiment**. Changing Data Balancing or MLP Settings still requires **Initialize** before the next **Start Simulation**.
