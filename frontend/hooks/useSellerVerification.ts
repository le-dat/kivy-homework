'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApiClient } from '@/hooks/useApiClient';
import type { VerificationStatus } from '@/types';
import type { NotificationRecord } from '@/services/api/kivyClient';

const POLL_INTERVAL = 10000; // 10 seconds

export function useSellerVerification() {
  const { logout, user } = useAuth();
  const client = useApiClient();
  const [status, setStatus] = useState<VerificationStatus>('UNSUBMITTED');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [isLoadingVerification, setIsLoadingVerification] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastStatusRef = useRef<VerificationStatus | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await client.seller.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch {
      // silently fail - notifications are non-critical
    }
  }, [client]);

  const checkStatusAndNotify = useCallback(async () => {
    try {
      const data = await client.seller.getVerificationStatus();
      setStatus(data.status);
      setRejectionReason(data.rejectionReason ?? null);

      // If status changed to a terminal state, show a toast notification
      if (lastStatusRef.current !== null && lastStatusRef.current !== data.status) {
        const terminalStates: VerificationStatus[] = ['VERIFIED', 'APPROVED', 'REJECTED', 'INCONCLUSIVE', 'SYSTEM_ERROR'];
        if (terminalStates.includes(data.status)) {
          showToast(`Verification status updated to ${data.status}`, 'success');
        }
      }
      lastStatusRef.current = data.status;
    } catch {
      // keep current state on error
    }
  }, [client, showToast]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setIsLoadingVerification(true);
      try {
        await checkStatusAndNotify();
        await fetchNotifications();
      } finally {
        if (!cancelled) setIsLoadingVerification(false);
      }
    })();
    return () => { cancelled = true; };
  }, [client, checkStatusAndNotify, fetchNotifications]);

  // Poll for status and notification updates
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      await checkStatusAndNotify();
      await fetchNotifications();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [user, checkStatusAndNotify, fetchNotifications]);

  const handleUpload = useCallback(async (file: File) => {
    const data = await client.seller.uploadVerificationDocument(file);
    setStatus(data.status);
    setRejectionReason(data.rejectionReason ?? null);
    lastStatusRef.current = data.status;
    showToast('Document uploaded successfully!', 'success');
  }, [client, showToast]);

  const handleRetry = useCallback(() => {
    setStatus('UNSUBMITTED');
    setRejectionReason(null);
    lastStatusRef.current = null;
  }, []);

  const markNotificationAsRead = useCallback(async (id: string) => {
    await client.seller.markNotificationAsRead(id);
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, [client]);

  const markAllNotificationsAsRead = useCallback(async () => {
    await client.seller.markAllNotificationsAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [client]);

  return {
    user,
    status,
    rejectionReason,
    isLoadingVerification,
    toast,
    notifications,
    unreadCount,
    handleUpload,
    handleRetry,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    logout,
  };
}
