"""Screenshot management"""
import os
from datetime import datetime
from typing import Optional


class ScreenshotManager:
    """Handle screenshot capture and organization"""
    
    @staticmethod
    def take_screenshot(
        driver,
        screenshots_dir: str,
        name: str = "screenshot"
    ) -> Optional[str]:
        """Take screenshot and return file path"""
        try:
            os.makedirs(screenshots_dir, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{name}_{timestamp}.png"
            filepath = os.path.join(screenshots_dir, filename)
            driver.save_screenshot(filepath)
            return filepath
        except Exception as e:
            print(f"Failed to take screenshot: {e}")
            return None
    
    @staticmethod
    def take_screenshot_on_failure(
        driver,
        screenshots_dir: str,
        test_name: str
    ) -> Optional[str]:
        """Take screenshot on test failure"""
        return ScreenshotManager.take_screenshot(
            driver,
            screenshots_dir,
            f"failure_{test_name}"
        )
    
    @staticmethod
    def take_screenshot_on_success(
        driver,
        screenshots_dir: str,
        test_name: str
    ) -> Optional[str]:
        """Take screenshot on test success"""
        return ScreenshotManager.take_screenshot(
            driver,
            screenshots_dir,
            f"success_{test_name}"
        )
    
    @staticmethod
    def take_element_screenshot(
        driver,
        element,
        screenshots_dir: str,
        name: str = "element"
    ) -> Optional[str]:
        """Take screenshot of specific element"""
        try:
            os.makedirs(screenshots_dir, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{name}_{timestamp}.png"
            filepath = os.path.join(screenshots_dir, filename)
            element.screenshot(filepath)
            return filepath
        except Exception as e:
            print(f"Failed to take element screenshot: {e}")
            return None
