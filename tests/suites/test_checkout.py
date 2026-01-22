"""Checkout Flow E2E Tests"""
import pytest
from tests.base_test import BaseTest
from tests.fixtures.test_data import get_valid_address


@pytest.mark.e2e
class TestCheckoutFlow(BaseTest):
    """Checkout flow end-to-end tests"""
    
    def test_checkout_page_loads(self):
        """Test checkout page loads successfully"""
        self.log_step(1, "Navigate to checkout page")
        self.checkout_page.navigate_to_checkout()
        
        self.log_step(2, "Verify checkout page is loaded")
        assert self.checkout_page.assert_checkout_page_loaded(), "Checkout page should load"
        
        self.log_success("Checkout page loaded successfully")
    
    def test_fill_address_form(self):
        """Test filling out address form"""
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
        assert result, "Address form should be filled successfully"
        
        self.log_success("Address form filled successfully")
    
    def test_select_payment_method(self):
        """Test selecting payment method"""
        self.log_step(1, "Navigate to checkout page")
        self.checkout_page.navigate_to_checkout()
        
        self.log_step(2, "Select PayPal payment method")
        result = self.checkout_page.select_paypal_payment()
        assert result, "PayPal payment method should be selected"
        
        self.log_success("PayPal payment method selected")
    
    def test_paypal_button_visibility(self):
        """Test PayPal button is visible when payment method selected"""
        self.log_step(1, "Navigate to checkout page")
        self.checkout_page.navigate_to_checkout()
        
        self.log_step(2, "Select PayPal payment method")
        self.checkout_page.select_paypal_payment()
        
        self.log_step(3, "Verify PayPal button is visible")
        assert self.checkout_page.is_paypal_button_visible(), "PayPal button should be visible"
        
        self.log_success("PayPal button is visible")
    
    def test_complete_checkout_form(self):
        """Test completing entire checkout form"""
        address = get_valid_address()
        
        self.log_step(1, "Navigate to checkout page")
        self.checkout_page.navigate_to_checkout()
        
        self.log_step(2, "Fill address form")
        assert self.checkout_page.fill_address_form(
            first_name=address["first_name"],
            last_name=address["last_name"],
            email=address["email"],
            phone=address["phone"],
            address=address["address"],
            city=address["city"],
            country=address["country"],
            postal_code=address["postal_code"],
        ), "Address form should be filled"
        
        self.log_step(3, "Select PayPal payment method")
        assert self.checkout_page.select_paypal_payment(), "PayPal should be selected"
        
        self.log_step(4, "Verify PayPal button is visible")
        assert self.checkout_page.is_paypal_button_visible(), "PayPal button should be visible"
        
        self.log_success("Complete checkout form verified")
    
    @pytest.mark.smoke
    def test_checkout_cart_items_display(self):
        """Test cart items are displayed on checkout page"""
        self.log_step(1, "Navigate to checkout page")
        self.checkout_page.navigate_to_checkout()
        
        self.log_step(2, "Get cart items count")
        items_count = self.checkout_page.get_cart_items_count()
        
        self.log_step(3, "Verify items are displayed")
        assert items_count > 0, "Cart should have items"
        
        self.log_success(f"Found {items_count} items in cart")
