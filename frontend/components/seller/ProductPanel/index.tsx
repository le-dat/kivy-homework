'use client';

import { useState } from 'react';
import type { Product } from '@/types';
import ProductList from '@/components/ProductList';
import CreateProductForm from './CreateProductForm';

interface ProductPanelProps {
  products: Product[];
  sellerVerified: boolean;
  onCreate: (name: string, description: string, price: number) => Promise<void>;
}

export default function ProductPanel({
  products,
  sellerVerified,
  onCreate,
}: ProductPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-text">Your Products</h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-secondary text-white rounded-sm font-body text-sm font-semibold hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          + Add Product
        </button>
      </div>

      <ProductList products={products} sellerVerified={sellerVerified} />

      {isModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-primary rounded-md p-6 border border-white/10 w-full max-w-lg shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors text-lg"
              aria-label="Close modal"
            >
              ✕
            </button>
            <CreateProductForm
              onCreate={onCreate}
              onClose={() => setIsModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
