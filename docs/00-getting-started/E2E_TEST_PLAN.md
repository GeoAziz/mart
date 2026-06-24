# Product Details Page - Comprehensive E2E Test Plan

## Overview
This document outlines the complete end-to-end (E2E) test strategy for the Product Details Page (PDP), focusing on all interactive elements and user flows.

---

## Page Structure & Components

### 1. **Product Information Section** (Left Column)
- Product name and description
- Star rating with review count
- Price display (KSh format)
- Stock status badge (In Stock / Low Stock / Out of Stock)
- Category badge

### 2. **Product Image Gallery** (Left Column)
- Primary product image with zoom on hover
- Image modal dialog with full-size view
- Image navigation arrows (previous/next)
- Zoom icon overlay

### 3. **Purchase Controls Section** (Right Column) ⭐ PRIMARY FOCUS
- **Quantity Input**
  - Display current quantity
  - Minus (-) button to decrease
  - Plus (+) button to increase
  - Direct text input field
  - Min value: 1
  - Max value: product stock
  - Validation: only numeric input allowed

- **Stock Warning Alert** (Conditional)
  - Appears when quantity > stock
  - Red destructive styling
  - AlertCircle icon
  - Clear message with available stock

- **Add to Cart Button** ⭐ KEY ELEMENT
  - Flex layout with icon + text
  - ShoppingCart icon (h-6 w-6)
  - Text: "Add to Cart" / "Adding..." / "Out of Stock"
  - Primary blue color (#5555FF)
  - Hover: darker blue shade
  - Disabled states:
    - When isAddingToCart = true
    - When isCartSaving = true
    - When product.stock <= 0
  - Loading spinner when adding
  - Adds item with specified quantity

- **Wishlist (Heart) Button** ⭐ KEY ELEMENT
  - Circular button (h-12 w-12)
  - Heart icon from lucide-react
  - Two states:
    - **Not in wishlist**: border outline, hollow heart
    - **In wishlist**: filled background, filled heart
  - Disabled when isAddingToWishlist = true
  - Loading spinner during action
  - Toggles between add/remove

- **Buy Now Button**
  - Full width
  - Secondary styling (border + hover background)
  - Disabled when product out of stock

- **Security Info Card**
  - ShieldCheck icon + "Secure Transaction & Buyer Protection"
  - Truck icon + "Estimated Delivery: 2-3 business days"

### 4. **Tabs Section** (Below Purchase Controls)
- **Description Tab**
  - Full product description
  - Specifications table with 5 rows
- **Reviews Tab**
  - Review count display
  - Review filter buttons (All, Verified, Highest, Lowest)
  - Rating distribution bars
  - Individual review cards
  - Add Review button
- **Shipping & Seller Tab**
  - Seller credibility info
  - Return policy
  - Contact seller button

### 5. **Mobile Sticky Bar** (Bottom)
- Fixed position on mobile only
- Price display
- Quantity controls
- Add to Cart button (compact with icon)

### 6. **Share Button & Dialog**
- Share2 icon button in header
- Dialog with 4 share options:
  - Copy link
  - Facebook share
  - Twitter share
  - Email share

---

## E2E Test Scenarios

## TEST SUITE 1: Add to Cart Button Behavior

### TEST 1.1: Add to Cart - Basic Flow
**Precondition**: User logged in, product in stock
**Steps**:
1. Navigate to product page
2. Verify "Add to Cart" button is visible and enabled
3. Verify ShoppingCart icon is rendered
4. Click "Add to Cart" button
5. Observe loading spinner appears
6. Button text changes to "Adding..."
7. Wait for spinner to disappear
8. Button returns to normal state
9. Toast notification appears: "Item Added"
**Expected Result**: Item successfully added to cart

### TEST 1.2: Add to Cart - Multiple Quantities
**Precondition**: User logged in, product has 10+ stock
**Steps**:
1. Navigate to product page
2. Increase quantity to 3 using "+" button
3. Verify quantity input shows "3"
4. Click "Add to Cart"
5. Observe loading state
6. Wait for completion
7. Toast shows: "Item Added"
**Expected Result**: Correct quantity (3) added to cart

### TEST 1.3: Add to Cart - Out of Stock
**Precondition**: Product has stock = 0
**Steps**:
1. Navigate to product page
2. Verify stock badge shows "Out of Stock"
3. Verify "Add to Cart" button is disabled (grayed out)
4. Verify button text shows "Out of Stock"
5. Attempt to click button (should not be clickable)
**Expected Result**: Button is disabled and unreactive

### TEST 1.4: Add to Cart - Low Stock Warning
**Precondition**: Product has stock = 3, quantity set to 4
**Steps**:
1. Navigate to product page
2. Stock badge shows "Low Stock (3)"
3. Increase quantity to 4 using "+" button
4. Verify stock warning card appears (red, destructive styling)
5. Warning text: "Only 3 items available. Please adjust your quantity."
6. Verify "Add to Cart" button is still visible
7. Click "Add to Cart" (should be enabled)
**Expected Result**: Warning displays, button still allows adding (user chose quantity)

### TEST 1.5: Add to Cart - Not Logged In
**Precondition**: User logged out
**Steps**:
1. Navigate to product page as guest
2. Click "Add to Cart" button
3. Observe error toast: "Login Required"
4. Toast message: "Please log in to add items to your cart."
**Expected Result**: User is prompted to login, not added to cart

### TEST 1.6: Add to Cart - Button Loading State
**Precondition**: User logged in, slow network
**Steps**:
1. Navigate to product page
2. Click "Add to Cart"
3. Immediately observe:
   - Button text becomes "Adding..."
   - Loader2 spinner visible (animated)
   - Button remains disabled
   - Cannot click again
4. Wait for completion
5. Button returns to normal
**Expected Result**: Loading state properly displayed and prevents duplicate clicks

### TEST 1.7: Add to Cart - Quantity Input Validation
**Precondition**: Product stock = 5
**Steps**:
1. Click quantity input field
2. Try to type "abc" → should be rejected (only numeric)
3. Try to type "-5" → should be rejected (only positive)
4. Try to type "0" → should be clamped to 1
5. Try to type "10" → should be clamped to 5 (stock)
6. Type "5" → should accept
7. Type "999" → should clamp to 5
**Expected Result**: Input validates correctly, respects min/max bounds

### TEST 1.8: Add to Cart - Quantity +/- Buttons
**Precondition**: Stock = 5, quantity = 1
**Steps**:
1. Verify quantity = 1
2. Click "-" button 5 times → quantity stays at 1 (cannot go below)
3. Click "+" button once → quantity = 2
4. Click "+" button 5 times → quantity = 5 (clamped to stock)
5. Click "+" button again → quantity stays at 5 (cannot exceed stock)
**Expected Result**: Buttons enforce min=1 and max=stock

---

## TEST SUITE 2: Wishlist (Heart) Button Behavior

### TEST 2.1: Wishlist - Add to Wishlist (Not Logged In)
**Precondition**: User logged out
**Steps**:
1. Navigate to product page
2. Observe heart button (outline state, hollow)
3. Click heart button
4. Toast: "Login Required" - "Please log in to add items to your wishlist."
**Expected Result**: User prompted to login, item not added to wishlist

### TEST 2.2: Wishlist - Add to Wishlist (Logged In)
**Precondition**: User logged in, item not in wishlist
**Steps**:
1. Navigate to product page
2. Observe heart button in outline state (border-2 border-accent/50)
3. Heart icon is hollow (not filled)
4. Click heart button
5. Observe loading spinner on button
6. Button is disabled during loading
7. After loading, observe:
   - Heart button now has filled background (accent color)
   - Heart icon is now filled (fill-current)
   - Toast: "Added to Wishlist" - "Item added to your wishlist."
8. Button is enabled and clickable again
**Expected Result**: Button state changes to filled, wishlist updated

### TEST 2.3: Wishlist - Remove from Wishlist
**Precondition**: User logged in, item already in wishlist
**Steps**:
1. Navigate to product page
2. Observe heart button in filled state (bg-accent)
3. Heart icon is filled
4. Click heart button
5. Observe loading spinner
6. After loading, observe:
   - Heart button returns to outline state (border outline)
   - Heart icon is hollow again
   - Toast: "Removed from Wishlist" - "Item removed from your wishlist."
**Expected Result**: Button state reverts, wishlist updated

### TEST 2.4: Wishlist - Toggle Multiple Times
**Precondition**: User logged in
**Steps**:
1. Click heart → Add (observe state change + spinner)
2. Wait for completion
3. Click heart → Remove (observe state change + spinner)
4. Wait for completion
5. Click heart → Add again
**Expected Result**: Toggle works seamlessly, states change correctly each time

### TEST 2.5: Wishlist - Loading State Prevents Double-Click
**Precondition**: User logged in, slow network
**Steps**:
1. Click heart button (Add to wishlist)
2. Button is disabled and shows spinner
3. Try to click again immediately → should not react
4. Wait for loading to finish
5. Button becomes enabled
6. Click again → should work
**Expected Result**: Double-click protection working via disabled state

### TEST 2.6: Wishlist - Error Handling
**Precondition**: API returns error
**Steps**:
1. Click heart button
2. If API fails, observe:
   - Toast: "Failed" - with error message
   - Button returns to previous state (doesn't change)
   - User can retry
**Expected Result**: Error handled gracefully

### TEST 2.7: Wishlist - Aria Labels & Accessibility
**Precondition**: Any state
**Steps**:
1. Inspect heart button element
2. Verify aria-label present:
   - When not in wishlist: "Add to wishlist"
   - When in wishlist: "Remove from Wishlist"
3. Verify title attribute matches
4. Test keyboard navigation (Tab to button)
5. Press Space/Enter to activate button
**Expected Result**: Accessibility features working

---

## TEST SUITE 3: Button Layout & Styling

### TEST 3.1: Button Layout - Desktop View
**Precondition**: Desktop screen size (1024px+)
**Steps**:
1. Navigate to product page
2. Verify "Add to Cart" and Heart button are on same row
3. "Add to Cart" is flex-1 (takes most space)
4. Heart button is circular (h-12 w-12)
5. Gap-3 spacing between buttons
6. Both buttons have proper height (h-12)
7. Verify icons are properly sized:
   - Cart icon: h-6 w-6
   - Heart icon: h-6 w-6
**Expected Result**: Layout is correct and responsive

### TEST 3.2: Button Layout - Mobile View
**Precondition**: Mobile screen size (<768px)
**Steps**:
1. Navigate to product page on mobile
2. Verify buttons layout (should stack or compress)
3. Verify both buttons are still clickable
4. Verify sticky mobile bar appears at bottom:
   - Contains price
   - Contains quantity controls
   - Contains compact "Add to Cart" button
5. Scroll down and up, verify sticky bar behavior
**Expected Result**: Mobile layout works, sticky bar functional

### TEST 3.3: Button Colors & Hover States
**Precondition**: Desktop view, not loading
**Steps**:
1. Verify "Add to Cart" button:
   - Background: primary blue (#5555FF)
   - Text: white (primary-foreground)
   - Hover: darker blue (primary/90)
   - Shadow on hover: glow effect
2. Verify Heart button (not in wishlist):
   - Border: 2px accent border
   - Text/Icon: accent color
   - Hover: light accent background (accent/10)
3. Verify Heart button (in wishlist):
   - Background: accent color (orange)
   - Text/Icon: white (accent-foreground)
   - Hover: darker accent (accent/90)
**Expected Result**: Colors and hover states match design

### TEST 3.4: Button Icons Visibility
**Precondition**: Page loaded, logged in
**Steps**:
1. Inspect "Add to Cart" button
2. Verify ShoppingCart SVG is present:
   - Class includes "lucide lucide-shopping-cart"
   - Size: h-6 w-6
3. Inspect Heart button
4. Verify Heart SVG is present:
   - Class includes "lucide lucide-heart"
   - Size: h-6 w-6
5. When in wishlist, verify fill-current class applied
6. When not in wishlist, verify fill-current NOT applied
**Expected Result**: Icons render correctly with proper styling

---

## TEST SUITE 4: Integration & Edge Cases

### TEST 4.1: Add to Cart then Wishlist
**Precondition**: User logged in, product in stock
**Steps**:
1. Add product to cart
2. Observe toast: "Item Added"
3. Immediately click heart button to add to wishlist
4. Observe both operations succeed
5. Both buttons show correct states
**Expected Result**: Both operations work independently

### TEST 4.2: Different Product Types
**Precondition**: Have products with different properties
**Steps**:
1. Test product with stock > 100 → buttons should work normally
2. Test product with stock = 1 → buttons should work, warning appears if qty > 1
3. Test product with stock = 0 → "Add to Cart" disabled, other buttons work
4. Test product with no description → page still loads correctly
5. Test product with no reviews → review section handles gracefully
**Expected Result**: All product types handled correctly

### TEST 4.3: Quantity Persistence After Add to Cart
**Precondition**: User logged in
**Steps**:
1. Set quantity to 3
2. Click "Add to Cart"
3. Wait for completion
4. Observe quantity display
5. Should either reset to 1 OR stay at 3 (behavior TBD)
6. Verify user can modify again
**Expected Result**: Consistent quantity behavior

### TEST 4.4: Wishlist Status Persistence
**Precondition**: User logged in
**Steps**:
1. Add product to wishlist
2. Navigate away (different product)
3. Navigate back to same product
4. Verify heart button shows filled state (still in wishlist)
**Expected Result**: Wishlist status persists across navigation

### TEST 4.5: Stock Changes
**Precondition**: Product currently in stock
**Steps**:
1. Observe stock status
2. If stock changes (simulated), verify:
   - Badge updates
   - Add to Cart button state updates if stock = 0
   - Warning appears if quantity > new stock
**Expected Result**: Stock changes handled dynamically

### TEST 4.6: API Error Handling
**Precondition**: Network issues possible
**Steps**:
1. Simulate network delay
2. Click "Add to Cart" → observe spinner for extended time
3. Simulate API error (500)
4. Observe toast with error message
5. Button returns to previous state
6. User can retry
**Expected Result**: Error handling is user-friendly

### TEST 4.7: Long Product Names
**Precondition**: Product with very long name
**Steps**:
1. Navigate to page
2. Verify product name displays correctly
3. Verify buttons still visible and functional
4. No layout breaks
**Expected Result**: Layout remains stable

### TEST 4.8: Concurrent Operations
**Precondition**: User logged in
**Steps**:
1. Click "Add to Cart"
2. While loading, try to click "Add to Cart" again → ignored
3. While loading, try to click Heart button → ignored (locked by loading state)
4. Wait for completion
5. Both buttons responsive again
**Expected Result**: Concurrent operations prevented

---

## Automated Test Implementation Plan

### Tools & Setup
- **Selenium WebDriver**: Browser automation
- **Python**: Test scripting
- **pytest**: Test framework
- **webdriver-manager**: ChromeDriver management

### Test File Structure
```
tests/
├── e2e_pdp_test.py          # Main E2E test suite
├── fixtures/
│   ├── test_products.json   # Test product data
│   └── test_users.json      # Test user accounts
└── utils/
    ├── page_objects.py      # PDP page object model
    ├── assertions.py        # Custom assertions
    └── helpers.py           # Utility functions
```

### Execution Strategy
1. **Setup Phase**
   - Login with test account (customer1@zilacart.com)
   - Navigate to known test product
   - Verify page loads

2. **Test Execution** (organized by suite)
   - TEST_SUITE_1: Add to Cart (8 tests)
   - TEST_SUITE_2: Wishlist (7 tests)
   - TEST_SUITE_3: Layout & Styling (4 tests)
   - TEST_SUITE_4: Integration (8 tests)

3. **Cleanup Phase**
   - Clear wishlist items added during test
   - Clear cart items added during test
   - Capture screenshots on failures

### Assertions to Verify
- Button visibility and state
- Icon presence and sizing
- Text content accuracy
- Spinner/loading animation
- Toast notifications
- Color/style attributes
- Disabled state enforcement
- Form input validation
- API response handling

---

## Success Criteria

✅ All 27 test cases pass  
✅ No console errors during tests  
✅ Button states transition correctly  
✅ Icons render with correct sizing  
✅ Loading states prevent duplicate actions  
✅ Error messages display appropriately  
✅ Accessibility features present  
✅ Mobile and desktop layouts work  

---

## Notes for Implementation

1. **Test Data**: Use consistent product ID: `KRmdS9LCeZvURKx6NbvI`
2. **Login**: Use `customer1@zilacart.com` / `password123`
3. **Wait Strategies**: Use explicit waits (10-20s) for API responses
4. **Screenshots**: Capture on every state change for debugging
5. **Logs**: Log button states, API responses, and exceptions
6. **Parallel Testing**: Can run multiple tests in parallel safely
7. **Flakiness**: Account for network delays in assertions

---

## Future Test Enhancements

- Visual regression testing (Percy, Chromatic)
- Performance testing (Page load, button response time)
- Load testing (Multiple users adding to cart simultaneously)
- Accessibility testing (axe-core)
- Mobile device testing (BrowserStack)
- API contract testing (Pact)

