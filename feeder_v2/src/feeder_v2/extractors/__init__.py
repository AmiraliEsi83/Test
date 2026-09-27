"""Extractor registry."""

from __future__ import annotations

from typing import Any, Callable, Iterator, Protocol

from feeder_v2.http import HttpClient

ExtractorFn = Callable[[dict[str, Any], dict[str, Any], HttpClient], Iterator[dict[str, Any]]]


class Extractor(Protocol):
    def __call__(
        self,
        stream: dict[str, Any],
        profile: dict[str, Any],
        client: HttpClient,
    ) -> Iterator[dict[str, Any]]:
        ...


def load_extractors() -> dict[str, ExtractorFn]:
    from feeder_v2.extractors import gleif_cn, hk_cr, wikidata_uscc

    return {
        "gleif_cn": gleif_cn.extract,
        "hk_cr": hk_cr.extract,
        "wikidata_uscc": wikidata_uscc.extract,
    }
