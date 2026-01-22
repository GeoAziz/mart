"""Test data fixtures"""

TEST_DATA = {
    "addresses": {
        "valid": {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "phone": "+1234567890",
            "address": "123 Main St",
            "city": "Nairobi",
            "country": "Kenya",
            "postal_code": "00100",
        },
        "invalid": {
            "first_name": "",
            "last_name": "",
            "email": "invalid-email",
            "phone": "123",
            "address": "",
            "city": "",
            "country": "",
            "postal_code": "",
        },
    },
    "payment": {
        "card": {
            "number": "4111111111111111",
            "expiry": "12/25",
            "cvv": "123",
        }
    },
}


def get_valid_address() -> dict:
    """Get valid address data"""
    return TEST_DATA["addresses"]["valid"]


def get_invalid_address() -> dict:
    """Get invalid address data"""
    return TEST_DATA["addresses"]["invalid"]
