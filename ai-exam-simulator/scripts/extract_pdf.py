#!/usr/bin/env python3
"""Extract page text from docs/question_bank.pdf into data/raw_pdf_text.json."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = ROOT / "docs" / "question_bank.pdf"
OUT_PATH = ROOT / "data" / "raw_pdf_text.json"


def extract_with_pdfplumber() -> list[dict]:
    import pdfplumber

    pages: list[dict] = []
    with pdfplumber.open(PDF_PATH) as pdf:
        for index, page in enumerate(pdf.pages, start=1):
            pages.append(
                {
                    "pageNumber": index,
                    "text": page.extract_text(x_tolerance=1.5, y_tolerance=3) or "",
                }
            )
    return pages


def main() -> None:
    if not PDF_PATH.exists():
        raise FileNotFoundError(f"PDF not found: {PDF_PATH}")
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "source": str(PDF_PATH.relative_to(ROOT)),
        "pageCount": 0,
        "pages": [],
    }
    pages = extract_with_pdfplumber()
    payload["pageCount"] = len(pages)
    payload["pages"] = pages
    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Extracted {len(pages)} pages -> {OUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
