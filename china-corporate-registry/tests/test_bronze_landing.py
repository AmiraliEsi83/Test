import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from china_registry.identifiers import lei_is_valid, uscc_is_valid
from china_registry.landing import land_batch
from china_registry.project import is_china_registry_record, legal_form_name_for, project_record
from china_registry.validate import load_schema, validate_batch

PACIFIC_LEI = "8368008HPTBGMFR3OV25"
PACIFIC_USCC = "9132058172520705XD"


def pacific_resource() -> dict:
    return {
        "type": "lei-records",
        "id": PACIFIC_LEI,
        "attributes": {
            "lei": PACIFIC_LEI,
            "entity": {
                "legalName": {"name": "太平洋纺织机械（常熟）有限公司", "language": "zh"},
                "otherNames": [
                    {
                        "name": "PACIFIC TEXTILE MACHINERY (CHANGSHU) CO.,LTD.",
                        "language": "en",
                        "type": "ALTERNATIVE_LANGUAGE_LEGAL_NAME",
                    }
                ],
                "transliteratedOtherNames": [
                    {"name": "tai ping yang fang zhi ji xie chang shou you xian gong si", "type": "AUTO_ASCII_TRANSLITERATED_LEGAL_NAME"}
                ],
                "legalAddress": {
                    "language": "zh",
                    "addressLines": ["常熟市阳光大道8号"],
                    "city": "苏州市",
                    "region": "CN-JS",
                    "country": "CN",
                    "postalCode": "215500",
                },
                "headquartersAddress": {
                    "language": "zh",
                    "addressLines": ["常熟市阳光大道8号"],
                    "city": "苏州市",
                    "region": "CN-JS",
                    "country": "CN",
                    "postalCode": "215500",
                },
                "registeredAt": {"id": "RA000092", "other": None},
                "registeredAs": PACIFIC_USCC,
                "jurisdiction": "CN",
                "category": "GENERAL",
                "legalForm": {"id": "ECAK", "other": None},
                "status": "ACTIVE",
                "creationDate": "2001-01-20T16:00:00Z",
                "expiration": {"date": None, "reason": None},
            },
            "registration": {
                "initialRegistrationDate": "2026-09-23T01:08:45Z",
                "lastUpdateDate": "2026-09-23T01:08:45Z",
                "status": "ISSUED",
                "nextRenewalDate": "2027-09-23T01:01:57Z",
                "managingLou": "655600IJ8LS3CCDA4421",
                "corroborationLevel": "FULLY_CORROBORATED",
                "validatedAt": {"id": "RA000092", "other": None},
                "validatedAs": PACIFIC_USCC,
            },
            "conformityFlag": "NON_CONFORMING",
        },
    }


def fund_resource() -> dict:
    resource = pacific_resource()
    resource["id"] = "2549004F5T7A756DDK09"
    resource["attributes"]["lei"] = "2549004F5T7A756DDK09"
    resource["attributes"]["entity"]["registeredAt"] = {"id": "RA888888", "other": "SBHT48"}
    resource["attributes"]["entity"]["registeredAs"] = None
    resource["attributes"]["registration"]["validatedAt"] = {"id": "RA888888", "other": "SBHT48"}
    resource["attributes"]["registration"]["validatedAs"] = None
    return resource


class IdentifierTests(unittest.TestCase):
    def test_known_uscc_and_lei(self) -> None:
        self.assertTrue(uscc_is_valid(PACIFIC_USCC))
        self.assertTrue(lei_is_valid(PACIFIC_LEI))
        self.assertFalse(uscc_is_valid(PACIFIC_USCC[:-1] + "A"))
        self.assertFalse(lei_is_valid(PACIFIC_LEI[:-1] + "0"))


class SchemaTests(unittest.TestCase):
    def test_three_datasets_are_declared(self) -> None:
        schema = load_schema()
        self.assertEqual(schema["feeder"]["version"], 2)
        self.assertEqual(schema["feeder"]["layer"], "bronze")
        self.assertEqual(schema["feeder"]["registry"]["id"], "RA000092")
        self.assertEqual(
            schema["feeder"]["landing"]["datasets"],
            ["entities", "registrations", "addresses"],
        )
        check = next(
            field for field in schema["datasets"]["registrations"]["fields"] if field["name"] == "registration_number_check"
        )
        self.assertEqual(check["values"], [True])


class LandingTests(unittest.TestCase):
    def test_registry_filter_and_three_dataset_landing(self) -> None:
        kept = pacific_resource()
        dropped = fund_resource()
        self.assertTrue(is_china_registry_record(kept))
        self.assertFalse(is_china_registry_record(dropped))

        projected = project_record(
            kept,
            legal_form_name="企业",
            retrieved_at="2026-09-27T15:30:00Z",
            batch_id="20260927T153000Z",
        )
        self.assertEqual(projected["entity"]["legal_name"], "太平洋纺织机械（常熟）有限公司")
        self.assertEqual(projected["entity"]["english_name"], "PACIFIC TEXTILE MACHINERY (CHANGSHU) CO.,LTD.")
        self.assertEqual(projected["registration"]["registration_number"], PACIFIC_USCC)
        self.assertEqual(projected["registration"]["registration_authority_id"], "RA000092")
        self.assertEqual(
            {row["address_role"] for row in projected["addresses"]},
            {"legal", "headquarters"},
        )
        other_form = {"legalForm": {"id": "8888", "other": "有限责任公司(外国法人独资)"}}
        self.assertEqual(legal_form_name_for(other_form, None), "有限责任公司(外国法人独资)")

        batch_dir = Path(self.id().replace(".", "_"))
        root = Path(__file__).resolve().parents[1] / "data" / "test-batches" / batch_dir
        result = land_batch(
            batch_dir=root,
            batch_id="20260927T153000Z",
            retrieved_at="2026-09-27T15:30:00Z",
            raw_resources=[kept, dropped],
            projected=[projected],
            pages_fetched=1,
            watermark="2026-09-23",
        )
        report = validate_batch(result.batch_dir)
        self.assertTrue(report.ok, report.text())
        self.assertEqual(report.counts, {"entities": 1, "registrations": 1, "addresses": 2})

        raw_lines = (root / "raw_lei_records.jsonl").read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(raw_lines), 2)
        self.assertEqual(json.loads((root / "manifest.json").read_text(encoding="utf-8"))["kept_records"], 1)

    def test_missing_dataset_fails_validation(self) -> None:
        projected = project_record(
            pacific_resource(),
            legal_form_name="企业",
            retrieved_at="2026-09-27T15:30:00Z",
            batch_id="20260927T153000Z",
        )
        root = Path(__file__).resolve().parents[1] / "data" / "test-batches" / "missing-addresses"
        land_batch(
            batch_dir=root,
            batch_id="20260927T153000Z",
            retrieved_at="2026-09-27T15:30:00Z",
            raw_resources=[pacific_resource()],
            projected=[projected],
            pages_fetched=1,
            watermark="2026-09-23",
        )
        (root / "addresses.jsonl").unlink()
        report = validate_batch(root)
        self.assertFalse(report.ok)
        self.assertTrue(any("addresses.jsonl is missing" in error for error in report.errors))


if __name__ == "__main__":
    unittest.main()
