import React from 'react';

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, change, icon, trend }) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        {change && (
          <p className={`text-xs mt-2 font-medium ${
            trend === 'up' ? 'text-emerald-600' : 
            trend === 'down' ? 'text-rose-600' : 'text-slate-500'
          }`}>
            {change}
          </p>
        )}
      </div>
      <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
        {icon}
      </div>
    </div>
  );
};

export default KpiCard;