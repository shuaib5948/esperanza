import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { ProgrammeStatusBadge } from '../../components/ui/ProgrammeStatusBadge.js';
import {
  ListOrdered,
  Search,
  Users,
  CheckCircle2,
  AlertCircle,
  Filter,
} from 'lucide-react';

interface Competition {
  id: string | number;
  name: string;
  competition_code?: string;
  programme_number?: string | number;
  programme_group_name?: string;
  group_name?: string;
  programme_group_code?: string;
  group_code?: string;
  competition_type_name?: string;
  competition_type?: string;
  status?: string;
  schedule_status?: string | null;
  registered_count?: number;
  published_results_count?: number;
}

interface Registration {
  id: string | number;
  competition_id: string | number;
  competition_name: string;
  programme_number?: string | number;
  programme_group?: string;
  competition_type?: string;
  participant_id: string | number;
  participant_name: string;
  participant_code: string;
  team_id: number | string;
  team_name: string;
  team_code: string;
  category_name?: string;
  status: string;
  registered_at?: string;
}

export const ProgrammeListPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [activeType, setActiveType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data: competitionsData, isLoading: isLoadingCompetitions } = useQuery({
    queryKey: ['competitions'],
    queryFn: () => api.get<Competition[]>('/competitions').then(res => res.data),
  });

  const { data: registrationsData, isLoading: isLoadingRegistrations } = useQuery({
    queryKey: ['registrations'],
    queryFn: () => api.get<Registration[]>('/registrations').then(res => res.data),
  });

  const competitions = competitionsData || [];
  const registrations = registrationsData || [];

  const processedData = useMemo(() => {
    const assignedRegs = registrations.filter(r => r.status === 'ASSIGNED');
    const compMap = new Map<string | number, { diraya: Registration[], rivaya: Registration[] }>();

    competitions.forEach(c => {
      compMap.set(c.id, { diraya: [], rivaya: [] });
    });

    assignedRegs.forEach(reg => {
      const isDiraya = reg.team_id === 1 || reg.team_code === 'DIRAYA' || reg.team_name?.toUpperCase() === 'DIRAYA';
      const isRivaya = reg.team_id === 2 || reg.team_code === 'RIVAYA' || reg.team_name?.toUpperCase() === 'RIVAYA';
      
      const compEntry = compMap.get(reg.competition_id);
      if (compEntry) {
        if (isDiraya) compEntry.diraya.push(reg);
        if (isRivaya) compEntry.rivaya.push(reg);
      }
    });

    const enrichedComps = competitions.map(c => {
      const entry = compMap.get(c.id) || { diraya: [], rivaya: [] };
      return {
        ...c,
        diraya: entry.diraya,
        rivaya: entry.rivaya,
        totalAssigned: entry.diraya.length + entry.rivaya.length,
      };
    });

    // Filtering
    let filtered = enrichedComps;

    if (activeCategory !== 'ALL') {
      filtered = filtered.filter(c => {
        const group = (c.programme_group_name || c.group_name || '').toUpperCase();
        return group.includes(activeCategory);
      });
    }

    if (activeType !== 'ALL') {
      filtered = filtered.filter(c => {
        const type = (c.competition_type_name || c.competition_type || '').toUpperCase();
        return type.includes(activeType);
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => {
        return (
          c.name.toLowerCase().includes(q) ||
          (c.competition_code && c.competition_code.toLowerCase().includes(q)) ||
          (c.programme_number && String(c.programme_number).toLowerCase().includes(q)) ||
          c.diraya.some(p => p.participant_name.toLowerCase().includes(q)) ||
          c.rivaya.some(p => p.participant_name.toLowerCase().includes(q))
        );
      });
    }

    // Sort by programme_number
    filtered.sort((a, b) => {
      const numA = Number(a.programme_number) || 0;
      const numB = Number(b.programme_number) || 0;
      return numA - numB;
    });

    return {
      items: filtered,
      totalComps: competitions.length,
      totalAssigned: assignedRegs.length,
      dirayaCoverage: competitions.filter(c => (compMap.get(c.id)?.diraya.length || 0) > 0).length,
      rivayaCoverage: competitions.filter(c => (compMap.get(c.id)?.rivaya.length || 0) > 0).length,
    };
  }, [competitions, registrations, activeCategory, activeType, searchQuery]);

  const categories = ['ALL', 'J1', 'J2', 'JUNIOR', 'SENIOR', 'GENERAL'];
  const types = ['ALL', 'STAGE', 'OFF_STAGE', 'GENERAL'];

  const isLoading = isLoadingCompetitions || isLoadingRegistrations;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <ListOrdered className="w-6 h-6 text-amber-300" />
          Programme List & Team Assignments
        </h1>
        <p className="text-sm text-amber-200/60 mt-1">
          Complete overview of all 60 competition programmes with team participant assignments.
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-[#0A0A0A]/90 border-amber-500/30 p-3.5 sm:p-4 rounded-xl flex flex-col gap-1 backdrop-blur-sm">
          <span className="text-[10px] sm:text-xs font-semibold text-amber-200/60 uppercase tracking-wider">Total Programmes</span>
          <span className="text-xl sm:text-2xl font-bold text-slate-100">{processedData.totalComps}</span>
        </Card>
        <Card className="bg-[#0A0A0A]/90 border-amber-500/30 p-3.5 sm:p-4 rounded-xl flex flex-col gap-1 backdrop-blur-sm">
          <span className="text-[10px] sm:text-xs font-semibold text-amber-200/60 uppercase tracking-wider">Total Assignments</span>
          <span className="text-xl sm:text-2xl font-bold text-slate-100">{processedData.totalAssigned}</span>
        </Card>
        <Card className="bg-[#0A0A0A]/90 border-amber-500/30 p-3.5 sm:p-4 rounded-xl flex flex-col gap-1 backdrop-blur-sm">
          <span className="text-[10px] sm:text-xs font-semibold text-amber-200/60 uppercase tracking-wider">Diraya Coverage</span>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-100">{processedData.dirayaCoverage}</span>
            <span className="text-[11px] sm:text-xs text-amber-200/60">/{processedData.totalComps}</span>
          </div>
        </Card>
        <Card className="bg-[#0A0A0A]/90 border-amber-500/30 p-3.5 sm:p-4 rounded-xl flex flex-col gap-1 backdrop-blur-sm">
          <span className="text-[10px] sm:text-xs font-semibold text-amber-200/60 uppercase tracking-wider">Rivaya Coverage</span>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-100">{processedData.rivayaCoverage}</span>
            <span className="text-[11px] sm:text-xs text-amber-200/60">/{processedData.totalComps}</span>
          </div>
        </Card>
      </div>

      {/* Filters (Single Line) */}
      <Card className="bg-[#0A0A0A]/90 border-amber-500/30 p-3 rounded-xl backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-[#0A0A0A] text-amber-200/60 hover:text-white hover:bg-[#0A0A0A]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Right Controls: Type Selector & Search */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-2 bg-[#121212] border border-white/[0.08] rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-amber-200/60 shrink-0" />
              <select
                value={activeType}
                onChange={(e) => setActiveType(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer pr-1"
              >
                {types.map((t) => (
                  <option key={t} value={t} className="bg-[#121212] text-slate-200">
                    {t === 'ALL' ? 'ALL TYPES' : t}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-amber-200/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search programmes or participants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#121212] border border-white/[0.08] rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 placeholder-slate-500"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Programme Cards */}
      {isLoading ? (
        <Card className="bg-[#0A0A0A]/90 border-amber-500/30 rounded-xl p-8">
          <div className="text-center text-amber-200/60">Loading data...</div>
        </Card>
      ) : processedData.items.length === 0 ? (
        <Card className="bg-[#0A0A0A]/90 border-amber-500/30 rounded-xl p-8">
          <div className="flex flex-col items-center justify-center space-y-3">
            <Users className="w-12 h-12 text-amber-200" />
            <p className="text-amber-200/60 font-medium">No programmes found matching the filters.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {processedData.items.map((item) => {
            const typeName = (item.competition_type_name || item.competition_type || '').toUpperCase();
            const isStage = typeName.includes('STAGE') && !typeName.includes('OFF_STAGE');

            return (
              <div
                key={item.id}
                className="bg-[#0A0A0A]/90 border border-white/[0.08] rounded-xl overflow-hidden transition-all hover:border-amber-500/30"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#0A0A0A] border-b border-white/[0.08]">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-lg font-black text-amber-300 shrink-0">
                      {item.programme_number || '—'}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-white truncate">{item.name}</h3>
                      {item.competition_code && (
                        <span className="font-mono text-[10px] text-amber-200/60">{item.competition_code}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <ProgrammeStatusBadge competition={item} />
                  </div>
                </div>

                {/* Card Body — Two-column team layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.04]">
                  {/* Team Diraya */}
                  <div className="p-3.5 border-l-[3px] border-l-emerald-500/60">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <div className="w-2 h-2 rounded-full bg-[#00E676]"></div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                        Diraya
                      </span>
                      <span className="text-[10px] text-amber-200/60 ml-auto">
                        {item.diraya.length} assigned
                      </span>
                    </div>
                    {item.diraya.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        {item.diraya.map((p, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 bg-[#121212] border border-white/[0.08] rounded-lg px-2.5 py-1.5"
                          >
                            <span className="font-mono text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold shrink-0">
                              {p.participant_code}
                            </span>
                            <span className="text-xs font-semibold text-slate-200 truncate">
                              {p.participant_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-3 text-xs text-amber-200/60 italic">
                        No participants assigned
                      </div>
                    )}
                  </div>

                  {/* Team Rivaya */}
                  <div className="p-3.5 border-r-[3px] border-r-rose-500/60">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <div className="w-2 h-2 rounded-full bg-[#FF2A6D]"></div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-rose-300">
                        Rivaya
                      </span>
                      <span className="text-[10px] text-amber-200/60 ml-auto">
                        {item.rivaya.length} assigned
                      </span>
                    </div>
                    {item.rivaya.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        {item.rivaya.map((p, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 bg-[#121212] border border-white/[0.08] rounded-lg px-2.5 py-1.5"
                          >
                            <span className="font-mono text-[10px] bg-rose-500/15 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-bold shrink-0">
                              {p.participant_code}
                            </span>
                            <span className="text-xs font-semibold text-slate-200 truncate">
                              {p.participant_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-3 text-xs text-amber-200/60 italic">
                        No participants assigned
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
