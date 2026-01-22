"""PayPal Integration E2E Tests"""
import pytest
import requests
import os
from tests.base_test import BaseTest
from tests.config import CONFIG


@pytest.mark.e2e
@pytest.mark.integration
class TestPayPalIntegration(BaseTest):
    """PayPal integration tests"""
    
    @pytest.mark.api
    def test_paypal_api_credentials_valid(self):
        """Test PayPal API credentials are configured"""
        self.log_step(1, "Check PayPal credentials")
        
        client_id = os.getenv("PAYPAL_CLIENT_ID")
        secret = os.getenv("PAYPAL_SECRET")
        
        assert client_id, "PAYPAL_CLIENT_ID should be configured"
        assert secret, "PAYPAL_SECRET should be configured"
        
        self.log_success("PayPal credentials are configured")
    
    def test_checkout_page_has_paypal_script(self):
        """Test checkout page has PayPal SDK script"""
        self.log_step(1, "Navigate to checkout page")
        self.checkout_page.navigate_to_checkout()
        
        self.log_step(2, "Check page source for PayPal SDK")
        page_source = self.base_page.get_page_source()
        
        assert "paypal" in page_source.lower(), "PayPal SDK should be loaded"
        
        self.log_success("PayPal SDK is loaded on checkout page")
    
    def test_paypal_payment_method_selection(self):
        """Test PayPal payment method can be selected"""
        self.log_step(1, "Navigate to checkout page")
        self.checkout_page.navigate_to_checkout()
        
        self.log_step(2, "Select PayPal payment method")
        result = self.checkout_page.select_paypal_payment()
        assert result, "PayPal payment method should be selectable"
        
        self.log_success("PayPal payment method selected successfully")
    
    def test_paypal_button_appears_after_selection(self):
        """Test PayPal button appears after payment method selection"""
        self.log_step(1, "Navigate to checkout page")
        self.checkout_page.navigate_to_checkout()
        
        self.log_step(2, "Select PayPal payment method")
        self.checkout_page.select_paypal_payment()
        
        self.log_step(3, "Verify PayPal button container is visible")
        is_visible = self.checkout_page.is_paypal_button_visible()
        assert is_visible, "PayPal button container should be visible"
        
        self.log_success("PayPal button appears after payment method selection")
    
    @pytest.mark.smoke
    def test_complete_paypal_checkout_flow(self):
        """Test complete PayPal checkout flow"""
        from tests.fixtures.test_data import get_valid_address
        
        address = get_valid_address()
        
        self.log_step(1, "Navigate to checkout page")
        self.checkout_page.navigate_to_checkout()
        
        self.log_step(2, "Fill address form")
        result = self.checkout_page.fill_address_form(
            first_name=address["first_name"],
            last_name=address["last_name"],
            email=address["email"],
            phone=address["phone"],
            address=address["address"],
            city=address["city"],
            country=address["country"],
            postal_code=address["postal_code"],
        )
        assert result, "Address form should be filled"
        
        self.log_step(3, "Click Next button")
        self.checkout_page.click_next_button()
        self.wait(1)
        
        self.log_step(4, "Select PayPal payment method")
        self.checkout_page.select_paypal_payment()
        
        self.log_step(5, "Verify PayPal button is visible")
        is_visible = self.checkout_page.is_paypal_button_visible()
        assert is_visible, "PayPal button should be visible"
        
        self.log_success("Complete PayPal checkout flow successful")
        
        # Take success screenshot
        self.take_screenshot("paypal_checkout_complete")
