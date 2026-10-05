import React from 'react';
import { CheckCircle2, Check, UserCheck, Calendar, FileText } from 'lucide-react';

export type UnifiedProgrammeStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'CHECK_IN'
  | 'LIVE'
  | 'COMPLETED'
  | 'PUBLISHED';

export function getUnifiedProgrammeStatus(
  comp?: {
    status?: string;
    schedule_status?: string | null;
    published_results_count?: number;
    start_at?: string | null;
  } | null,
  sched?: {
    status?: string | null;
    published_results_count?: number;
    start_at?: string | null;
  } | null
): UnifiedProgrammeStatus {
  // 1. Published: if any published results exist
  if (
    Number(comp?.published_results_count ?? 0) > 0 ||
    Number(sched?.published_results_count ?? 0) > 0
  ) {
    return 'PUBLISHED';
  }

  const schedStatus = sched?.status || comp?.schedule_status;

  // 2. Completed: performance finished
  if (schedStatus === 'COMPLETED' || comp?.status === 'COMPLETED') {
    return 'COMPLETED';
  }

  // 3. Live: currently performing on stage
  if (schedStatus === 'LIVE') {
    return 'LIVE';
  }

  // 4. Check-in: backstage roll call in progress
  if (schedStatus === 'CHECK_IN') {
    return 'CHECK_IN';
  }

  // 5. Scheduled: date/time assigned
  if (schedStatus === 'SCHEDULED' || sched?.start_at) {
    return 'SCHEDULED';
  }

  // 6. Default: draft / created in catalogue
  return 'DRAFT';
}

interface ProgrammeStatusBadgeProps {
  status?: UnifiedProgrammeStatus;
  competition?: {
    status?: string;
    schedule_status?: string | null;
    published_results_count?: number;
    start_at?: string | null;
  } | null;
  schedule?: {
    status?: string | null;
    published_results_count?: number;
    start_at?: string | null;
  } | null;
  size?: 'sm' | 'md';
  className?: string;
}

export const ProgrammeStatusBadge: React.FC<ProgrammeStatusBadgeProps> = ({
  status: explicitStatus,
  competition,
  schedule,
  size = 'sm',
  className = '',
}) => {
  const resolvedStatus = explicitStatus || getUnifiedProgrammeStatus(competition, schedule);

  const configs: Record<
    UnifiedProgrammeStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    PUBLISHED: {
      label: 'Published',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200/80',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />,
    },
    COMPLETED: {
      label: 'Completed',
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-200/80',
      icon: <Check className="w-3 h-3 text-sky-600" />,
    },
    LIVE: {
      label: 'Live',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200/80',
      icon: (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
        </span>
      ),
    },
    CHECK_IN: {
      label: 'Check-In',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200/80',
      icon: <UserCheck className="w-3 h-3 text-amber-600" />,
    },
    SCHEDULED: {
      label: 'Scheduled',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200/80',
      icon: <Calendar className="w-3 h-3 text-indigo-600" />,
    },
    DRAFT: {
      label: 'Draft',
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-200/80',
      icon: <FileText className="w-3 h-3 text-slate-500" />,
    },
  };

  const config = configs[resolvedStatus] || configs.DRAFT;
  const sizeClass = size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold border tracking-wide uppercase ${config.bg} ${config.text} ${config.border} ${sizeClass} ${className}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};
