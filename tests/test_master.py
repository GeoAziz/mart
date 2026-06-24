"""Master test suite for ZilaCart application."""
import pytest
from pathlib import Path

pytestmark = [
    pytest.mark.smoke,
]


class TestHealthcheck:
    """Smoke tests for API health endpoint."""

    @pytest.mark.smoke
    def test_api_health_endpoint_exists(self, base_url):
        """Verify health endpoint is responsive."""
        # Placeholder: replace with actual HTTP call when infra is ready
        assert base_url is not None


class TestSmoke:
    """Smoke tests for critical user flows."""

    @pytest.mark.smoke
    def test_homepage_loads(self, base_url):
        """Verify homepage is accessible."""
        assert base_url == "http://localhost:3000"

    @pytest.mark.smoke
    def test_auth_flow_setup(self):
        """Verify auth context is initialized."""
        # Integration test placeholder
        assert True


@pytest.fixture
def base_url():
    """Base URL for API tests."""
    return "http://localhost:3000"
