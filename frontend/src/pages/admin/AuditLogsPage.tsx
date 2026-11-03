import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import {
  History,
  Search,
  ChevronDown,
  RotateCcw,
  Activity,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';
import { THEME } from '../../theme/theme.js';

const getAuditSummary = (log: any): string => {
  if (!log) return 'System update recorded';
  const action = (log.action || '').toUpperCase();
  const entity = (log.entity_type || '').toUpperCase();
  let parsedNew: any = {};
  if (log.new_data) {
    parsedNew = typeof log.new_data === 'string' ? (() => { try { return JSON.parse(log.new_data); } catch { return {}; } })() : log.new_data;
  }

  if (action.includes('VERIFY') || action.includes('PUBLISH') || entity === 'RESULT') {
    return parsedNew.competition_name || parsedNew.name ? `Published results for ${parsedNew.competition_name || parsedNew.name}` : `Published results for event ${log.entity_id || ''}`.trim();
  }
  if (action.includes('SCORE') || entity === 'SCORE') {
    return parsedNew.competition_name ? `Scores logged for ${parsedNew.competition_name}` : `Jury scores evaluated and logged`;
  }
  if (action.includes('CHECK_IN') || action.includes('CALL') || entity === 'STAGE_QUEUE') {
    return parsedNew.code_letter ? `Lot ${parsedNew.code_letter} called to stage` : `Backstage stage check-in recorded`;
  }
  if (entity === 'SCHEDULE' || action.includes('SCHEDULE')) {
    return parsedNew.venue_name ? `Scheduled event at ${parsedNew.venue_name}` : `Timetable schedule updated`;
  }
  if (entity === 'PARTICIPANT') {
    return parsedNew.name ? `Contestant ${parsedNew.name} updated` : `Participant records updated`;
  }
  if (entity === 'COMPETITION') {
    return parsedNew.name ? `Configured ${parsedNew.name}` : `Competition catalogue updated`;
  }
  if (entity === 'ANNOUNCEMENT') {
    return parsedNew.title ? `Notice: ${parsedNew.title}` : `Festival broadcast published`;
  }
  return `${action.replace(/_/g, ' ').toLowerCase()} on ${entity.toLowerCase()}`;
};

export const AuditLogsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery<any>({
    queryKey: ['audit-logs', page],
    queryFn: async () => {
      const res = await api.get<any>(`/audit-logs?page=${page}&limit=20`);
      return res.data;
    },
    refetchInterval: 10000,
  });

  const logs: any[] = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const actionChip = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act.includes('CREATE') || act.includes('ADD') || act.includes('ASSIGN') || act.includes('GENERATE')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          {action}
        </span>
      );
    }
    if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('VERIFY') || act.includes('SUBMIT')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          {action}
        </span>
      );
    }
    if (act.includes('DELETE') || act.includes('REVOKE') || act.includes('REMOVE')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#121212] text-amber-200 border border-white/[0.08]">
        {action}
      </span>
    );
  };

  const filteredLogs = logs.filter((log) => {
    const actMatch = actionFilter === 'ALL' || (log.action || '').toUpperCase().includes(actionFilter);
    const entityMatch = entityFilter === 'ALL' || (log.entity_type || '').toUpperCase() === entityFilter;
    const summary = getAuditSummary(log).toLowerCase();
    const searchMatch =
      !searchTerm.trim() ||
      (log.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entity_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      summary.includes(searchTerm.toLowerCase()) ||
      String(log.entity_id || '').includes(searchTerm);
    return actMatch && entityMatch && searchMatch;
  });

  return (
    <div className="space-y-4">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-xs">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bento-title font-bold text-white tracking-tight leading-none">
              Audit Logs
            </h1>
            <p className="text-xs text-amber-200/60 font-medium mt-1">
              System activity ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Ledger Active ({pagination.total || logs.length})</span>
          </span>
        </div>
      </div>

      {/* 2. Compact Bento Table Container */}
      <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl overflow-hidden">
        {/* Inline Toolbar */}
        <div className="p-3 border-b border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#121212]">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="appearance-none rounded-xl pl-3 pr-7 py-1.5 text-xs font-bold bg-[#0A0A0A] text-amber-200 border border-white/[0.08] focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
              </select>
              <ChevronDown className="w-3 h-3 text-amber-200/60 pointer-events-none absolute right-2 top-2.5" />
            </div>

            <div className="relative">
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="appearance-none rounded-xl pl-3 pr-7 py-1.5 text-xs font-bold bg-[#0A0A0A] text-amber-200 border border-white/[0.08] focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">All Entities</option>
                <option value="COMPETITION">Competitions</option>
                <option value="PARTICIPANT">Participants</option>
                <option value="SCHEDULE">Schedules</option>
                <option value="SCORE">Scores</option>
                <option value="ANNOUNCEMENT">Announcements</option>
              </select>
              <ChevronDown className="w-3 h-3 text-amber-200/60 pointer-events-none absolute right-2 top-2.5" />
            </div>

            {(actionFilter !== 'ALL' || entityFilter !== 'ALL' || searchTerm) && (
              <button
                onClick={() => {
                  setActionFilter('ALL');
                  setEntityFilter('ALL');
                  setSearchTerm('');
                }}
                className="p-1.5 text-amber-200/60 hover:text-amber-200 transition-colors cursor-pointer"
                title="Reset filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-52">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-amber-200/60" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter logs..."
              className="w-full pl-7 pr-3 py-1 bg-[#0A0A0A] border border-white/[0.08] rounded-xl text-xs text-amber-100 placeholder-slate-400 focus:outline-hidden focus:border-amber-400 font-medium"
            />
          </div>
        </div>

        {/* Mobile View: Log Activity Stream (<md) */}
        <div className="md:hidden divide-y divide-white/[0.04]">
          {isLoading ? (
            <div className="py-8 text-center text-amber-200/60 text-xs">
              Loading ledger...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-8 text-center text-amber-200/60 space-y-1">
              <Activity className="w-6 h-6 text-slate-300 mx-auto mb-1" />
              <p className="text-xs font-semibold">No logs found</p>
            </div>
          ) : (
            filteredLogs.map((log: any) => {
              const summaryText = getAuditSummary(log);
              return (
                <div key={log.id} className="p-3.5 space-y-2 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    {actionChip(log.action)}
                    <span className="text-[10px] text-amber-200/50 font-mono">
                      {new Date(log.created_at).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-100 leading-snug">
                    {summaryText}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-amber-200/60 pt-0.5">
                    <span className="font-mono">
                      <strong className="text-amber-200">{log.entity_type}</strong> {log.entity_id || ''}
                    </span>
                    <span>
                      {log.user_name || 'System'} ({log.user_role || 'AUTO'})
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Clean Responsive Table (>=md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[580px]">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] font-bento-title uppercase tracking-wider text-amber-200/60 bg-[#121212]">
                <th className="py-2.5 px-4 font-bold">Action</th>
                <th className="py-2.5 px-4 font-bold">Activity Summary</th>
                <th className="py-2.5 px-4 font-bold">Target</th>
                <th className="py-2.5 px-4 font-bold">Operator</th>
                <th className="py-2.5 px-4 font-bold text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-amber-200/60">
                    <span className="text-xs">Loading ledger...</span>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-amber-200/60">
                    <Activity className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                    <span className="text-xs font-semibold text-amber-200/60">No logs found</span>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log: any) => {
                  const summaryText = getAuditSummary(log);
                  return (
                    <tr key={log.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-2.5 px-4">
                        {actionChip(log.action)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-100 font-medium">
                        {summaryText}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-medium text-amber-200">
                        <span className="font-bold text-amber-100">{log.entity_type}</span>{' '}
                        {log.entity_id ? <span className="text-amber-200/60">{log.entity_id}</span> : null}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-amber-100 truncate max-w-[130px]">
                            {log.user_name || 'System'}
                          </span>
                          <span className="text-[10px] text-amber-200/60">
                            ({log.user_role || 'AUTO'})
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right text-amber-200/60 font-medium whitespace-nowrap text-[11px]">
                        {new Date(log.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Minimal Footer Pagination */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.08] bg-[#121212] text-xs font-medium text-amber-200/60">
          <span>Page {pagination.page} of {pagination.totalPages || 1}</span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 cursor-pointer text-amber-200/60 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= (pagination.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
              className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 cursor-pointer text-amber-200/60 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
