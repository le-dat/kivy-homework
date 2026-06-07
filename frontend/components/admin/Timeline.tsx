import type { VerificationEventRecord } from '@/services/api/kivyClient';
import type { VerificationStatus } from '@/types';

interface TimelineProps {
  events: VerificationEventRecord[];
  isLoading: boolean;
}

export default function Timeline({ events, isLoading }: TimelineProps) {
  const getStatusLabel = (status: VerificationStatus | null) => {
    if (!status) return 'START';
    const labels: Record<VerificationStatus, string> = {
      UNSUBMITTED: 'UNSUBMITTED',
      PENDING: 'PENDING',
      PROCESSING: 'PROCESSING',
      VERIFIED: 'VERIFIED',
      APPROVED: 'APPROVED (ADMIN)',
      REJECTED: 'REJECTED',
      INCONCLUSIVE: 'REQUIRES REVIEW',
      SYSTEM_ERROR: 'SYSTEM ERROR',
    };
    return labels[status] ?? status;
  };

  const getStatusColor = (status: VerificationStatus) => {
    const colors: Record<VerificationStatus, string> = {
      UNSUBMITTED: 'text-white/40',
      PENDING: 'text-blue-400',
      PROCESSING: 'text-cyan-400',
      VERIFIED: 'text-[--color-success]',
      APPROVED: 'text-[--color-success]',
      REJECTED: 'text-[--color-danger]',
      INCONCLUSIVE: 'text-[--color-warning]',
      SYSTEM_ERROR: 'text-red-500',
    };
    return colors[status] ?? 'text-white';
  };

  const formatEventDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const getActorLabel = (event: VerificationEventRecord) => {
    if (event.actor_type === 'SYSTEM') {
      return '⚙️ SYSTEM';
    }
    if (event.actor_type === 'ADMIN') {
      return `👮 ADMIN (${event.actor_email || 'Anonymous'})`;
    }
    return `🏪 SELLER (${event.actor_email || 'Seller'})`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4">
        {[...Array(3)].map((_, i) => (
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
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-white/40 font-body text-sm">
        No status change history found.
      </div>
    );
  }

  return (
    <div className="flex flex-col p-2 pl-4 border-l-2 border-white/10 gap-8 relative ml-2 font-body text-sm">
      {events.map((e, idx) => (
        <div key={idx} className="relative group">
          <div
            className={`absolute left-[-23px] top-1.5 w-4 h-4 rounded-full border-2 border-[#072C2C] shadow
              ${
                e.to_status === 'APPROVED' || e.to_status === 'VERIFIED'
                  ? 'bg-[--color-success]'
                  : e.to_status === 'REJECTED'
                  ? 'bg-[--color-danger]'
                  : e.to_status === 'INCONCLUSIVE'
                  ? 'bg-[--color-warning]'
                  : 'bg-blue-400'
              }`}
          />

          <div className="flex flex-col gap-1 text-white/90">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="text-white/50">Transition:</span>
              <span className="text-white/40">{getStatusLabel(e.from_status)}</span>
              <span className="text-white/30">➔</span>
              <span className={getStatusColor(e.to_status)}>{getStatusLabel(e.to_status)}</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-white/50 mt-1">
              <span className="font-semibold text-white/70">{getActorLabel(e)}</span>
              <span>•</span>
              <span>{formatEventDate(e.created_at)}</span>
            </div>

            {e.reason && (
              <p className="bg-white/5 border border-white/10 rounded-sm p-3 mt-2 text-xs text-white/80 italic leading-relaxed">
                💬 {e.reason}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
