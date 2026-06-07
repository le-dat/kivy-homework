'use client';

import { useSellerProducts } from '@/hooks/useSellerProducts';
import { ProductPanel } from '@/components/seller';

export default function SellerProductsPage() {
  const {
    user,
    products,
    sellerVerified,
    toast,
    handleCreateProduct,
  } = useSellerProducts();

  return (
    <div className="p-8 flex flex-col gap-8 max-w-[1200px] w-full mx-auto">
      {toast && (
        <div
          className={`fixed bottom-8 right-8 p-4 rounded-md font-body text-sm font-medium text-white shadow-lg z-50
            ${toast.type === 'success' ? 'bg-success' : 'bg-danger'}`}
        >
          {toast.message}
        </div>
      )}

      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl text-text">Product Management</h1>
        <span className="font-body text-sm text-text/60">{user?.email}</span>
      </header>

      {!sellerVerified && (
        <div className="bg-warning/10 border border-warning/30 text-amber-950 p-4 rounded-md font-body text-sm flex flex-col gap-1">
          <div className="flex items-center gap-2 font-semibold">
            <span>⚠️</span>
            <span>Your store is not activated yet</span>
          </div>
          <p className="opacity-90">
            Newly added products will be in <strong>&quot;Pending Store Activation&quot;</strong> status and temporarily hidden from the public store until the store profile is successfully approved.
          </p>
        </div>
      )}

      <ProductPanel
        products={products}
        sellerVerified={sellerVerified}
        onCreate={handleCreateProduct}
      />
    </div>
  );
}
