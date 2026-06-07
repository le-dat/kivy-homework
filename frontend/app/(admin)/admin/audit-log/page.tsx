'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from '@/hooks/useApiClient';
import type { VerificationEventRecord } from '@/services/api/kivyClient';
import type { VerificationStatus } from '@/types';

interface AuditLogEntry extends VerificationEventRecord {
  verification_id: string;
  seller_email: string;
}

const STATUS_COLORS: Record<VerificationStatus, string> = {
  UNSUBMITTED: 'text-black/40',
  PENDING: 'text-blue-600',
  PROCESSING: 'text-cyan-600',
  VERIFIED: 'text-green-600',
  APPROVED: 'text-green-600',
  REJECTED: 'text-red-600',
  INCONCLUSIVE: 'text-amber-600',
  SYSTEM_ERROR: 'text-red-700',
};

export default function AuditLogPage() {
  const client = useApiClient();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchEmail, setSearchEmail] = useState('');

  const fetchAuditLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get all verifications to build a mapping of ID to seller email
      const verifications = await client.admin.listVerifications();
      const verMap = new Map(verifications.map(v => [v.id, v.seller_email]));

      // Fetch history for each verification (in parallel, limited batch)
      const allEvents: AuditLogEntry[] = [];
      const verIds = verifications.map(v => v.id);

      // Fetch in batches of 20 to avoid overwhelming the server
      for (let i = 0; i < verIds.length; i += 20) {
        const batch = verIds.slice(i, i + 20);
        const results = await Promise.all(
          batch.map(id => client.admin.getVerificationHistory(id))
        );
        for (let j = 0; j < batch.length; j++) {
          const events = results[j];
          const sellerEmail = verMap.get(batch[j]) || 'Unknown';
          for (const event of events) {
            allEvents.push({
              ...event,
              verification_id: batch[j],
              seller_email: sellerEmail,
            });
          }
        }
      }

      // Sort by created_at descending
      allEvents.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setLogs(allEvents);
    } catch {
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void fetchAuditLogs();
  }, [fetchAuditLogs]);

  const filteredLogs = logs.filter(log => {
    if (activeFilter !== 'ALL' && log.to_status !== activeFilter) return false;
    if (searchEmail && !log.seller_email.toLowerCase().includes(searchEmail.toLowerCase())) return false;
    return true;
  });

  const formatDate = (isoString: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  const getActorLabel = (event: AuditLogEntry) => {
    if (event.actor_type === 'SYSTEM') return '⚙️ SYSTEM';
    if (event.actor_type === 'ADMIN') return `👮 ADMIN (${event.actor_email || 'Anonymous'})`;
    return `🏪 SELLER (${event.actor_email || 'Seller'})`;
  };

  return (
    <div className="p-8 flex flex-col gap-6 max-w-[1400px] w-full mx-auto font-body">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold text-[#072C2C] tracking-wide">
          Audit Log
        </h1>
        <span className="text-sm text-black/60 font-body">
          Full history of all verification events across all sellers
        </span>
      </header>

      <div className="flex gap-4 items-center">
        <input
          type="text"
          placeholder="Search by seller email..."
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          className="px-3 py-2 border border-black/20 rounded-md text-sm font-body w-64"
        />
        <div className="flex gap-2">
          {['ALL', 'VERIFIED', 'APPROVED', 'REJECTED', 'INCONCLUSIVE'].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeFilter === f
                  ? 'bg-[#072C2C] text-white'
                  : 'bg-white/10 text-black/60 hover:bg-white/20'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={() => void fetchAuditLogs()}
          className="ml-auto px-3 py-1.5 border border-black/20 rounded-md text-xs hover:bg-white/50 transition-colors cursor-pointer"
        >
          Refresh
        </button>
      </div>

      <div className="bg-black/5 rounded-md overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-black/40">Loading audit log...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-black/40">No events found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 bg-black/5">
                <th className="text-left p-3 font-semibold text-black/60">Timestamp</th>
                <th className="text-left p-3 font-semibold text-black/60">Seller</th>
                <th className="text-left p-3 font-semibold text-black/60">Event</th>
                <th className="text-left p-3 font-semibold text-black/60">Actor</th>
                <th className="text-left p-3 font-semibold text-black/60">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, idx) => (
                <tr key={idx} className="border-b border-black/5 hover:bg-black/5 transition-colors">
                  <td className="p-3 text-black/60 text-xs font-mono whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="p-3 text-black/80 font-medium text-xs">{log.seller_email}</td>
                  <td className="p-3">
                    <span className="text-black/40 text-xs">{log.from_status || 'START'}</span>
                    <span className="text-black/20 mx-1">→</span>
                    <span className={`font-semibold text-xs ${STATUS_COLORS[log.to_status]}`}>
                      {log.to_status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-black/50">{getActorLabel(log)}</td>
                  <td className="p-3 text-xs text-black/60 max-w-[200px] truncate">{log.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}