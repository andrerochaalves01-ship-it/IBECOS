import React from 'react';
import { RequestStatus } from '../types';
import { STATUS_LABELS } from '../lib/formatters';

interface StatusBadgeProps {
  status: RequestStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const getStatusConfig = (st: RequestStatus) => {
    switch (st) {
      case 'NOVA':
        return {
          textColor: 'text-sky-800',
          bgColor: 'bg-sky-50',
          borderColor: 'border-sky-200',
          dotColor: 'bg-sky-500',
        };
      case 'ATRIBUIDA':
        return {
          textColor: 'text-violet-800',
          bgColor: 'bg-violet-50',
          borderColor: 'border-violet-200',
          dotColor: 'bg-violet-600',
        };
      case 'EM_COLETA':
        return {
          textColor: 'text-amber-800',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          dotColor: 'bg-amber-500',
        };
      case 'EM_TRANSPORTE':
        return {
          textColor: 'text-indigo-800',
          bgColor: 'bg-indigo-50',
          borderColor: 'border-indigo-200',
          dotColor: 'bg-indigo-600',
        };
      case 'FINALIZADA':
        return {
          textColor: 'text-emerald-800',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
          dotColor: 'bg-emerald-600',
        };
      case 'CANCELADA':
        return {
          textColor: 'text-rose-800',
          bgColor: 'bg-rose-50',
          borderColor: 'border-rose-200',
          dotColor: 'bg-rose-500',
        };
      default:
        return {
          textColor: 'text-slate-700',
          bgColor: 'bg-slate-100',
          borderColor: 'border-slate-200',
          dotColor: 'bg-slate-400',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold border ${config.bgColor} ${config.textColor} ${config.borderColor} tabular-nums whitespace-nowrap`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} aria-hidden="true" />
      {STATUS_LABELS[status] || status}
    </span>
  );
};
