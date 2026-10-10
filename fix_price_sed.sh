sed -i 's/item\.price\.toLocaleString()/(item.price || 0).toLocaleString()/g' src/app/admin/orders/\[orderId\]/page.tsx
sed -i 's/(item\.price \* item\.quantity)\.toLocaleString()/((item.price || 0) * (item.quantity || 1)).toLocaleString()/g' src/app/admin/orders/\[orderId\]/page.tsx
sed -i 's/order\.subtotal\.toLocaleString/(order.subtotal || 0).toLocaleString/g' src/app/admin/orders/\[orderId\]/page.tsx
sed -i 's/order\.shippingCost\.toLocaleString/(order.shippingCost || 0).toLocaleString/g' src/app/admin/orders/\[orderId\]/page.tsx
sed -i 's/order\.taxAmount\.toLocaleString/(order.taxAmount || 0).toLocaleString/g' src/app/admin/orders/\[orderId\]/page.tsx
sed -i 's/order\.totalAmount\.toLocaleString/(order.totalAmount || 0).toLocaleString/g' src/app/admin/orders/\[orderId\]/page.tsx
