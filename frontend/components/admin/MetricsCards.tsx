import type { AdminMetrics } from '@/services/api/kivyClient';

interface MetricsCardsProps {
  metrics: AdminMetrics | null;
  isLoading: boolean;
}

export default function MetricsCards({ metrics, isLoading }: MetricsCardsProps) {
  const cards = [
    {
      title: 'Requires Review (Pending / Inconclusive)',
      value: metrics?.pending ?? 0,
      color: 'border-[--color-warning]',
      textColor: 'text-[--color-warning]',
      bgColor: 'bg-[--color-warning]/10',
    },
    {
      title: 'Activated (Verified / Approved)',
      value: metrics?.verifiedCount ?? 0,
      color: 'border-[--color-success]',
      textColor: 'text-[--color-success]',
      bgColor: 'bg-[--color-success]/10',
    },
    {
      title: 'Rejected',
      value: metrics?.rejectedCount ?? 0,
      color: 'border-[--color-danger]',
      textColor: 'text-[--color-danger]',
      bgColor: 'bg-[--color-danger]/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`border-l-4 p-6 rounded-md shadow-sm transition-all hover:translate-y-[-2px] flex flex-col justify-between min-h-[120px] bg-[#072C2C]/90 text-white ${card.color}`}
        >
          <span className="font-body text-xs text-white/60 font-semibold uppercase tracking-wider">
            {card.title}
          </span>
          <div className="flex items-baseline justify-between mt-4">
            {isLoading ? (
              <span className="h-8 w-16 bg-white/10 animate-pulse rounded" />
            ) : (
              <span className={`font-display text-4xl font-bold ${card.textColor}`}>
                {card.value}
              </span>
            )}
            <span className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${card.bgColor} ${card.textColor}`}>
              {idx === 0 ? '⏳' : idx === 1 ? '✅' : '❌'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
