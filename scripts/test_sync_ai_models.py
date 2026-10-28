"""Offline regression tests: python3 -B -m unittest discover -s scripts -p 'test_*.py'."""

import copy
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location("ai_sync", Path(__file__).with_name("sync-ai-models.py"))
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


def model_raw(**overrides):
    raw = {
        "slug": "test-model", "name": "Test Model", "contextWindowTokens": 1_000_000,
        "creator": {"name": "Test Provider"}, "intelligenceIndex": 50,
        "price1mInputTokens": 4, "price1mOutputTokens": 20,
        "terminalBench40": 0.5, "frontierCode20": 0.4,
        "terminalBenchScience": 0.6, "critptAgenticHard": 0.7,
        "hleDiamond": 0.8, "omniscienceAccuracy": 0.6,
        "omniscienceHallucinationRate": 0.25,
        "briefcaseBreakdown": {"overall": {"elo": 1500}},
        "automationBenchPartialScore": 0.7, "gdpPdfAllPass": 0.3,
        "gdpval": 1400, "scicode": 0.9,
    }
    raw.update(overrides)
    return raw


class CategoryTests(unittest.TestCase):
    def test_v5_weights(self):
        model = sync.clean_model(model_raw())
        self.assertAlmostEqual(model["codingIndex"], 44)
        self.assertAlmostEqual(model["knowledgeWorkIndex"], 50)
        self.assertAlmostEqual(model["scienceIndex"], 64)
        self.assertAlmostEqual(model["generalIndex"], 71)

    def test_each_required_component_is_required(self):
        dependencies = {
            "codingIndex": ["frontierCode20", "terminalBench40"],
            "knowledgeWorkIndex": ["briefcaseBreakdown", "automationBenchPartialScore", "gdpPdfAllPass"],
            "scienceIndex": ["terminalBenchScience", "critptAgenticHard"],
            "generalIndex": ["omniscienceAccuracy", "omniscienceHallucinationRate", "hleDiamond"],
        }
        for category, keys in dependencies.items():
            for key in keys:
                with self.subTest(category=category, component=key):
                    self.assertIsNone(sync.clean_model(model_raw(**{key: None}))[category])

    def test_zero_is_not_missing(self):
        model = sync.clean_model(model_raw(frontierCode20=0, terminalBench40=0,
                                          terminalBenchScience=0, critptAgenticHard=0,
                                          omniscienceAccuracy=0, omniscienceHallucinationRate=0,
                                          hleDiamond=0))
        self.assertEqual(model["codingIndex"], 0)
        self.assertEqual(model["scienceIndex"], 0)
        self.assertEqual(model["generalIndex"], 20)  # 100% non-hallucination

    def test_briefcase_normalization_is_clamped(self):
        for elo, expected in ((0, 20), (3500, 80)):
            with self.subTest(elo=elo):
                model = sync.clean_model(model_raw(briefcaseBreakdown={"overall": {"elo": elo}}))
                self.assertAlmostEqual(model["knowledgeWorkIndex"], expected)

    def test_no_legacy_fallback_for_v5(self):
        model = sync.clean_model(model_raw(frontierCode20=None, frontierCode=0.99, codingIndex=99,
                                          terminalBenchScience=None, hleDiamond=None,
                                          critptAgenticHard=None, hle=0.9, critpt=0.9))
        self.assertIsNone(model["codingIndex"])
        self.assertIsNone(model["scienceIndex"])
        self.assertIsNone(model["generalIndex"])
        self.assertEqual(model["hle"], 0.9)
        self.assertIsNotNone(model["agenticIndex"])

    def test_snake_case_aliases(self):
        raw = model_raw()
        for camel, snake in (("terminalBench40", "terminalbench_v4_0"),
                             ("frontierCode20", "frontier_code_2_0"),
                             ("hleDiamond", "hle_diamond"),
                             ("critptAgenticHard", "critpt_agentic_hard"),
                             ("terminalBenchScience", "terminal_bench_science"),
                             ("omniscienceAccuracy", "omniscience_accuracy"),
                             ("omniscienceHallucinationRate", "omniscience_hallucination_rate")):
            raw[snake] = raw.pop(camel)
        model = sync.clean_model(raw)
        self.assertAlmostEqual(model["codingIndex"], 44)
        self.assertAlmostEqual(model["scienceIndex"], 64)
        self.assertAlmostEqual(model["generalIndex"], 71)

    def test_null_intelligence_and_costs_stay_null(self):
        model = sync.clean_model(model_raw(intelligenceIndex=None, intelligenceIndexCost=None,
                                          intelligenceIndexCostPerTask=None))
        self.assertIsNone(model["intelligenceIndex"])
        self.assertIsNone(model["costToRunIndex"])
        self.assertIsNone(model["costPerTask"])

    def test_cost_per_task_is_source_weighted_value(self):
        model = sync.clean_model(model_raw(intelligenceIndexCost={"total": 9999},
                                          intelligenceIndexCostPerTask={"cost": {"total": 1.25}}))
        self.assertEqual(model["costToRunIndex"], 9999)
        self.assertEqual(model["costPerTask"], 1.25)


