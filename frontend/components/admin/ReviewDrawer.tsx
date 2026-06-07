'use client';

import { useState, useEffect } from 'react';
import DocumentViewer from './DocumentViewer';
import Timeline from './Timeline';
import { useApiClient } from '@/hooks/useApiClient';
import type { SellerVerificationRecord, AdminVerificationRecord } from '@/services/api/kivyClient';

interface ReviewDrawerProps {
  record: AdminVerificationRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (remarks: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}

export default function ReviewDrawer({
  record,
  isOpen,
  onClose,
  onApprove,
  onReject,
}: ReviewDrawerProps) {
  const client = useApiClient();
  const [activeTab, setActiveTab] = useState<'DOCUMENT' | 'TIMELINE'>('DOCUMENT');
  const [history, setHistory] = useState<SellerVerificationRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [leftPercent, setLeftPercent] = useState(50); // splitting percentage

  const [remarks, setRemarks] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const [prevRecordId, setPrevRecordId] = useState<string | null>(null);
  if (record && record.id !== prevRecordId) {
    setPrevRecordId(record.id);
    setActiveTab('DOCUMENT');
    setRemarks('');
    setRejectionReason('');
    setIsApproving(false);
    setIsRejecting(false);
    setActionError('');
  }

  useEffect(() => {
    if (!record || activeTab !== 'TIMELINE') return;

    let cancelled = false;
    void (async () => {
      setIsLoadingHistory(true);
      try {
        const data = await client.admin.getSellerVerificationHistory(record.seller_id);
        if (!cancelled) setHistory(data);
      } catch {
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [record, activeTab, client]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const container = document.getElementById('drawer-split-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newPercent = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      setLeftPercent(Math.max(30, Math.min(newPercent, 70))); // clamp 30%-70%
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleApproveSubmit = async () => {
    if (!record) return;
    setSubmitting(true);
    setActionError('');
    try {
      await onApprove(remarks.trim() || 'Document valid, approved.');
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!record) return;
    if (!rejectionReason.trim()) {
      setActionError('Please enter the reason for rejecting the document.');
      return;
    }
    setSubmitting(true);
    setActionError('');
    try {
      await onReject(rejectionReason.trim());
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Rejection failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end font-body text-sm">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[85vw] h-full bg-[#072C2C] border-l border-white/10 flex flex-col shadow-2xl text-white">
        
        <header className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-[#FF5F03] font-semibold uppercase tracking-wider">
              Review Verification Request
            </span>
            <span className="text-base font-semibold text-white mt-1">
              Seller: {record.seller_email}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white rounded-full hover:bg-white/5 transition-colors cursor-pointer"
          >
            ❌ Close
          </button>
        </header>

        {/* Split Resizable Workarea */}
        <div id="drawer-split-container" className="flex-1 flex overflow-hidden relative">
          
          <div
            style={{ width: `${leftPercent}%` }}
            className="h-full p-4 overflow-hidden flex flex-col"
          >
            <DocumentViewer documentUrl={record.document_url} />
          </div>

          <div
            onMouseDown={handleMouseDown}
            className="w-1.5 hover:w-2 bg-white/10 hover:bg-[#FF5F03] cursor-col-resize flex-shrink-0 transition-colors relative z-10 flex items-center justify-center"
            title="Drag to resize panels"
          >
            <div className="h-8 w-0.5 bg-white/30" />
          </div>

          <div
            style={{ width: `${100 - leftPercent}%` }}
            className="h-full p-6 overflow-y-auto flex flex-col gap-6"
          >
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setActiveTab('DOCUMENT')}
                className={`flex-1 py-2 text-center font-semibold cursor-pointer border-b-2 transition-colors
                  ${
                    activeTab === 'DOCUMENT'
                      ? 'border-[#FF5F03] text-white'
                      : 'border-transparent text-white/50 hover:text-white'
                  }`}
              >
                Document & Decision
              </button>
              <button
                onClick={() => setActiveTab('TIMELINE')}
                className={`flex-1 py-2 text-center font-semibold cursor-pointer border-b-2 transition-colors
                  ${
                    activeTab === 'TIMELINE'
                      ? 'border-[#FF5F03] text-white'
                      : 'border-transparent text-white/50 hover:text-white'
                  }`}
              >
                Verification History (Timeline)
              </button>
            </div>

            {activeTab === 'DOCUMENT' ? (
              <div className="flex flex-col gap-6 flex-1">
                <div className="bg-white/5 rounded-md p-4 border border-white/10 flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-white/50">Current Status:</span>
                    <span className="font-semibold text-[#FF5F03]">{record.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Request ID:</span>
                    <span className="font-mono text-xs">{record.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">File Link:</span>
                    <a
                      href={record.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline break-all max-w-[200px]"
                    >
                      Open in new tab ↗️
                    </a>
                  </div>
                </div>

                {actionError && (
                  <div className="bg-[--color-danger]/20 border border-[--color-danger] text-red-200 p-3 rounded-sm text-xs">
                    ⚠️ {actionError}
                  </div>
                )}

                <div className="flex flex-col gap-4 mt-auto">
                  <span className="font-bold text-white/90">Make verification decision:</span>

                  {!isApproving && !isRejecting && (
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setIsApproving(true)}
                        className="py-3 bg-[--color-success] text-white font-semibold rounded-sm hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
                      >
                        ✔️ Approve
                      </button>
                      <button
                        onClick={() => setIsRejecting(true)}
                        className="py-3 bg-[--color-danger] text-white font-semibold rounded-sm hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  )}

                  {isApproving && (
                    <div className="flex flex-col gap-3 bg-green-950/20 border border-green-500/30 p-4 rounded-sm">
                      <span className="font-semibold text-[--color-success] text-xs">APPROVE PROFILE</span>
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Enter approval remarks (optional)..."
                        className="p-3 bg-white/5 border border-white/20 rounded-sm text-white focus:outline-none focus:border-[--color-success] h-20 text-xs resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setIsApproving(false)}
                          disabled={submitting}
                          className="px-3 py-1.5 border border-white/10 hover:bg-white/5 rounded-sm text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleApproveSubmit}
                          disabled={submitting}
                          className="px-4 py-1.5 bg-[--color-success] text-white font-semibold rounded-sm text-xs cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                        >
                          {submitting ? 'Submitting...' : 'Approve'}
                        </button>
                      </div>
                    </div>
                  )}

                  {isRejecting && (
                    <div className="flex flex-col gap-3 bg-red-950/20 border border-red-500/30 p-4 rounded-sm">
                      <span className="font-semibold text-[--color-danger] text-xs">REJECT PROFILE (Reason required)</span>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Please enter the reason for rejecting the seller's profile..."
                        className="p-3 bg-white/5 border border-white/20 rounded-sm text-white focus:outline-none focus:border-[--color-danger] h-24 text-xs resize-none"
                        required
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setIsRejecting(false)}
                          disabled={submitting}
                          className="px-3 py-1.5 border border-white/10 hover:bg-white/5 rounded-sm text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleRejectSubmit}
                          disabled={submitting}
                          className="px-4 py-1.5 bg-[--color-danger] text-white font-semibold rounded-sm text-xs cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                        >
                          {submitting ? 'Submitting...' : 'Confirm Reject'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto flex flex-col gap-6">
                {isLoadingHistory ? (
                  <div className="flex flex-col gap-6 p-4">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="flex gap-4 animate-pulse">
                        <div className="w-3 h-3 rounded-full bg-white/10 mt-1" />
                        <div className="flex-1 flex flex-col gap-2">
                          <div className="h-4 w-28 bg-white/10 rounded" />
                          <div className="h-3 w-48 bg-white/10 rounded" />
                          <div className="h-3 w-full bg-white/10 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-8 text-white/40 font-body text-sm">
                    No status change history found.
                  </div>
                ) : (
                  history.map((ver, idx) => (
                    <div key={ver.id} className="bg-white/5 border border-white/10 rounded-md p-4 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="font-semibold text-white/90">
                          Submission #{history.length - idx} {ver.id === record.id && '(Current)'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${
                          ver.status === 'VERIFIED' || ver.status === 'APPROVED'
                            ? 'bg-[--color-success]/20 text-green-200'
                            : ver.status === 'REJECTED'
                            ? 'bg-[--color-danger]/20 text-red-200'
                            : 'bg-[--color-warning]/20 text-yellow-200'
                        }`}>
                          {ver.status}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5 text-xs text-white/60">
                        <div>
                          <strong>Created At:</strong> {new Date(ver.created_at).toLocaleString()}
                        </div>
                        <div>
                          <strong>Document:</strong>{' '}
                          <a
                            href={ver.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline break-all"
                          >
                            View Document ↗️
                          </a>
                        </div>
                        {ver.reason && (
                          <div className="mt-1 bg-red-950/20 border border-red-900/30 text-red-200 p-2 rounded-sm italic">
                            <strong>Reason:</strong> {ver.reason}
                          </div>
                        )}
                      </div>
                      <div className="mt-2 pl-2 border-l border-white/10">
                        <span className="text-[10px] font-semibold text-white/40 block mb-3 uppercase tracking-wider">
                          State Transitions:
                        </span>
                        <Timeline events={ver.events} isLoading={false} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
