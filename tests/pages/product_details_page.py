"""Product Details Page Object"""
from selenium.webdriver.common.by import By
from .base_page import BasePage


class ProductDetailsPage(BasePage):
    """Product Details Page object"""
    
    # ==================== Locators ====================
    
    # Product info
    PRODUCT_TITLE = (By.XPATH, "//h1 | //h2[contains(@class, 'title')]")
    PRODUCT_PRICE = (By.XPATH, "//*[contains(text(), '$')] | //*[contains(@class, 'price')]")
    PRODUCT_RATING = (By.XPATH, "//*[contains(@class, 'rating')]")
    PRODUCT_DESCRIPTION = (By.XPATH, "//*[contains(@class, 'description')]")
    
    # Action buttons
    ADD_TO_CART_BUTTON = (By.XPATH, "//button[contains(text(), 'Add to Cart') or contains(text(), 'Add To Cart')]")
    WISHLIST_BUTTON = (By.XPATH, "//button[contains(@aria-label, 'wishlist') or contains(@class, 'wishlist')]")
    BUY_NOW_BUTTON = (By.XPATH, "//button[contains(text(), 'Buy Now')]")
    
    # Quantity controls
    QUANTITY_INPUT = (By.XPATH, "//input[@type='number' or contains(@placeholder, 'Quantity')]")
    QUANTITY_INCREASE = (By.XPATH, "//button[contains(text(), '+')]")
    QUANTITY_DECREASE = (By.XPATH, "//button[contains(text(), '-')]")
    
    # Reviews section
    REVIEWS_SECTION = (By.XPATH, "//*[contains(text(), 'Reviews') or contains(@class, 'reviews')]")
    REVIEW_ITEMS = (By.XPATH, "//div[contains(@class, 'review')]")
    RATING_STARS = (By.XPATH, "//*[contains(@class, 'star')]")
    
    # Stock info
    STOCK_INDICATOR = (By.XPATH, "//*[contains(text(), 'Stock') or contains(@class, 'stock')]")
    OUT_OF_STOCK_TEXT = (By.XPATH, "//*[contains(text(), 'Out of Stock')]")
    
    # Tabs
    DETAILS_TAB = (By.XPATH, "//button[contains(text(), 'Details')]")
    REVIEWS_TAB = (By.XPATH, "//button[contains(text(), 'Reviews')]")
    SPECS_TAB = (By.XPATH, "//button[contains(text(), 'Specifications')]")
    
    # ==================== Navigation ====================
    def navigate_to_product(self, product_id: str):
        """Navigate to product details page"""
        self.navigate_to_page(f"/products/{product_id}")
    
    # ==================== Product Info ====================
    def get_product_title(self) -> str:
        """Get product title"""
        return self.get_text(self.PRODUCT_TITLE)
    
    def get_product_price(self) -> str:
        """Get product price"""
        return self.get_text(self.PRODUCT_PRICE)
    
    def get_product_description(self) -> str:
        """Get product description"""
        return self.get_text(self.PRODUCT_DESCRIPTION)
    
    # ==================== Quantity ====================
    def set_quantity(self, quantity: int) -> bool:
        """Set product quantity"""
        self.logger.info(f"Setting quantity to {quantity}...")
        return self.type_text(self.QUANTITY_INPUT, str(quantity))
    
    def increase_quantity(self) -> bool:
        """Increase quantity"""
        self.logger.info("Increasing quantity...")
        return self.click(self.QUANTITY_INCREASE)
    
    def decrease_quantity(self) -> bool:
        """Decrease quantity"""
        self.logger.info("Decreasing quantity...")
        return self.click(self.QUANTITY_DECREASE)
    
    # ==================== Cart & Wishlist ====================
    def is_add_to_cart_visible(self) -> bool:
        """Check if Add to Cart button is visible"""
        return self.is_element_visible(self.ADD_TO_CART_BUTTON)
    
    def click_add_to_cart(self) -> bool:
        """Click Add to Cart button"""
        self.logger.info("Clicking Add to Cart...")
        return self.click(self.ADD_TO_CART_BUTTON)
    
    def is_wishlist_button_visible(self) -> bool:
        """Check if Wishlist button is visible"""
        return self.is_element_visible(self.WISHLIST_BUTTON)
    
    def click_wishlist_button(self) -> bool:
        """Click Wishlist button"""
        self.logger.info("Clicking Wishlist button...")
        return self.click(self.WISHLIST_BUTTON)
    
    def click_buy_now(self) -> bool:
        """Click Buy Now button"""
        self.logger.info("Clicking Buy Now...")
        return self.click(self.BUY_NOW_BUTTON)
    
    # ==================== Stock ====================
    def is_in_stock(self) -> bool:
        """Check if product is in stock"""
        out_of_stock = self.is_element_visible(self.OUT_OF_STOCK_TEXT, timeout=3)
        return not out_of_stock
    
    # ==================== Reviews ====================
    def get_reviews_count(self) -> int:
        """Get number of reviews"""
        reviews = self.wait_for_elements(self.REVIEW_ITEMS)
        return len(reviews)
    
    def scroll_to_reviews(self) -> bool:
        """Scroll to reviews section"""
        return self.scroll_to_element(self.REVIEWS_SECTION)
    
    def click_reviews_tab(self) -> bool:
        """Click reviews tab"""
        self.logger.info("Clicking Reviews tab...")
        return self.click(self.REVIEWS_TAB)
    
    # ==================== Tabs ====================
    def click_details_tab(self) -> bool:
        """Click Details tab"""
        self.logger.info("Clicking Details tab...")
        return self.click(self.DETAILS_TAB)
    
    def click_specs_tab(self) -> bool:
        """Click Specifications tab"""
        self.logger.info("Clicking Specifications tab...")
        return self.click(self.SPECS_TAB)
