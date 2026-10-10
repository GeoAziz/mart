"""Master test suite for the ZilaCart application.

Markers:
- ``smoke``       — app is up and responding.
- ``e2e``         — key pages and API surfaces load.
- ``integration`` — API contracts (response shape) against a running backend.
"""

import pytest
import requests


@pytest.mark.smoke
def test_api_health(base_url):
    """Smoke: the health endpoint responds with HTTP 200."""
    response = requests.get(f"{base_url}/api/health", timeout=15)
    assert response.status_code == 200


@pytest.mark.smoke
def test_homepage_loads(base_url):
    """Smoke: the homepage is reachable."""
    response = requests.get(f"{base_url}/", timeout=15)
    assert response.status_code == 200


@pytest.mark.e2e
def test_products_page_loads(base_url):
    """E2E: the products listing page is reachable."""
    response = requests.get(f"{base_url}/products", timeout=15)
    assert response.status_code == 200


@pytest.mark.e2e
def test_search_page(base_url):
    """E2E: the search API responds (503 is acceptable when Algolia is not configured)."""
    response = requests.get(f"{base_url}/api/search?q=test", timeout=15)
    assert response.status_code in (200, 503)


@pytest.mark.e2e
def test_cart_page(base_url):
    """E2E: the cart page is reachable."""
    response = requests.get(f"{base_url}/cart", timeout=15)
    assert response.status_code == 200


@pytest.mark.integration
def test_api_products_list(base_url, authenticated_session):
    """Integration: GET /api/products returns JSON containing a 'products' key."""
    response = authenticated_session.get(f"{base_url}/api/products", timeout=15)
    assert response.status_code == 200
    body = response.json()
    assert "products" in body


@pytest.mark.integration
def test_api_health_response_format(base_url):
    """Integration: GET /api/health returns JSON containing a 'status' key."""
    response = requests.get(f"{base_url}/api/health", timeout=15)
    assert response.status_code == 200
    body = response.json()
    assert "status" in body
