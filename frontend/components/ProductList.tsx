"use client";

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  isVisible: boolean;
  createdAt: string;
}

interface ProductListProps {
  products: Product[];
  sellerVerified: boolean;
}

export default function ProductList({ products, sellerVerified }: ProductListProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-12 bg-white/4 border border-dashed border-white/10 rounded-md font-body text-sm text-center">
        <span>No products yet.</span>
        <span>Post your first product below.</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
      {products.map((product) => (
        <div
          key={product.id}
          className="bg-black/6 border border-white/10 rounded-md p-4 flex flex-col gap-2 hover:scale-[1.02] transition-transform"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-base leading-tight">{product.name}</h3>
            {sellerVerified ? (
              <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold font-body uppercase tracking-wide bg-success text-white">
                Live
              </span>
            ) : (
              <span className="flex-shrink-0 px-2 py-0.5 text-black rounded-full text-xs font-semibold font-body uppercase tracking-wide bg-white/20">
                Pending Activation
              </span>
            )}
          </div>
          {product.description && (
            <p className="font-body text-xs text-white/50 leading-relaxed line-clamp-2">
              {product.description}
            </p>
          )}
          <div className="mt-auto pt-2 border-t border-white/6">
            <span className="font-body text-base font-semibold text-secondary">
              {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                product.price,
              )}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
