"""Test Configuration Management"""
import os
from dataclasses import dataclass
from typing import Optional
from enum import Enum


class Browser(Enum):
    CHROME = "chrome"
    FIREFOX = "firefox"
    EDGE = "edge"


@dataclass
class TestConfig:
    """Centralized test configuration"""
    
    # URLs
    base_url: str = os.getenv("BASE_URL", "http://localhost:3000")
    api_base_url: str = os.getenv("API_BASE_URL", "http://localhost:3000/api")
    
    # Browser settings
    browser: Browser = Browser.CHROME
    headless: bool = os.getenv("HEADLESS", "false").lower() == "true"
    window_width: int = 1920
    window_height: int = 1080
    implicit_wait: int = 10
    explicit_wait: int = 20
    
    # PayPal credentials
    paypal_email: str = os.getenv("PAYPAL_EMAIL", "sb-t5anz42281618@personal.example.com")
    paypal_password: str = os.getenv("PAYPAL_PASSWORD", "87C;nFe_")
    paypal_client_id: str = os.getenv("PAYPAL_CLIENT_ID", "")
    paypal_secret: str = os.getenv("PAYPAL_SECRET", "")
    
    # Test credentials
    test_email: str = os.getenv("TEST_EMAIL", "test@example.com")
    test_password: str = os.getenv("TEST_PASSWORD", "Test@12345")
    
    # Paths
    project_root: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    screenshots_dir: str = os.path.join(project_root, "tests/reports/screenshots")
    logs_dir: str = os.path.join(project_root, "tests/reports/logs")
    
    # Timeouts
    page_load_timeout: int = 30
    element_timeout: int = 20
    api_timeout: int = 10
    
    # Test behavior
    take_screenshots_on_failure: bool = True
    keep_browser_open_on_failure: bool = False
    retry_failed_tests: int = 1
    
    # API
    request_timeout: int = 10
    max_retries: int = 3
    
    @classmethod
    def get_config(cls) -> "TestConfig":
        """Get or create singleton config"""
        if not hasattr(cls, "_instance"):
            cls._instance = cls()
            os.makedirs(cls._instance.screenshots_dir, exist_ok=True)
            os.makedirs(cls._instance.logs_dir, exist_ok=True)
        return cls._instance


# Singleton instance
CONFIG = TestConfig.get_config()
