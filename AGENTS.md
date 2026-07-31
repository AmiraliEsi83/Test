# AGENTS.md

## Cursor Cloud specific instructions

### Repository layout (important)

`main` is an empty placeholder (`README.md` only). All runnable code lives on separate
feature branches; nothing is merged into `main`. To work on a product, check out its branch
(e.g. `git checkout <branch>`) or add a worktree.

| Branch | Product | Type |
|--------|---------|------|
| `cursor/ccps844-data-mining-project-*` | CCPS 844 Data Mining Project | Jupyter notebook (self-contained) |
| `cursor/lab7-model-evaluation-*` | CCPS 844 Lab 7 — Model Evaluation | Jupyter notebook (self-contained) |
| `cursor/opencorporates-calgary-sync-*` / `cursor/fix-calgary-api-queries-*` | OpenCorporates Calgary sync | Python CLI (needs external API token) |

These are Python-only projects (Python 3.12). There is no build step, no automated test
suite, and no lint config on any branch.

### Dependencies

The update script installs the union of the branches' Python dependencies globally with
`pip install --break-system-packages` (Ubuntu 24.04 is PEP 668 externally-managed). Each
branch's own `requirements.txt` (when present at the repo root) is also installed by the
update script. No venv is used, so `python3` sees everything directly.

Installed versions are newer than the branches' pinned minimums (e.g. pandas 3.x, numpy 2.x,
scikit-learn 1.9) and the notebooks run cleanly against them.

### Gotcha: Jupyter console scripts are not on PATH

`pip --user` installs the `jupyter`/`nbconvert`/`jupyter-lab` launchers into `~/.local/bin`,
which is NOT on `PATH`. Invoke them via the module form instead:

- Run a notebook headless: `python3 -m nbconvert --to notebook --execute --ExecutePreprocessor.timeout=600 --output <out>.ipynb <nb>.ipynb`
- Start Jupyter Lab: `python3 -m jupyter lab --no-browser --ip=0.0.0.0 --port=8888 --ServerApp.token="" --ServerApp.password=""`

### Running each product

- Notebook products (data mining, lab7): data is bundled in `data/`, so they run fully
  offline. Execute end-to-end with the `nbconvert --execute` command above.
- OpenCorporates Calgary sync: run `python3 scripts/fetch_calgary_companies.py --dry-run`
  (validate token) / `--mode full` / `--mode incremental`. It requires the
  `OPENCORPORATES_API_TOKEN` environment variable; without it the script logs an error and
  exits 1. Set it as a secret to run the sync end-to-end.
