"""Checkout Page Object"""
from selenium.webdriver.common.by import By
from .base_page import BasePage


class CheckoutPage(BasePage):
    """Checkout page object"""
    
    # ==================== Locators ====================
    
    # Address form
    FIRST_NAME = (By.NAME, "firstName")
    LAST_NAME = (By.NAME, "lastName")
    EMAIL = (By.NAME, "email")
    PHONE = (By.NAME, "phone")
    ADDRESS = (By.NAME, "address")
    CITY = (By.NAME, "city")
    COUNTRY = (By.NAME, "country")
    POSTAL_CODE = (By.NAME, "postalCode")
    
    # Payment method
    PAYPAL_RADIO = (By.ID, "paypal-method")
    CARD_RADIO = (By.ID, "card-method")
    PAYMENT_METHOD_GROUP = (By.NAME, "paymentMethod")
    
    # PayPal button
    PAYPAL_BUTTON_CONTAINER = (By.ID, "paypal-button-container")
    PAYPAL_BUTTON = (By.XPATH, "//div[@id='paypal-button-container']//button")
    
    # Order summary
    CHECKOUT_HEADING = (By.XPATH, "//h1[contains(text(), 'Checkout')] | //h2[contains(text(), 'Checkout')]")
    CART_ITEMS = (By.XPATH, "//div[contains(@class, 'cart-item')]")
    ORDER_TOTAL = (By.XPATH, "//*[contains(text(), 'Total')]")
    
    # Action buttons
    NEXT_BUTTON = (By.XPATH, "//button[contains(text(), 'Next')]")
    PLACE_ORDER_BUTTON = (By.XPATH, "//button[contains(text(), 'Place Order') or contains(text(), 'Complete Purchase')]")
    SUBMIT_BUTTON = (By.XPATH, "//button[@type='submit']")
    
    # ==================== Navigation ====================
    def navigate_to_checkout(self):
        """Navigate to checkout page"""
        self.navigate_to_page("/checkout")
    
    # ==================== Address Form ====================
    def fill_first_name(self, first_name: str) -> bool:
        """Fill first name"""
        return self.type_text(self.FIRST_NAME, first_name)
    
    def fill_last_name(self, last_name: str) -> bool:
        """Fill last name"""
        return self.type_text(self.LAST_NAME, last_name)
    
    def fill_email(self, email: str) -> bool:
        """Fill email"""
        return self.type_text(self.EMAIL, email)
    
    def fill_phone(self, phone: str) -> bool:
        """Fill phone"""
        return self.type_text(self.PHONE, phone)
    
    def fill_address(self, address: str) -> bool:
        """Fill address"""
        return self.type_text(self.ADDRESS, address)
    
    def fill_city(self, city: str) -> bool:
        """Fill city"""
        return self.type_text(self.CITY, city)
    
    def fill_country(self, country: str) -> bool:
        """Fill country"""
        return self.type_text(self.COUNTRY, country)
    
    def fill_postal_code(self, postal_code: str) -> bool:
        """Fill postal code"""
        return self.type_text(self.POSTAL_CODE, postal_code)
    
    def fill_address_form(
        self,
        first_name: str,
        last_name: str,
        email: str,
        phone: str,
        address: str,
        city: str,
        country: str,
        postal_code: str
    ) -> bool:
        """Fill entire address form"""
        self.logger.info("Filling address form...")
        steps = [
            self.fill_first_name(first_name),
            self.fill_last_name(last_name),
            self.fill_email(email),
            self.fill_phone(phone),
            self.fill_address(address),
            self.fill_city(city),
            self.fill_country(country),
            self.fill_postal_code(postal_code),
        ]
        return all(steps)
    
    # ==================== Payment Method ====================
    def select_paypal_payment(self) -> bool:
        """Select PayPal payment method"""
        self.logger.info("Selecting PayPal payment method...")
        return self.click(self.PAYPAL_RADIO)
    
    def select_card_payment(self) -> bool:
        """Select card payment method"""
        self.logger.info("Selecting card payment method...")
        return self.click(self.CARD_RADIO)
    
    # ==================== PayPal ====================
    def is_paypal_button_visible(self) -> bool:
        """Check if PayPal button is visible"""
        return self.is_element_visible(self.PAYPAL_BUTTON_CONTAINER)
    
    def click_paypal_button(self) -> bool:
        """Click PayPal button"""
        self.logger.info("Clicking PayPal button...")
        return self.click(self.PAYPAL_BUTTON)
    
    # ==================== Actions ====================
    def click_next_button(self) -> bool:
        """Click Next button"""
        self.logger.info("Clicking Next button...")
        return self.click(self.NEXT_BUTTON)
    
    def click_place_order_button(self) -> bool:
        """Click Place Order button"""
        self.logger.info("Clicking Place Order button...")
        return self.click(self.PLACE_ORDER_BUTTON)
    
    def submit_form(self) -> bool:
        """Submit form"""
        self.logger.info("Submitting form...")
        return self.click(self.SUBMIT_BUTTON)
    
    # ==================== Assertions ====================
    def assert_checkout_page_loaded(self) -> bool:
        """Assert checkout page is loaded"""
        self.logger.info("Asserting checkout page is loaded...")
        return self.assert_element_visible(self.CHECKOUT_HEADING)
    
    def get_cart_items_count(self) -> int:
        """Get number of cart items displayed"""
        items = self.wait_for_elements(self.CART_ITEMS)
        return len(items)
