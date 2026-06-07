'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from '@/hooks/useApiClient';
import type { AdminMetrics, AdminVerificationRecord } from '@/services/api/kivyClient';
import MetricsCards from '@/components/admin/MetricsCards';
import VerificationTable from '@/components/admin/VerificationTable';
import ReviewDrawer from '@/components/admin/ReviewDrawer';

export default function AdminDashboardPage() {
  const client = useApiClient();

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [verifications, setVerifications] = useState<AdminVerificationRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AdminVerificationRecord | null>(null);

  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchMetrics = useCallback(async () => {
    setIsLoadingMetrics(true);
    try {
      const data = await client.admin.getMetrics();
      setMetrics(data);
    } catch {
      setMetrics(null);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [client]);

  const fetchList = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const statusParam = activeFilter === 'ALL' ? undefined : activeFilter;
      const data = await client.admin.listVerifications(statusParam);
      setVerifications(data);
    } catch {
      setVerifications([]);
    } finally {
      setIsLoadingList(false);
    }
  }, [activeFilter, client]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchList();
  }, [fetchList]);

  const handleApprove = async (remarks: string) => {
    if (!selectedRecord) return;
    await client.admin.makeDecision(selectedRecord.id, 'APPROVED', remarks);
    showToast(`Successfully approved seller profile for ${selectedRecord.seller_email}`, 'success');
    void fetchMetrics();
    void fetchList();
  };

  const handleReject = async (reason: string) => {
    if (!selectedRecord) return;
    await client.admin.makeDecision(selectedRecord.id, 'REJECTED', reason);
    showToast(`Successfully rejected seller profile for ${selectedRecord.seller_email}`, 'success');
    void fetchMetrics();
    void fetchList();
  };

  return (
    <div className="p-8 flex flex-col gap-8 max-w-[1400px] w-full mx-auto font-body">
      {toast && (
        <div
          className={`fixed bottom-8 right-8 p-4 rounded-md font-body text-sm font-medium text-white shadow-lg z-50 animate-bounce
            ${toast.type === 'success' ? 'bg-[--color-success]' : 'bg-[--color-danger]'}`}
        >
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}

      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold text-[#072C2C] tracking-wide">
          Approval Dashboard
        </h1>
        <span className="text-sm text-black/60 font-body">
          Manage and approve seller registration documents
        </span>
      </header>

      <MetricsCards metrics={metrics} isLoading={isLoadingMetrics} />

      <VerificationTable
        verifications={verifications}
        isLoading={isLoadingList}
        onRowClick={(rec) => setSelectedRecord(rec)}
        activeFilter={activeFilter}
        onFilterChange={(f) => setActiveFilter(f)}
      />

      <ReviewDrawer
        record={selectedRecord}
        isOpen={selectedRecord !== null}
        onClose={() => setSelectedRecord(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