class ExtractionTests(unittest.TestCase):
    def test_initial_models_skip_summary_and_references(self):
        raw = model_raw()
        summary = {"slug": raw["slug"], "name": "Summary", "intelligenceIndex": 99}
        text = json.dumps({"initialModels": ["$reference", summary, raw]})
        self.assertEqual(sync._extract_from_initial_models(text, raw["slug"]), raw)

    def test_ref_only_array_uses_current_model(self):
        raw = model_raw(intelligenceIndex=None)
        text = json.dumps({"initialModels": ["$reference"], "currentModel": raw})
        self.assertIsNone(sync._extract_from_initial_models(text, raw["slug"]))
        self.assertEqual(sync._extract_model_legacy(text, raw["slug"]), raw)

    def test_large_payload_and_later_array(self):
        raw = model_raw(padding="x" * 510_000)
        text = json.dumps({"initialModels": ["$reference"]}) + '\n' + json.dumps({"initialModels": [raw]})
        self.assertEqual(sync._extract_from_initial_models(text, raw["slug"]), raw)

    def test_wrong_model_and_nested_summaries_rejected(self):
        raw = model_raw(release={"slug": "other-model", "intelligenceIndex": 12})
        text = json.dumps({"currentModel": raw})
        self.assertIsNone(sync._extract_model_legacy(text, "other-model"))

    def test_version_and_evaluation_suite_checks(self):
        raw = model_raw(intelligenceIndexEvaluations=[{"slug": s} for s in sync.V5_EVALUATIONS])
        sync.validate_source_model(raw, raw["slug"], "Intelligence Index v5.0")
        with self.assertRaises(ValueError):
            sync.validate_source_model(raw, raw["slug"], "Intelligence Index v4.3.2")
        raw["intelligenceIndexEvaluations"] = [{"slug": "hle"}]
        with self.assertRaises(ValueError):
            sync.validate_source_model(raw, raw["slug"], "Intelligence Index v5.0")
        raw["intelligenceIndexEvaluations"] = []
        sync.validate_source_model(raw, raw["slug"], "Intelligence Index v5.0")


