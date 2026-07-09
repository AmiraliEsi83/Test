#!/usr/bin/env python3
"""Export the CCPS 844 notebook to a clean PDF (no Pandoc/LaTeX required)."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

NOTEBOOK = Path("CCPS844_Data_Mining_Project.ipynb")
HTML_OUT = Path("CCPS844_Data_Mining_Project.html")
PDF_OUT = Path("CCPS844_AmirAliEslami_501200510.pdf")
CSS_FILE = Path("export_style.css")


def fix_notebook_outputs(notebook_path: Path) -> None:
    """Ensure notebook outputs satisfy nbformat validation."""
    with notebook_path.open(encoding="utf-8") as f:
        nb = json.load(f)

    for cell in nb.get("cells", []):
        if cell.get("cell_type") != "code":
            continue
        execution_count = cell.get("execution_count")
        for output in cell.get("outputs", []):
            output_type = output.get("output_type")
            if output_type == "stream" and "name" not in output:
                output["name"] = "stdout"
            if output_type == "execute_result" and "execution_count" not in output:
                output["execution_count"] = execution_count or 1
            if output_type in {"execute_result", "display_data"} and "metadata" not in output:
                output["metadata"] = {}

    with notebook_path.open("w", encoding="utf-8") as f:
        json.dump(nb, f, indent=1)


def export_html(notebook_path: Path, html_path: Path) -> None:
  """Convert notebook to styled HTML."""
  cmd = [
      sys.executable,
      "-m",
      "nbconvert",
      "--to",
      "html",
      str(notebook_path),
      "--output",
      html_path.stem,
      "--no-input",
  ]
  if CSS_FILE.exists():
      cmd.extend(["--CSSHTMLHeaderTransformer.extra_stylesheets", str(CSS_FILE)])

  subprocess.run(cmd, check=True)


def export_pdf_playwright(html_path: Path, pdf_path: Path) -> None:
    from playwright.sync_api import sync_playwright

    html_uri = html_path.resolve().as_uri()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(html_uri, wait_until="networkidle")
        page.pdf(
            path=str(pdf_path),
            format="A4",
            print_background=True,
            margin={"top": "18mm", "right": "15mm", "bottom": "18mm", "left": "15mm"},
        )
        browser.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Export notebook to PDF")
    parser.add_argument("--notebook", type=Path, default=NOTEBOOK)
    parser.add_argument("--html", type=Path, default=HTML_OUT)
    parser.add_argument("--pdf", type=Path, default=PDF_OUT)
    args = parser.parse_args()

    if not args.notebook.exists():
        raise SystemExit(f"Notebook not found: {args.notebook}")

    print("Fixing notebook metadata...")
    fix_notebook_outputs(args.notebook)

    print("Exporting styled HTML...")
    export_html(args.notebook, args.html)

    print("Generating PDF with Playwright...")
    try:
        export_pdf_playwright(args.html, args.pdf)
    except Exception as exc:
        raise SystemExit(
            "\nPDF generation failed.\n"
            "Install dependencies first:\n"
            "  pip install nbconvert playwright\n"
            "  playwright install chromium\n"
            f"\nError: {exc}"
        ) from exc

    print(f"Done!\n  HTML: {args.html}\n  PDF:  {args.pdf}")


if __name__ == "__main__":
    main()
