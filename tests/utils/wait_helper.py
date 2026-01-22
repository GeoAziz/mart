"""Wait strategies and helpers"""
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webelement import WebElement
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from typing import Optional, Callable, Any
import time


class WaitHelper:
    """Enhanced wait utilities with custom conditions"""
    
    @staticmethod
    def wait_for_element_visible(
        driver,
        locator: tuple,
        timeout: int = 20,
        poll_frequency: float = 0.5
    ) -> Optional[WebElement]:
        """Wait for element to be visible"""
        try:
            wait = WebDriverWait(driver, timeout, poll_frequency=poll_frequency)
            element = wait.until(EC.visibility_of_element_located(locator))
            return element
        except TimeoutException:
            return None
    
    @staticmethod
    def wait_for_element_present(
        driver,
        locator: tuple,
        timeout: int = 20,
        poll_frequency: float = 0.5
    ) -> Optional[WebElement]:
        """Wait for element to be present in DOM"""
        try:
            wait = WebDriverWait(driver, timeout, poll_frequency=poll_frequency)
            element = wait.until(EC.presence_of_element_located(locator))
            return element
        except TimeoutException:
            return None
    
    @staticmethod
    def wait_for_element_clickable(
        driver,
        locator: tuple,
        timeout: int = 20,
        poll_frequency: float = 0.5
    ) -> Optional[WebElement]:
        """Wait for element to be clickable"""
        try:
            wait = WebDriverWait(driver, timeout, poll_frequency=poll_frequency)
            element = wait.until(EC.element_to_be_clickable(locator))
            return element
        except TimeoutException:
            return None
    
    @staticmethod
    def wait_for_elements_visible(
        driver,
        locator: tuple,
        timeout: int = 20,
        poll_frequency: float = 0.5
    ) -> list:
        """Wait for multiple elements to be visible"""
        try:
            wait = WebDriverWait(driver, timeout, poll_frequency=poll_frequency)
            elements = wait.until(EC.visibility_of_all_elements_located(locator))
            return elements
        except TimeoutException:
            return []
    
    @staticmethod
    def wait_for_url_contains(
        driver,
        url_fragment: str,
        timeout: int = 20,
        poll_frequency: float = 0.5
    ) -> bool:
        """Wait for URL to contain specific fragment"""
        try:
            wait = WebDriverWait(driver, timeout, poll_frequency=poll_frequency)
            wait.until(EC.url_contains(url_fragment))
            return True
        except TimeoutException:
            return False
    
    @staticmethod
    def wait_for_url_to_be(
        driver,
        url: str,
        timeout: int = 20,
        poll_frequency: float = 0.5
    ) -> bool:
        """Wait for URL to be exactly as specified"""
        try:
            wait = WebDriverWait(driver, timeout, poll_frequency=poll_frequency)
            wait.until(EC.url_to_be(url))
            return True
        except TimeoutException:
            return False
    
    @staticmethod
    def wait_for_element_invisible(
        driver,
        locator: tuple,
        timeout: int = 20,
        poll_frequency: float = 0.5
    ) -> bool:
        """Wait for element to become invisible"""
        try:
            wait = WebDriverWait(driver, timeout, poll_frequency=poll_frequency)
            wait.until(EC.invisibility_of_element_located(locator))
            return True
        except TimeoutException:
            return False
    
    @staticmethod
    def wait_for_condition(
        driver,
        condition: Callable,
        timeout: int = 20,
        poll_frequency: float = 0.5
    ) -> bool:
        """Wait for custom condition"""
        try:
            wait = WebDriverWait(driver, timeout, poll_frequency=poll_frequency)
            wait.until(condition)
            return True
        except TimeoutException:
            return False
    
    @staticmethod
    def wait_for_text_in_element(
        driver,
        locator: tuple,
        text: str,
        timeout: int = 20,
        poll_frequency: float = 0.5
    ) -> bool:
        """Wait for element to contain specific text"""
        try:
            wait = WebDriverWait(driver, timeout, poll_frequency=poll_frequency)
            wait.until(EC.text_to_be_present_in_element(locator, text))
            return True
        except TimeoutException:
            return False
    
    @staticmethod
    def wait_and_get_text(
        driver,
        locator: tuple,
        timeout: int = 20
    ) -> Optional[str]:
        """Wait for element and get its text"""
        element = WaitHelper.wait_for_element_visible(driver, locator, timeout)
        return element.text if element else None
    
    @staticmethod
    def safe_wait(driver, timeout: float = 1):
        """Safe implicit wait"""
        time.sleep(timeout)
