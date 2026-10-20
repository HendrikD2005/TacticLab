import pytest


@pytest.fixture(autouse=True)
def offline_ai(monkeypatch):
    """A configured developer .env must never make the test suite billable."""
    monkeypatch.setenv("AI_ENABLED", "false")
