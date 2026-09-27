from pathlib import Path

from feeder_v2.yaml_spec import enabled_streams, load_connector_yaml

CONNECTOR = Path(__file__).resolve().parents[1] / "connectors" / "china_corporate_registry.yaml"


def test_connector_yaml_is_feeder_v2_bronze():
    spec = load_connector_yaml(CONNECTOR)
    assert spec["apiVersion"] == "feeder/v2"
    assert spec["kind"] == "SourceConnector"
    assert spec["metadata"]["layer"] == "bronze"
    assert spec["metadata"]["id"] == "china_corporate_registry"
    assert spec["metadata"]["tickets"] == ["PO-1594", "PO-1693"]


def test_three_enabled_streams_are_not_opencorporates():
    spec = load_connector_yaml(CONNECTOR)
    streams = enabled_streams(spec)
    assert [stream["name"] for stream in streams] == [
        "cn_samr_lei",
        "hk_companies_register",
        "cn_uscc_wikidata",
    ]
    systems = {stream["source"]["system"] for stream in streams}
    assert "opencorporates" not in systems
    assert systems == {"gleif", "hk_companies_registry", "wikidata"}
    rejected = " ".join(spec["spec"]["rejected_sources"]).lower()
    assert "opencorporates" in rejected
