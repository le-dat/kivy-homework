'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApiClient } from '@/hooks/useApiClient';
import type { Product } from '@/types';

export function useSellerProducts() {
  const { logout, user } = useAuth();
  const client = useApiClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [sellerVerified, setSellerVerified] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const statusData = await client.seller.getVerificationStatus();
        const verified = statusData.status === 'VERIFIED' || statusData.status === 'APPROVED';
        if (!cancelled) setSellerVerified(verified);
      } catch {
        if (!cancelled) setSellerVerified(false);
      }
    })();

    void (async () => {
      try {
        const data = await client.seller.getProducts();
        if (!cancelled) setProducts(data);
      } catch {
        if (!cancelled) setProducts([]);
      }
    })();

    return () => { cancelled = true; };
  }, [client]);

  const handleCreateProduct = useCallback(
    async (name: string, description: string, price: number) => {
      const product = await client.seller.createProduct({ name, description, price });
      setProducts((prev) => [product, ...prev]);
      showToast('Product created successfully!', 'success');
    },
    [client, showToast]
  );

  return {
    user,
    products,
    sellerVerified,
    toast,
    handleCreateProduct,
    logout,
  };
}
