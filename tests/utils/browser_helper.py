"""Browser helper utilities"""
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from selenium.webdriver.edge.options import Options as EdgeOptions
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.firefox import GeckoDriverManager
from webdriver_manager.microsoft import EdgeChromiumDriverManager
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.edge.service import Service as EdgeService
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class BrowserHelper:
    """Browser creation and management"""
    
    @staticmethod
    def create_chrome_driver(
        headless: bool = False,
        window_width: int = 1920,
        window_height: int = 1080,
        disable_notifications: bool = True,
        disable_automation: bool = True
    ) -> webdriver.Chrome:
        """Create Chrome WebDriver with best practices"""
        options = ChromeOptions()
        
        if headless:
            options.add_argument("--headless=new")
        
        options.add_argument(f"--window-size={window_width},{window_height}")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        
        if disable_notifications:
            prefs = {"profile.default_content_setting_values.notifications": 2}
            options.add_experimental_option("prefs", prefs)
        
        if disable_automation:
            options.add_argument("--disable-blink-features=AutomationControlled")
            options.add_experimental_option("excludeSwitches", ["enable-automation"])
            options.add_experimental_option("useAutomationExtension", False)
        
        # Use webdriver-manager for automatic driver management
        service = ChromeService(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        
        return driver
    
    @staticmethod
    def create_firefox_driver(
        headless: bool = False,
        window_width: int = 1920,
        window_height: int = 1080
    ) -> webdriver.Firefox:
        """Create Firefox WebDriver"""
        options = FirefoxOptions()
        
        if headless:
            options.add_argument("--headless")
        
        options.add_argument(f"--width={window_width}")
        options.add_argument(f"--height={window_height}")
        
        service = FirefoxService(GeckoDriverManager().install())
        driver = webdriver.Firefox(service=service, options=options)
        
        return driver
    
    @staticmethod
    def create_edge_driver(
        headless: bool = False,
        window_width: int = 1920,
        window_height: int = 1080
    ) -> webdriver.Edge:
        """Create Edge WebDriver"""
        options = EdgeOptions()
        
        if headless:
            options.add_argument("--headless")
        
        options.add_argument(f"--window-size={window_width},{window_height}")
        
        service = EdgeService(EdgeChromiumDriverManager().install())
        driver = webdriver.Edge(service=service, options=options)
        
        return driver
    
    @staticmethod
    def get_driver(
        browser: str = "chrome",
        headless: bool = False,
        window_width: int = 1920,
        window_height: int = 1080
    ) -> Optional[webdriver.Remote]:
        """Factory method to get appropriate driver"""
        try:
            if browser.lower() == "chrome":
                return BrowserHelper.create_chrome_driver(
                    headless=headless,
                    window_width=window_width,
                    window_height=window_height
                )
            elif browser.lower() == "firefox":
                return BrowserHelper.create_firefox_driver(
                    headless=headless,
                    window_width=window_width,
                    window_height=window_height
                )
            elif browser.lower() == "edge":
                return BrowserHelper.create_edge_driver(
                    headless=headless,
                    window_width=window_width,
                    window_height=window_height
                )
            else:
                logger.warning(f"Unsupported browser: {browser}, defaulting to Chrome")
                return BrowserHelper.create_chrome_driver(
                    headless=headless,
                    window_width=window_width,
                    window_height=window_height
                )
        except Exception as e:
            logger.error(f"Failed to create {browser} driver: {e}")
            return None
    
    @staticmethod
    def close_driver(driver):
        """Safely close driver"""
        try:
            if driver:
                driver.quit()
        except Exception as e:
            logger.warning(f"Error closing driver: {e}")
