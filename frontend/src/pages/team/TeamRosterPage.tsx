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
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Users className="w-7 h-7 text-[#0D472D]" />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Team Roster</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Student participants representing your house team in Esperanza 2026.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetchParticipants()}
            title="Refresh roster"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 hover:border-slate-800 shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Search and Counter Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by participant name or chest code..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D472D]/20 focus:border-[#0D472D] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="font-mono text-xs font-bold text-[#0D472D] bg-[#E6F4EA] px-3 py-1 rounded-full border border-emerald-200">
            {filtered.length} Enrolled
          </span>
        </div>
      </div>

      {/* 3. Modern Bento Roster Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                <th className="py-3.5 px-4 w-32">Chest Code</th>
                <th className="py-3.5 px-4">Participant Name</th>
                <th className="py-3.5 px-4 w-32 text-center">Division</th>
                <th className="py-3.5 px-4 w-40 text-center">Stage Programmes</th>
                <th className="py-3.5 px-4 w-40 text-center">Off-Stage Programmes</th>
                <th className="py-3.5 px-4 w-28 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
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
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Chest Code */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs text-[#0D472D] font-bold bg-[#E6F4EA] px-2.5 py-0.5 rounded-full border border-emerald-200/60 inline-block">
                        {p.participant_code}
                      </span>
                    </td>

                    {/* Participant Name */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 text-sm block">
                        {p.user_name || p.name}
                      </span>
                    </td>

                    {/* Category Division */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-900 border border-purple-200 inline-block">
                        {p.category_name}
                      </span>
                    </td>

                    {/* Individual Stage Programmes Count (Excluding General) */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono text-xs font-bold text-[#0D472D] bg-[#E6F4EA] px-3 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1.5">
                        <span className="text-sm font-black">{Number(p.individual_stage_count || 0)}</span>
                        <span className="text-[10px] font-normal text-emerald-800">events</span>
                      </span>
                    </td>

                    {/* Individual Off-Stage Programmes Count (Excluding General) */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 inline-flex items-center gap-1.5">
                        <span className="text-sm font-black">{Number(p.individual_offstage_count || 0)}</span>
                        <span className="text-[10px] font-normal text-blue-700">events</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block">
                        {p.status || 'ACTIVE'}
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
