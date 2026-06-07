'use client';

import { useState } from 'react';
import type { VerificationStatus } from '@/types';
import { STATUS_CONFIG } from './constants';
import FileDropZone from './FileDropZone';

interface VerificationPanelProps {
  status: VerificationStatus;
  rejectionReason?: string | null;
  onUpload: (file: File) => Promise<void>;
  onRetry: () => void;
}

export default function VerificationPanel({
  status,
  rejectionReason,
  onUpload,
  onRetry,
}: VerificationPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.UNSUBMITTED;
  const isTerminal = status === 'VERIFIED' || status === 'APPROVED';
  const isPending = status === 'PENDING' || status === 'PROCESSING';
  const isInconclusive = status === 'INCONCLUSIVE';
  const isRejected = status === 'REJECTED' || status === 'SYSTEM_ERROR';

  async function handleSubmit() {
    if (!file) return;
    setIsUploading(true);
    try {
      await onUpload(file);
    } finally {
      setIsUploading(false);
    }
  }

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
  };

  const handleRetryClick = () => {
    setFile(null);
    setError('');
    onRetry();
  };

  return (
    <div className="bg-primary rounded-md p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-white">Account Verification</h2>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold font-body uppercase tracking-wide ${config.badgeClass}`}
        >
          {config.label}
        </span>
      </div>

      <p className="text-white/70 font-body text-sm">{config.description}</p>

      {rejectionReason && (
        <div className="bg-danger/20 border border-danger text-red-200 p-3 rounded-sm text-sm font-body">
          <strong>Reason:</strong> {rejectionReason}
        </div>
      )}

      {(status === 'UNSUBMITTED' || isRejected) && (
        <FileDropZone
          file={file}
          onFileSelect={handleFileSelect}
          setError={setError}
        />
      )}

      {error && <p className="text-red-200 text-sm font-body">{error}</p>}

      {isPending && (
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full w-2/5 bg-warning rounded-full animate-[pulse_1.5s_ease-in-out_infinite]" />
        </div>
      )}

      {isInconclusive && (
        <div className="bg-warning/20 border border-warning text-yellow-200 p-3 rounded-sm text-sm font-body">
          Your account is undergoing manual approval. You can still list products.
        </div>
      )}

      {file && !isTerminal && !isPending && (
        <button
          onClick={handleSubmit}
          disabled={isUploading}
          className="p-3 bg-secondary text-white rounded-sm font-body text-base font-semibold
            hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-transform"
        >
          {isUploading ? 'Uploading...' : 'Submit Document'}
        </button>
      )}

      {isRejected && !isPending && (
        <button
          onClick={handleRetryClick}
          className="p-3 bg-transparent border border-secondary text-secondary rounded-sm font-body
            text-base font-semibold hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          Re-upload Document
        </button>
      )}
    </div>
  );
}
