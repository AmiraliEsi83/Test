# Lab 7 — Model Evaluation Metrics (Quiz)

**Name:** Amir Ali Eslami  
**Student Number:** 501200510  
**Course:** CCPS 844 — Data Mining

---

## I — Regression Metrics (MAE, MSE, RMSE)

| HPI Actual | HPI Predicted | Absolute Error \|e\| | Squared Error e² |
|-----------:|--------------:|---------------------:|-----------------:|
| 175 | 135 | 40 | 1600 |
| 216 | 256 | 40 | 1600 |
| 288 | 231 | 57 | 3249 |
| 298 | 267 | 31 | 961 |
| 193 | 139 | 54 | 2916 |
| 159 | 150 | 9 | 81 |
| 183 | 127 | 56 | 3136 |
| 278 | 216 | 62 | 3844 |
| 189 | 139 | 50 | 2500 |
| 223 | 250 | 27 | 729 |
| 297 | 264 | 33 | 1089 |
| **n = 11** | | **Σ = 459** | **Σ = 21705** |

### Formulas and answers

\[
MAE = \frac{1}{n}\sum_{i=1}^{n}|y_i - \hat{y}_i| = \frac{459}{11} = \mathbf{41.7273}
\]

\[
MSE = \frac{1}{n}\sum_{i=1}^{n}(y_i - \hat{y}_i)^2 = \frac{21705}{11} = \mathbf{1973.1818}
\]

\[
RMSE = \sqrt{MSE} = \sqrt{1973.1818} = \mathbf{44.4205}
\]

| Metric | Value |
|--------|------:|
| **MAE** | **41.7273** |
| **MSE** | **1973.1818** |
| **RMSE** | **44.4205** |

---

## II — Classification Metrics (M / W)

Treating **M = positive class** and **W = negative class**.

| # | Actual | Predicted | Outcome |
|--:|:------:|:---------:|:--------|
| 1 | M | W | FN |
| 2 | M | M | TP |
| 3 | W | W | TN |
| 4 | M | M | TP |
| 5 | W | M | FP |
| 6 | W | W | TN |
| 7 | W | W | TN |
| 8 | M | M | TP |
| 9 | M | W | FN |
| 10 | W | W | TN |

### Confusion counts

| | Predicted M (Pos) | Predicted W (Neg) |
|--|:--:|:--:|
| **Actual M (Pos)** | TP = **3** | FN = **2** |
| **Actual W (Neg)** | FP = **1** | TN = **4** |

### Metrics

\[
Accuracy = Classification\ Accuracy = \frac{TP+TN}{TP+TN+FP+FN} = \frac{3+4}{10} = \mathbf{0.70}\ (70\%)
\]

\[
Classification\ Error = \frac{FP+FN}{total} = \frac{1+2}{10} = \mathbf{0.30}\ (30\%)
\]

\[
Precision = \frac{TP}{TP+FP} = \frac{3}{3+1} = \mathbf{0.75}
\]

\[
Recall = Sensitivity = \frac{TP}{TP+FN} = \frac{3}{3+2} = \mathbf{0.60}
\]

\[
Specificity = \frac{TN}{TN+FP} = \frac{4}{4+1} = \mathbf{0.80}
\]

\[
False\ Positive\ Rate = \frac{FP}{FP+TN} = \frac{1}{1+4} = \mathbf{0.20}
\]

| Metric | Value |
|--------|------:|
| **TP** | **3** |
| **FP** | **1** |
| **TN** | **4** |
| **FN** | **2** |
| **Accuracy / Classification Accuracy** | **0.70** |
| **Classification Error** | **0.30** |
| **Precision** | **0.75** |
| **Recall** | **0.60** |
| **Sensitivity** | **0.60** |
| **Specificity** | **0.80** |
| **False Positive Rate** | **0.20** |

---

## III — Lowering the Threshold to Increase Sensitivity

Given (default threshold = **0.5**):

```
Probabilities        = [0.45896027, 0.17065156, 0.49889026, 0.51341541, 0.39678612, 0.67189438]
Predicted_Response   = [0, 0, 0, 1, 0, 1]
```

To **increase sensitivity**, decrease the classification threshold.  
Chosen new threshold: **0.3** (predict class 1 if probability ≥ 0.3).

| Probability | Default (≥ 0.5) | New (≥ 0.3) |
|------------:|:---------------:|:-----------:|
| 0.45896027 | 0 | **1** |
| 0.17065156 | 0 | **0** |
| 0.49889026 | 0 | **1** |
| 0.51341541 | 1 | **1** |
| 0.39678612 | 0 | **1** |
| 0.67189438 | 1 | **1** |

### New predicted responses

```
New_Predicted_Response = [1, 0, 1, 1, 1, 1]
```

**Explanation:** Lowering the threshold from 0.5 to 0.3 makes the classifier predict the positive (disease) class more often. That increases true positives → higher sensitivity, at the cost of more false positives → lower specificity.

---

## Bonus — Confusion Matrix from Lab 7 Practical (n = 192)

From the diabetes logistic regression confusion matrix:

| | Predicted: 0 | Predicted: 1 |
|--|-------------:|-------------:|
| **Actual: 0** | TN = 118 | FP = 12 |
| **Actual: 1** | FN = 47 | TP = 15 |

| Metric | Formula | Value |
|--------|---------|------:|
| Classification Accuracy | (TP+TN)/n | **0.6927** |
| Classification Error | (FP+FN)/n | **0.3073** |
| Sensitivity / Recall | TP/(TP+FN) | **0.2419** |
| Specificity | TN/(TN+FP) | **0.9077** |
| False Positive Rate | FP/(FP+TN) | **0.0923** |
| Precision | TP/(TP+FP) | **0.5556** |

---

## K-Fold Cross-Validation (Lab concept)

In **5-fold cross-validation**, the data are split into 5 equal parts. For each of 5 iterations, one fold is held out as the **test** set (~20%) and the other four folds are used for **training** (~80%). Every observation is used for testing exactly once. The final performance is the average of the 5 test scores — a more stable estimate of out-of-sample performance than a single train/test split.
