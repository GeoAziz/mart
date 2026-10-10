sed -i 's/alt={item.name}/alt={item.name || "Product Image"}/g' src/app/admin/orders/\[orderId\]/page.tsx
sed -i 's/alt={request.productName}/alt={request.productName || "Product Image"}/g' src/app/admin/refunds/page.tsx
sed -i 's/alt={product.name}/alt={product.name || "Product Image"}/g' src/app/admin/products/page.tsx
