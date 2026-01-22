"""Product Details Page E2E Tests"""
import pytest
from tests.base_test import BaseTest
from tests.fixtures.test_products import get_product


@pytest.mark.e2e
class TestProductDetailsPage(BaseTest):
    """Product Details Page tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_product = get_product("laptop")
    
    def test_pdp_page_loads(self):
        """Test PDP loads successfully"""
        self.log_step(1, "Navigate to product page")
        self.product_details_page.navigate_to_product(self.test_product["id"])
        
        self.log_step(2, "Verify product title is visible")
        assert self.product_details_page.is_element_visible(
            self.product_details_page.PRODUCT_TITLE
        ), "Product title should be visible"
        
        self.log_success("PDP loaded successfully")
    
    def test_product_info_displayed(self):
        """Test product information is displayed"""
        self.log_step(1, "Navigate to product page")
        self.product_details_page.navigate_to_product(self.test_product["id"])
        
        self.log_step(2, "Get product title")
        title = self.product_details_page.get_product_title()
        assert title, "Product title should be displayed"
        
        self.log_step(3, "Get product price")
        price = self.product_details_page.get_product_price()
        assert price, "Product price should be displayed"
        
        self.log_success(f"Product info displayed - {title} at {price}")
    
    @pytest.mark.smoke
    def test_add_to_cart_button_visible(self):
        """Test Add to Cart button is visible"""
        self.log_step(1, "Navigate to product page")
        self.product_details_page.navigate_to_product(self.test_product["id"])
        
        self.log_step(2, "Verify Add to Cart button is visible")
        assert self.product_details_page.is_add_to_cart_visible(), \
            "Add to Cart button should be visible"
        
        self.log_success("Add to Cart button is visible")
    
    def test_wishlist_button_visible(self):
        """Test Wishlist button is visible"""
        self.log_step(1, "Navigate to product page")
        self.product_details_page.navigate_to_product(self.test_product["id"])
        
        self.log_step(2, "Verify Wishlist button is visible")
        assert self.product_details_page.is_wishlist_button_visible(), \
            "Wishlist button should be visible"
        
        self.log_success("Wishlist button is visible")
    
    def test_quantity_controls_work(self):
        """Test quantity controls"""
        self.log_step(1, "Navigate to product page")
        self.product_details_page.navigate_to_product(self.test_product["id"])
        
        self.log_step(2, "Set quantity to 5")
        result = self.product_details_page.set_quantity(5)
        assert result, "Quantity should be set"
        
        self.log_success("Quantity controls work")
    
    def test_add_to_cart_action(self):
        """Test adding product to cart"""
        self.log_step(1, "Navigate to product page")
        self.product_details_page.navigate_to_product(self.test_product["id"])
        
        self.log_step(2, "Set quantity")
        self.product_details_page.set_quantity(2)
        
        self.log_step(3, "Click Add to Cart")
        result = self.product_details_page.click_add_to_cart()
        assert result, "Add to Cart should be clicked"
        
        self.log_success("Product added to cart")
    
    def test_product_stock_status(self):
        """Test product stock status"""
        self.log_step(1, "Navigate to product page")
        self.product_details_page.navigate_to_product(self.test_product["id"])
        
        self.log_step(2, "Check stock status")
        in_stock = self.product_details_page.is_in_stock()
        
        self.log_success(f"Product in stock: {in_stock}")
    
    def test_reviews_section_visible(self):
        """Test reviews section is visible"""
        self.log_step(1, "Navigate to product page")
        self.product_details_page.navigate_to_product(self.test_product["id"])
        
        self.log_step(2, "Scroll to reviews section")
        self.product_details_page.scroll_to_reviews()
        
        self.log_step(3, "Verify reviews section is visible")
        assert self.product_details_page.is_element_visible(
            self.product_details_page.REVIEWS_SECTION,
            timeout=5
        ), "Reviews section should be visible"
        
        self.log_success("Reviews section is visible")
    
    @pytest.mark.regression
    def test_pdp_responsive_buttons(self):
        """Test PDP buttons are responsive"""
        self.log_step(1, "Navigate to product page")
        self.product_details_page.navigate_to_product(self.test_product["id"])
        
        self.log_step(2, "Verify all action buttons are visible")
        assert self.product_details_page.is_add_to_cart_visible(), "Add to Cart button missing"
        assert self.product_details_page.is_wishlist_button_visible(), "Wishlist button missing"
        
        self.log_success("All PDP buttons are visible and responsive")
