sed -i 's/new Date(data.createdAt)/new Date(typeof data.createdAt === "object" \&\& "toDate" in (data.createdAt as any) ? (data.createdAt as any).toDate() : (data.createdAt as any))/g' src/app/admin/orders/\[orderId\]/page.tsx
sed -i 's/new Date(data.updatedAt)/new Date(typeof data.updatedAt === "object" \&\& "toDate" in (data.updatedAt as any) ? (data.updatedAt as any).toDate() : (data.updatedAt as any))/g' src/app/admin/orders/\[orderId\]/page.tsx

sed -i 's/new Date(updatedOrderData.createdAt)/new Date(typeof updatedOrderData.createdAt === "object" \&\& "toDate" in (updatedOrderData.createdAt as any) ? (updatedOrderData.createdAt as any).toDate() : (updatedOrderData.createdAt as any))/g' src/app/admin/orders/\[orderId\]/page.tsx
sed -i 's/new Date(updatedOrderData.updatedAt)/new Date(typeof updatedOrderData.updatedAt === "object" \&\& "toDate" in (updatedOrderData.updatedAt as any) ? (updatedOrderData.updatedAt as any).toDate() : (updatedOrderData.updatedAt as any))/g' src/app/admin/orders/\[orderId\]/page.tsx

sed -i 's/new Date(order.createdAt)/new Date(typeof order.createdAt === "object" \&\& "toDate" in (order.createdAt as any) ? (order.createdAt as any).toDate() : (order.createdAt as any))/g' src/app/admin/orders/\[orderId\]/page.tsx

npx tsc --noEmit | grep 'src/app/admin'
