import type { AdminVerificationRecord } from '@/services/api/kivyClient';
import type { VerificationStatus } from '@/types';

interface VerificationTableProps {
  verifications: AdminVerificationRecord[];
  isLoading: boolean;
  onRowClick: (record: AdminVerificationRecord) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export default function VerificationTable({
  verifications,
  isLoading,
  onRowClick,
  activeFilter,
  onFilterChange,
}: VerificationTableProps) {
  const tabs = [
    { label: 'All', value: 'ALL' },
    { label: 'Requires Review (Inconclusive)', value: 'INCONCLUSIVE' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Verified', value: 'VERIFIED_APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
  ];

  const getStatusBadge = (status: VerificationStatus) => {
    const styles: Record<VerificationStatus, string> = {
      UNSUBMITTED: 'bg-white/20 text-white/80 border-white/20',
      PENDING: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      PROCESSING: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      VERIFIED: 'bg-[--color-success]/10 text-[--color-success] border-[--color-success]/30',
      APPROVED: 'bg-[--color-success]/10 text-[--color-success] border-[--color-success]/30',
      REJECTED: 'bg-[--color-danger]/10 text-[--color-danger] border-[--color-danger]/30',
      INCONCLUSIVE: 'bg-[--color-warning]/10 text-[--color-warning] border-[--color-warning]/30',
      SYSTEM_ERROR: 'bg-red-700/10 text-red-400 border-red-700/30',
    };

    const labels: Record<VerificationStatus, string> = {
      UNSUBMITTED: 'Unsubmitted',
      PENDING: 'Pending',
      PROCESSING: 'Processing',
      VERIFIED: 'Verified',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      INCONCLUSIVE: 'Requires Review',
      SYSTEM_ERROR: 'System Error',
    };

    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold font-body border leading-none ${styles[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-[#072C2C] p-6 rounded-md shadow-lg border border-white/5">
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onFilterChange(tab.value)}
            className={`px-4 py-2 text-sm font-semibold rounded-sm font-body cursor-pointer transition-colors
              ${
                activeFilter === tab.value
                  ? 'bg-[--color-secondary] text-white'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-white/50 font-body text-xs font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">ID</th>
              <th className="py-3 px-4">Seller Email</th>
              <th className="py-3 px-4">Document File</th>
              <th className="py-3 px-4">Created At</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4"><div className="h-4 w-24 bg-white/10 rounded" /></td>
                  <td className="py-4 px-4"><div className="h-4 w-36 bg-white/10 rounded" /></td>
                  <td className="py-4 px-4"><div className="h-4 w-28 bg-white/10 rounded" /></td>
                  <td className="py-4 px-4"><div className="h-4 w-32 bg-white/10 rounded" /></td>
                  <td className="py-4 px-4"><div className="h-6 w-20 bg-white/10 rounded-full" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-8 w-16 bg-white/10 rounded inline-block" /></td>
                </tr>
              ))
            ) : verifications.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-white/40 font-body text-sm">
                  No verification requests found.
                </td>
              </tr>
            ) : (
              verifications.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => onRowClick(v)}
                  className="hover:bg-white/5 hover:scale-[1.002] transition-all cursor-pointer text-white/90 text-sm font-body"
                >
                  <td className="py-4 px-4 font-mono text-xs text-white/60">
                    {v.id.substring(0, 8)}...
                  </td>
                  <td className="py-4 px-4 font-semibold">{v.seller_email}</td>
                  <td className="py-4 px-4">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowClick(v);
                      }}
                      className="text-[--color-secondary] hover:underline"
                    >
                      {v.document_url.split('/').pop()}
                    </a>
                  </td>
                  <td className="py-4 px-4 text-white/70">{formatDate(v.created_at)}</td>
                  <td className="py-4 px-4">{getStatusBadge(v.status)}</td>
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowClick(v);
                      }}
                      className="px-3.5 py-1.5 bg-[--color-secondary] text-white text-xs font-semibold rounded-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
