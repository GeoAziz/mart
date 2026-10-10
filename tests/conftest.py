"""Shared fixtures for the ZilaCart test suite."""

import os

import pytest
from requests import Session


@pytest.fixture
def base_url() -> str:
    """Base URL of the running ZilaCart server (defaults to the local dev server)."""
    return os.environ.get("BASE_URL", "http://localhost:3000").rstrip("/")


@pytest.fixture
def authenticated_session(base_url: str) -> Session:
    """A requests session that sends a Firebase ID token on every request.

    The token is read from the TEST_AUTH_TOKEN env var; when absent the
    session is returned unauthenticated so tests remain runnable locally.
    """
    session = Session()
    token = os.environ.get("TEST_AUTH_TOKEN")
    if token:
        session.headers["Authorization"] = f"Bearer {token}"
    return session