class Code2VideoTests(unittest.TestCase):
    def row(self):
        return {
            "slug": "test-model", "code2videoElo": 1500,
            "code2videoBreakdown": {"lower95ci": 1475, "upper95ci": 1525},
            "canonicalEvalTokenCounts": {"code2video": {
                "input": 1_000_000, "answer": 1_000_000, "reasoning": 2_000_000,
                "cacheableInput": None,
            }},
            "price1mInputTokens": 4, "price1mOutputTokens": 20,
        }

    def test_benchmark_specific_costs(self):
        total, per_task = sync.code2video_costs(self.row())
        self.assertEqual(total, 64)
        self.assertAlmostEqual(per_task, 64 / 114)

    def test_missing_cost_inputs_and_unknown_cache_stay_null(self):
        for key in ("input", "answer", "reasoning"):
            row = self.row()
            row["canonicalEvalTokenCounts"]["code2video"][key] = None
            self.assertEqual(sync.code2video_costs(row), (None, None))
        row = self.row()
        row["canonicalEvalTokenCounts"]["code2video"]["cacheableInput"] = 100
        self.assertEqual(sync.code2video_costs(row), (None, None))
        row = self.row()
        row["price1mOutputTokens"] = None
        self.assertEqual(sync.code2video_costs(row), (None, None))

    def test_invalid_counts_rejected_and_real_zero_kept(self):
        row = self.row()
        row["canonicalEvalTokenCounts"]["code2video"]["input"] = -1
        with self.assertRaises(ValueError):
            sync.code2video_costs(row)
        row = self.row()
        row["price1mInputTokens"] = row["price1mOutputTokens"] = 0
        self.assertEqual(sync.code2video_costs(row), (0, 0))

    def test_exact_effort_join_and_no_index_cost_substitution(self):
        model = sync.clean_model(model_raw())
        variant = sync.clean_model(model_raw(slug="test-model-high"))
        sync.enrich_code2video([model, variant], {"test-model": self.row()})
        self.assertEqual(model["code2videoElo"], 1500)
        self.assertEqual(model["code2videoEloInterval"], {"lower": 1475, "upper": 1525})
        self.assertEqual(model["code2videoCostToRun"], 64)
        self.assertIsNone(variant["code2videoElo"])
        self.assertIsNone(variant["code2videoCostPerTask"])
        self.assertIsNone(model["costPerTask"])

    def test_sources_must_agree(self):
        model = sync.clean_model(model_raw(code2videoElo=1400))
        with self.assertRaises(ValueError):
            sync.enrich_code2video([model], {"test-model": self.row()})
        with self.assertRaises(ValueError):
            sync.enrich_code2video([model], {})

    def test_evaluation_parser(self):
        text = json.dumps({"initialModels": [self.row()]})
        self.assertEqual(sync.extract_code2video_models(text), {"test-model": self.row()})
        with self.assertRaises(ValueError):
            sync.extract_code2video_models(json.dumps({"initialModels": [self.row(), self.row()]}))


class ValidationTests(unittest.TestCase):
    def models(self):
        return sync.compute_ranks([sync.clean_model(model_raw(slug=f"model-{i}",
            intelligenceIndex=None if i == 4 else 50-i)) for i in range(5)])

    def test_all_targets_required_but_not_all_need_scores(self):
        models = self.models()
        url = "https://example.test/?models=" + ",".join(m["id"] for m in models)
        with patch.object(sync, "TARGET_URL", url):
            self.assertEqual(sync.validate_models(models), (True, ""))
            self.assertFalse(sync.validate_models(models[:-1])[0])
            bad = copy.deepcopy(models)
            bad[0]["scienceIndex"] = float("nan")
            self.assertFalse(sync.validate_models(bad)[0])

    def test_unranked_models_have_no_stale_rank(self):
        models = [{"id": "old", "intelligenceIndex": None, "intelligenceRank": 1},
                  {"id": "zero", "intelligenceIndex": 0}]
        ranked = sync.compute_ranks(models)
        self.assertEqual(ranked[0]["id"], "zero")
        self.assertEqual(ranked[0]["intelligenceRank"], 1)
        self.assertNotIn("intelligenceRank", ranked[1])

    def test_invalid_refresh_does_not_write(self):
        models = sync.compute_ranks([sync.clean_model(model_raw(slug=f"model-{i}")) for i in range(10)])
        with patch.object(sync, "fetch_and_clean", return_value=models), \
                patch.object(sync, "TARGET_URL", "https://example.test/?models=" + ",".join(f"model-{i}" for i in range(11))), \
                patch.object(sync, "log"), \
                patch.object(sync, "write_output") as write:
            self.assertEqual(sync.main(), 1)
            write.assert_not_called()


if __name__ == "__main__":
    unittest.main()
