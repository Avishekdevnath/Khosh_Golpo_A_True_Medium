import pytest
from app.services.jobs import make_slug


def test_basic_slug():
    assert make_slug("Senior Backend Engineer", "Nexora Labs") == "senior-backend-engineer-nexora-labs"


def test_strips_special_chars():
    assert make_slug("C++ / Rust Engineer!", "Foo & Bar Inc.") == "c-rust-engineer-foo-bar-inc"


def test_collapses_hyphens():
    assert make_slug("  ML  Engineer  ", "  DataPulse AI  ") == "ml-engineer-datapulse-ai"


def test_max_length():
    result = make_slug("A" * 200, "Co")
    assert len(result) <= 100


def test_non_ascii():
    assert make_slug("Développeur Fullstack", "Société") == "developpeur-fullstack-societe"
