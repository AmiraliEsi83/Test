# Lab 7 — Model Evaluation Metrics

**Student:** Amir Ali Eslami  
**Student Number:** 501200510  
**Course:** CCPS 844 — Data Mining

## Contents

| File | Description |
|------|-------------|
| `Lab7_Quiz_Answers.md` | Full quiz solutions with formulas (Parts I–III) |
| `Lab7_Quiz_Answers.txt` | Plain-text quiz answers for easy copy/paste |
| `Lab7_Model_Evaluation.ipynb` | Executed notebook: quiz + Advertising + Pima diabetes practical |
| `data/Advertising.csv` | Advertising dataset (regression metrics) |
| `data/pima-indians-diabetes.csv` | Pima Indians Diabetes dataset (classification metrics) |

## Quiz quick answers

### I — HPI regression
- **MAE = 41.7273**
- **MSE = 1973.1818**
- **RMSE = 44.4205**

### II — M/W classification (M = positive)
- **TP=3, FP=1, TN=4, FN=2**
- **Accuracy = 0.70**, **Classification Error = 0.30**
- **Precision = 0.75**, **Recall/Sensitivity = 0.60**
- **Specificity = 0.80**, **FPR = 0.20**

### III — Threshold for higher sensitivity
- New threshold **0.3**
- **New_Predicted_Response = [1, 0, 1, 1, 1, 1]**

## Run the notebook

```bash
pip install scikit-learn pandas numpy matplotlib jupyter
cd lab7
jupyter notebook Lab7_Model_Evaluation.ipynb
```
