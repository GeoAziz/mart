'use client';

interface RecentSalesProps {
  products: {
    name: string;
    sales: number;
  }[];
}

export default function RecentSales({ products }: RecentSalesProps) {
  return (
    <div className="space-y-8">
      {products.map((product) => (
        <div key={product.name} className="flex items-center">
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{product.name}</p>
            <p className="text-sm text-muted-foreground">
              {product.sales} sales
            </p>
          </div>
          <div className="ml-auto font-medium">
            +{(product.sales * 1000).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
