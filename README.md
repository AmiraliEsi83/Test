# CCPS 844 Data Mining Project

**Author:** Amir Ali Eslami  
**Student Number:** 501200510

Classification and regression analysis project for CCPS 844 Data Mining course.

## Project Overview

This project applies classification and regression algorithms to two UCI Machine Learning Repository datasets:

| Task | Dataset | Target |
|------|---------|--------|
| **Classification** | Heart Disease (Cleveland) | Predict heart disease presence |
| **Regression** | Auto MPG | Predict fuel efficiency (miles per gallon) |

## Files

- `CCPS844_Data_Mining_Project.ipynb` – Main Jupyter notebook (all 12 required steps)
- `data/heart_disease.csv` – Heart disease classification dataset
- `data/auto_mpg.csv` – Auto MPG regression dataset
- `requirements.txt` – Python dependencies

## Setup & Run

```bash
pip install -r requirements.txt
jupyter notebook CCPS844_Data_Mining_Project.ipynb
```

## Notebook Structure

The notebook covers all 12 mandatory project steps:

1. Table of contents with hyperlinks
2. Dataset selection
3. Problem statement
4. Independent & dependent variables
5. Algorithms used
6. Data type checking & conversion
7. Data visualization (matplotlib, seaborn, plotly)
8. Clustering (K-Means, Hierarchical)
9. Feature selection (correlation, mutual information, RFE)
10. Scaling, PCA dimensionality reduction
11. Train/test split & algorithm comparison (3 scenarios)
12. Conclusions

## Submission

Export the notebook to HTML (`File → Download as → HTML`) and convert to PDF for submission along with the `.ipynb` file and `data/` folder.
