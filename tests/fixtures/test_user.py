"""Test user fixtures"""

TEST_USERS = {
    "standard_user": {
        "email": "test.user@example.com",
        "password": "Test@123456",
        "first_name": "Test",
        "last_name": "User",
    },
    "paypal_user": {
        "email": "sb-t5anz42281618@personal.example.com",
        "password": "87C;nFe_",
        "first_name": "PayPal",
        "last_name": "Tester",
    },
    "vendor_user": {
        "email": "vendor@example.com",
        "password": "Vendor@123456",
        "first_name": "Vendor",
        "last_name": "Test",
    },
}


def get_user(user_type: str = "standard_user") -> dict:
    """Get user fixture by type"""
    return TEST_USERS.get(user_type, TEST_USERS["standard_user"])
