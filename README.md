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

## Export to PDF (recommended)

Jupyter's built-in **Download as PDF** requires Pandoc + LaTeX and often fails. Use the included export script instead — it produces a clean, submission-ready PDF.

```bash
pip install nbconvert playwright
playwright install chromium
python export_to_pdf.py
```

This creates:
- `CCPS844_AmirAliEslami_501200510.pdf` — submit this PDF
- `CCPS844_Data_Mining_Project.html` — styled HTML backup

### Alternative: enable Jupyter PDF export on Mac

If you prefer Jupyter's native PDF export:

```bash
brew install pandoc
brew install --cask basictex
```

Restart Jupyter, then use **File → Download as → PDF**.

## Submission

Submit these files **separately** (do not zip):

1. `CCPS844_AmirAliEslami_501200510.pdf`
2. `CCPS844_Data_Mining_Project.ipynb`
3. `data/heart_disease.csv`
4. `data/auto_mpg.csv`
5. `requirements.txt` (optional)
