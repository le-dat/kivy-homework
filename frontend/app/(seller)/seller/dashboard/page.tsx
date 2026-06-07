'use client';

import { useSellerVerification } from '@/hooks/useSellerVerification';
import { VerificationPanel } from '@/components/seller';

export default function SellerDashboardPage() {
  const {
    user,
    status,
    rejectionReason,
    isLoadingVerification,
    toast,
    handleUpload,
    handleRetry,
  } = useSellerVerification();

  return (
    <div className="p-8 flex flex-col gap-8 max-w-[800px] w-full mx-auto">
      {toast && (
        <div
          className={`fixed bottom-8 right-8 p-4 rounded-md font-body text-sm font-medium text-white shadow-lg z-50
            ${toast.type === 'success' ? 'bg-success' : 'bg-danger'}`}
        >
          {toast.message}
        </div>
      )}

      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl text-text">Account Verification</h1>
        <span className="font-body text-sm text-text/60">{user?.email}</span>
      </header>

      <div>
        {isLoadingVerification ? (
          <div className="bg-primary rounded-md p-6 animate-pulse min-h-[200px]" />
        ) : (
          <VerificationPanel
            status={status}
            rejectionReason={rejectionReason}
            onUpload={handleUpload}
            onRetry={handleRetry}
          />
        )}
      </div>
    </div>
  );
}
