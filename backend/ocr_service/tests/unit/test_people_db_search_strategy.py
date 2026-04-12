from src.core.people_db_client import (
    classify_people_search_query,
    normalize_phone_query,
    resolve_quality_thresholds,
)


def test_classify_people_search_query_detects_tw_id():
    result = classify_people_search_query("A123456789")
    assert result["intent"] == "id_number"
    assert result["normalized"] == "A123456789"


def test_classify_people_search_query_detects_phone_number():
    result = classify_people_search_query("02-2785-1310")
    assert result["intent"] == "phone"
    assert result["normalized"] == "0227851310"


def test_classify_people_search_query_defaults_to_full_text():
    result = classify_people_search_query("重陽路 504 巷")
    assert result["intent"] == "full_text"
    assert result["normalized"] == "重陽路 504 巷"


def test_normalize_phone_query_removes_non_digits():
    assert normalize_phone_query("(02) 2785-1310") == "0227851310"


def test_resolve_quality_thresholds_supports_named_bands():
    assert resolve_quality_thresholds("high") == (0.8, None)
    assert resolve_quality_thresholds("medium") == (0.5, 0.8)
    assert resolve_quality_thresholds("low") == (None, 0.5)
