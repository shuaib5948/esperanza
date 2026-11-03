import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import {
  Users,
  Search,
  RefreshCw,
  Sparkles,
  Layers,
} from 'lucide-react';
import { THEME } from '../../theme/theme.js';

interface Participant {
  id: number;
  participant_code: string;
  name?: string;
  user_name?: string;
  email?: string;
  category_id?: number;
  category_name: string;
  category_code: string;
  status: string;
  individual_stage_count?: number;
  individual_offstage_count?: number;
}

export const TeamRosterPage: React.FC = () => {
  const [search, setSearch] = useState('');

  // 1. Fetch team participants (backend automatically isolates to own team)
  const {
    data: participantsResponse,
    isLoading,
    refetch: refetchParticipants,
  } = useQuery<any>({
    queryKey: ['team-roster'],
    queryFn: async () => {
      const res = await api.get<any>('/participants');
      return res.data;
    },
  });

  const participants: Participant[] = React.useMemo(() => {
    if (!participantsResponse) return [];
    if (Array.isArray(participantsResponse)) return participantsResponse;
    if (Array.isArray(participantsResponse.participants)) return participantsResponse.participants;
    if (Array.isArray(participantsResponse.data)) return participantsResponse.data;
    return [];
  }, [participantsResponse]);

  const filtered = participants.filter((p) => {
    const pName = p.user_name || p.name || '';
    return (
      pName.toLowerCase().includes(search.toLowerCase()) ||
      p.participant_code.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-4">
      {/* 1. Header Bar: Two-Tier on Mobile, Sleek Bento on Desktop */}
      <div className="bg-[#0A0A0A] border border-white/[0.08] p-3 sm:px-4 sm:py-3 rounded-2xl shadow-xs space-y-3 sm:space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 font-black shadow-xs shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight leading-none">
                Team Roster
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-1 truncate">
                Official House Participants
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t border-white/[0.06] sm:border-t-0">
            <button
              onClick={() => refetchParticipants()}
              title="Refresh roster"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#121212] hover:bg-white/10 text-amber-300 border border-amber-500/30 hover:border-amber-400 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Bento Container */}
      <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl shadow-xl overflow-hidden space-y-0">
        {/* Table Toolbar */}
        <div className="p-3 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-[#121212]">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by contestant or chest code..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#0A0A0A] border border-white/[0.08] rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400/80 font-medium"
            />
          </div>

          <span className="font-mono text-xs font-black text-amber-300 bg-amber-400/15 px-3 py-1 rounded-xl border border-amber-400/30 shrink-0">
            {filtered.length} Enrolled
          </span>
        </div>

        {/* Mobile View: Dedicated Participant Cards (No clipped sideways table) */}
        <div className="md:hidden p-3 space-y-2">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              Loading team roster...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              No contestants found matching &quot;{search}&quot;.
            </div>
          ) : (
            filtered.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-xl bg-[#121212] border border-white/[0.06] space-y-1 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-amber-300 font-bold shrink-0">
                      {p.participant_code}
                    </span>
                    <h4 className="text-sm font-bold text-white truncate">
                      {p.user_name || p.name}
                    </h4>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 shrink-0">
                    • {p.status || 'Active'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5">
                  <span>{p.category_name}</span>
                  <span>•</span>
                  <span>{Number(p.individual_stage_count || 0)} Stage</span>
                  <span>•</span>
                  <span>{Number(p.individual_offstage_count || 0)} Off-Stage</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Sleek Bento Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] font-black uppercase tracking-wider text-slate-400 bg-[#121212]">
                <th className="py-3 px-4 font-bold w-32">Chest Code</th>
                <th className="py-3 px-4 font-bold">Participant Name</th>
                <th className="py-3 px-4 font-bold w-32 text-center">Division</th>
                <th className="py-3 px-4 font-bold w-40 text-center">Stage Programmes</th>
                <th className="py-3 px-4 font-bold w-40 text-center">Off-Stage Programmes</th>
                <th className="py-3 px-4 font-bold w-28 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Loading team roster...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No participants found matching &quot;{search}&quot;.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-[#121212]/50 transition-colors">
                    {/* Chest Code */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs text-amber-300 font-bold">
                        {p.participant_code}
                      </span>
                    </td>

                    {/* Participant Name */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white text-sm block">
                        {p.user_name || p.name}
                      </span>
                    </td>

                    {/* Category Division (Clean text, no pill box) */}
                    <td className="py-3.5 px-4 text-center text-slate-300 font-medium">
                      {p.category_name}
                    </td>

                    {/* Individual Stage Programmes Count (Clean numbers, no pill box) */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-white tabular-nums">
                        {Number(p.individual_stage_count || 0)}
                      </span>
                      <span className="text-slate-500 ml-1">events</span>
                    </td>

                    {/* Individual Off-Stage Programmes Count (Clean numbers, no pill box) */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-slate-300 tabular-nums">
                        {Number(p.individual_offstage_count || 0)}
                      </span>
                      <span className="text-slate-500 ml-1">events</span>
                    </td>

                    {/* Status (Clean dot indicator, no thick pill) */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-emerald-400 font-bold text-xs inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>{p.status || 'Active'}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
