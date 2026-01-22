"""Test product fixtures"""

TEST_PRODUCTS = {
    "laptop": {
        "id": "1",
        "name": "Premium Laptop",
        "price": 1299.99,
        "category": "Electronics",
        "sku": "LAPTOP-001",
    },
    "phone": {
        "id": "2",
        "name": "Smartphone",
        "price": 799.99,
        "category": "Electronics",
        "sku": "PHONE-001",
    },
    "headphones": {
        "id": "3",
        "name": "Wireless Headphones",
        "price": 199.99,
        "category": "Audio",
        "sku": "HEADPHONES-001",
    },
}


def get_product(product_type: str = "laptop") -> dict:
    """Get product fixture by type"""
    return TEST_PRODUCTS.get(product_type, TEST_PRODUCTS["laptop"])
