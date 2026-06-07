'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApiClient } from '@/hooks/useApiClient';
import type { VerificationStatus } from '@/types';

export function useSellerVerification() {
  const { logout, user } = useAuth();
  const client = useApiClient();
  const [status, setStatus] = useState<VerificationStatus>('UNSUBMITTED');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [isLoadingVerification, setIsLoadingVerification] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setIsLoadingVerification(true);
      try {
        const data = await client.seller.getVerificationStatus();
        if (!cancelled) {
          setStatus(data.status);
          setRejectionReason(data.rejectionReason ?? null);
        }
      } catch {
        if (!cancelled) setStatus('UNSUBMITTED');
      } finally {
        if (!cancelled) setIsLoadingVerification(false);
      }
    })();
    return () => { cancelled = true; };
  }, [client]);

  const handleUpload = useCallback(async (file: File) => {
    const data = await client.seller.uploadVerificationDocument(file);
    setStatus(data.status);
    setRejectionReason(data.rejectionReason ?? null);
    showToast('Document uploaded successfully!', 'success');
  }, [client, showToast]);

  const handleRetry = useCallback(() => {
    setStatus('UNSUBMITTED');
    setRejectionReason(null);
  }, []);

  return {
    user,
    status,
    rejectionReason,
    isLoadingVerification,
    toast,
    handleUpload,
    handleRetry,
    logout,
  };
}
