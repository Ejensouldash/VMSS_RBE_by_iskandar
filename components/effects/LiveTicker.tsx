import React, { useMemo } from 'react';
import { Transaction } from '../../types';
import { formatRM } from '../../services/profit';
import { Radio, CircleDot } from 'lucide-react';

interface LiveTickerProps {
  transactions: Transaction[];
  limit?: number;
}

/**
 * Horizontal marquee showing the most recent transactions, HUD-ticker style.
 * Purely presentational — duplicates the item list once so the CSS
 * marquee (-50% translateX) loops seamlessly.
 */
const LiveTicker: React.FC<LiveTickerProps> = ({ transactions, limit = 14 }) => {
  const items = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }, [transactions, limit]);

  if (items.length === 0) {
    return (
      <div className="vm-glass rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-slate-500">
        <Radio size={14} className="text-slate-500" /> Waiting for live transactions…
      </div>
    );
  }

  const renderItems = (keyPrefix: string) =>
    items.map((t, i) => (
      <span key={`${keyPrefix}-${t.id || i}`} className="inline-flex items-center gap-2 text-xs font-mono-num">
        <CircleDot size={10} className="text-emerald-400 shrink-0" />
        <span className="text-slate-300">{t.productName}</span>
        <span className="text-emerald-300 font-semibold">{formatRM(t.amount)}</span>
        <span className="text-slate-500">
          {new Date(t.timestamp).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </span>
    ));

  return (
    <div className="vm-ticker-wrap vm-glass rounded-xl px-4 py-2.5 overflow-hidden flex items-center gap-3">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-300 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 vm-pulse" /> Live
      </span>
      <div className="overflow-hidden flex-1">
        <div className="vm-ticker-track">
          {renderItems('a')}
          {renderItems('b')}
        </div>
      </div>
    </div>
  );
};

export default LiveTicker;
