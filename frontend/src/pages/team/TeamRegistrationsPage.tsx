import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import {
  ClipboardList,
  Search,
  CheckCircle2,
  AlertCircle,
  Lock,
  XCircle,
  Filter,
  UserCheck,
  UserPlus,
  Sparkles,
  Info,
  Users,
  RefreshCw,
  X,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal.js';

interface RegistrationItem {
  id: number;
  competition_id: number;
  competition_name: string;
  competition_code: string;
  programme_number: number;
  programme_group: string;
  competition_type: string;
  participant_id: number;
  participant_name: string;
  participant_code: string;
  registration_number?: string;
  team_id: number;
  team_name: string;
  team_code: string;
  category_name: string;
  status: string;
  registered_at: string;
}

interface ParticipantItem {
  id: number;
  participant_code: string;
  name?: string;
  user_name?: string;
  email: string;
  category_id?: number;
  category_name: string;
  category_code: string;
  status: string;
}

interface CompetitionItem {
  id: number;
  name: string;
  competition_code: string;
  programme_number: number;
  programme_group_name?: string;
  programme_group_code?: string;
  group_name?: string;
  group_code?: string;
  competition_type_name?: string;
  competition_type?: string;
  participation_type?: 'INDIVIDUAL' | 'GROUP' | string;
  max_participants?: number;
  max_entries_per_team?: number;
  status: string;
  registered_count?: number;
}

export const TeamRegistrationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  // Filters
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // Modals state
  const [selectedCompForAssign, setSelectedCompForAssign] = useState<CompetitionItem | null>(null);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<number[]>([]);
  const [regToRemove, setRegToRemove] = useState<RegistrationItem | null>(null);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState<boolean>(false);

  // 1. Fetch all 60 competitions
  const {
    data: competitions = [],
    isLoading: compLoading,
    refetch: refetchCompetitions,
  } = useQuery<CompetitionItem[]>({
    queryKey: ['competitions-all'],
    queryFn: async () => {
      const res = await api.get<CompetitionItem[]>('/competitions');
      return res.data;
    },
  });

  // 2. Fetch team participants (backend isolates to own team)
  const { data: participantsResponse, isLoading: partLoading } = useQuery<any>({
    queryKey: ['team-roster'],
    queryFn: async () => {
      const res = await api.get<any>('/participants');
      return res.data;
    },
  });

  const participants: ParticipantItem[] = useMemo(() => {
    if (!participantsResponse) return [];
    if (Array.isArray(participantsResponse)) return participantsResponse;
    if (Array.isArray(participantsResponse.participants)) return participantsResponse.participants;
    if (Array.isArray(participantsResponse.data)) return participantsResponse.data;
    return [];
  }, [participantsResponse]);

  // 3. Fetch team registrations (automatically filtered to this team)
  const {
    data: registrations = [],
    isLoading: regLoading,
    refetch: refetchRegistrations,
  } = useQuery<RegistrationItem[]>({
    queryKey: ['team-registrations'],
    queryFn: async () => {
      const res = await api.get<RegistrationItem[]>('/registrations');
      return res.data;
    },
  });

  const handleRefreshAll = () => {
    refetchCompetitions();
    refetchRegistrations();
  };

  // 4. Map active registrations by competition_id (Supporting multiple participants per competition)
  const assignedMap = useMemo(() => {
    const map = new Map<number, RegistrationItem[]>();
    for (const r of registrations) {
      if (r.status === 'ASSIGNED') {
        const list = map.get(r.competition_id) || [];
        list.push(r);
        map.set(r.competition_id, list);
      }
    }
    return map;
  }, [registrations]);

  // Helper: check if a participant category is eligible for a competition group
  const isCategoryEligibleForGroup = (participantCategory: string, competitionGroup: string): boolean => {
    const cat = (participantCategory || '').toUpperCase();
    const grp = (competitionGroup || '').toUpperCase();

    if (grp === 'GENERAL' || grp === 'GEN') return true;
    if (grp === 'J1') return cat === 'J1';
    if (grp === 'J2') return cat === 'J2';
    if (grp === 'JUNIOR' || grp === 'JUN') return cat === 'J1' || cat === 'J2';
    if (grp === 'SENIOR' || grp === 'SEN') return cat === 'SENIOR' || cat === 'SEN';
    return false;
  };

  // 5. Eligible participants for selected modal competition
  const eligibleParticipants = useMemo(() => {
    if (!selectedCompForAssign) return [];
    const grp = (
      selectedCompForAssign.programme_group_name ||
      selectedCompForAssign.group_name ||
      selectedCompForAssign.programme_group_code ||
      ''
    ).toUpperCase();

    // Already assigned participant IDs for this specific competition
    const alreadyAssigned = assignedMap.get(selectedCompForAssign.id) || [];
    const assignedIds = new Set(alreadyAssigned.map((a) => a.participant_id));

    // Base filter by category eligibility
    return participants.filter((p) => {
      // Exclude participants already enrolled in this exact competition
      if (assignedIds.has(p.id)) return false;

      const cat = p.category_name || p.category_code || '';
      return isCategoryEligibleForGroup(cat, grp);
    });
  }, [selectedCompForAssign, participants, assignedMap]);

  // 6. Metrics Calculations
  const metrics = useMemo(() => {
    const total = competitions.length;
    let assignedEventsCount = 0;
    let totalAssignedEntries = 0;
    let lockedCount = 0;

    for (const c of competitions) {
      const list = assignedMap.get(c.id) || [];
      if (list.length > 0) {
        assignedEventsCount++;
        totalAssignedEntries += list.length;
      }
      if (c.status !== 'ACTIVE') lockedCount++;
    }

    return {
      total,
      assignedEventsCount,
      totalAssignedEntries,
      vacantEventsCount: Math.max(0, total - assignedEventsCount),
      lockedCount,
    };
  }, [competitions, assignedMap]);

  // Group breakdown counts
  const groupStats = useMemo(() => {
    const groups = ['J1', 'J2', 'JUNIOR', 'SENIOR', 'GENERAL'];
    const stats: Record<string, { total: number; assignedEvents: number; totalEntries: number }> = {};

    for (const g of groups) {
      stats[g] = { total: 0, assignedEvents: 0, totalEntries: 0 };
    }

    for (const c of competitions) {
      const grp = (c.programme_group_name || c.group_name || c.programme_group_code || '').toUpperCase();
      const match = groups.find(
        (g) =>
          g === grp ||
          (g === 'JUNIOR' && grp === 'JUN') ||
          (g === 'SENIOR' && grp === 'SEN') ||
          (g === 'GENERAL' && grp === 'GEN')
      );
      if (match) {
        stats[match].total++;
        const list = assignedMap.get(c.id) || [];
        if (list.length > 0) {
          stats[match].assignedEvents++;
          stats[match].totalEntries += list.length;
        }
      }
    }

    return stats;
  }, [competitions, assignedMap]);

  // 7. Filtered Competitions List
  const filteredCompetitions = useMemo(() => {
    return competitions
      .filter((c) => {
        // Group filter
        if (selectedGroup !== 'ALL') {
          const grp = (c.programme_group_name || c.group_name || c.programme_group_code || '').toUpperCase();
          const target = selectedGroup.toUpperCase();
          const matches =
            grp === target ||
            (target === 'JUNIOR' && grp === 'JUN') ||
            (target === 'SENIOR' && grp === 'SEN') ||
            (target === 'GENERAL' && grp === 'GEN');
          if (!matches) return false;
        }

        // Search filter
        if (search.trim()) {
          const q = search.toLowerCase();
          const compCode = (c.competition_code || '').toLowerCase();
          const compName = c.name.toLowerCase();
          const progNum = String(c.programme_number);

          const list = assignedMap.get(c.id) || [];
          const matchesComp = compName.includes(q) || compCode.includes(q) || progNum.includes(q);
          const matchesParticipant = list.some(
            (a) =>
              a.participant_name.toLowerCase().includes(q) ||
              a.participant_code.toLowerCase().includes(q)
          );

          if (!matchesComp && !matchesParticipant) return false;
        }

        return true;
      })
      .sort((a, b) => a.programme_number - b.programme_number);
  }, [competitions, assignedMap, selectedGroup, search]);

  // 8. Mutations
  const assignMutation = useMutation({
    mutationFn: async ({
      competitionId,
      participantIds,
    }: {
      competitionId: number;
      participantIds: number[];
    }) => {
      const comp = competitions.find((c) => c.id === competitionId);
      const isGroup = comp?.participation_type === 'GROUP';

      if (isGroup) {
        return await api.post(`/team-leader/competitions/${competitionId}/entries`, {
          participantIds,
        });
      } else {
        // Individual competition: enroll all selected participants as individual entries
        return await Promise.all(
          participantIds.map(async (pId) => {
            try {
              return await api.post(`/team-leader/competitions/${competitionId}/entries`, {
                participantIds: [pId],
              });
            } catch (err) {
              return await api.post('/registrations', {
                competition_id: competitionId,
                participant_id: pId,
              });
            }
          })
        );
      }
    },
    onSuccess: () => {
      success('Contestant entries successfully enrolled!');
      setSelectedCompForAssign(null);
      setSelectedParticipantIds([]);
      queryClient.invalidateQueries({ queryKey: ['team-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['team-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['competitions-all'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to submit entry');
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (regId: number) => {
      return api.post(`/registrations/${regId}/cancel`);
    },
    onSuccess: () => {
      success('Contestant removed from competition.');
      setIsRemoveModalOpen(false);
      setRegToRemove(null);
      queryClient.invalidateQueries({ queryKey: ['team-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['team-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['competitions-all'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to remove assignment');
    },
  });

  // Modal handlers
  const handleOpenAssign = (comp: CompetitionItem) => {
    setSelectedCompForAssign(comp);
    setSelectedParticipantIds([]);
  };

  const toggleParticipantSelection = (id: number) => {
    if (!selectedCompForAssign) return;
    const isGroup = selectedCompForAssign.participation_type === 'GROUP';
    const isUnlimited =
      selectedCompForAssign.max_entries_per_team === null || selectedCompForAssign.max_entries_per_team === undefined;
    const maxEntriesAllowed = selectedCompForAssign.max_entries_per_team;
    const assignedList = assignedMap.get(selectedCompForAssign.id) || [];
    const remainingSlots = isUnlimited
      ? 999
      : Math.max(0, (maxEntriesAllowed || 1) - assignedList.length);

    const maxGroupMembers = selectedCompForAssign.max_participants || (isGroup ? 4 : 1);

    if (selectedParticipantIds.includes(id)) {
      setSelectedParticipantIds(selectedParticipantIds.filter((pId) => pId !== id));
    } else {
      if (isGroup) {
        if (selectedParticipantIds.length >= maxGroupMembers) {
          error(`Maximum limit of ${maxGroupMembers} participants reached for this group entry.`);
          return;
        }
      } else {
        if (!isUnlimited && selectedParticipantIds.length >= remainingSlots) {
          error(`Maximum ${remainingSlots} ${remainingSlots === 1 ? 'entry' : 'entries'} remaining for this competition.`);
          return;
        }
      }
      setSelectedParticipantIds([...selectedParticipantIds, id]);
    }
  };

  const handleSelectAllEligible = () => {
    if (!selectedCompForAssign) return;
    const isGroup = selectedCompForAssign.participation_type === 'GROUP';
    const isUnlimited =
      selectedCompForAssign.max_entries_per_team === null || selectedCompForAssign.max_entries_per_team === undefined;
    const maxEntriesAllowed = selectedCompForAssign.max_entries_per_team;
    const assignedList = assignedMap.get(selectedCompForAssign.id) || [];
    const remainingSlots = isUnlimited
      ? eligibleParticipants.length
      : Math.max(0, (maxEntriesAllowed || 1) - assignedList.length);
    const maxLimit = isGroup
      ? (selectedCompForAssign.max_participants || 4)
      : remainingSlots;

    const availableIds = eligibleParticipants.slice(0, maxLimit).map((p) => p.id);
    setSelectedParticipantIds(availableIds);
  };

  const handleSubmitAssignment = () => {
    if (!selectedCompForAssign) return;
    if (selectedParticipantIds.length === 0) {
      error('Please select at least one contestant.');
      return;
    }

    const isGroup = selectedCompForAssign.participation_type === 'GROUP';
    if (isGroup && selectedParticipantIds.length < 2) {
      error('Group events require at least 2 participants.');
      return;
    }

    assignMutation.mutate({
      competitionId: selectedCompForAssign.id,
      participantIds: selectedParticipantIds,
    });
  };

  const isLocked = (comp: CompetitionItem) => comp.status !== 'ACTIVE';

  return (
    <div className="space-y-6">
      {/* 1. Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-7 h-7 text-[#0D472D]" />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              Competition Registrations
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official 60-programme entry matrix. Stage items permit up to <strong>2 contestants</strong> per house; off-stage items support <strong>unlimited entries</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefreshAll}
            title="Refresh registrations"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 hover:border-slate-800 shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Category Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedGroup('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              selectedGroup === 'ALL'
                ? 'bg-[#0D472D] text-white border-[#0D472D] shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>All (60)</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                selectedGroup === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {metrics.assignedEventsCount}/60
            </span>
          </button>

          {['J1', 'J2', 'JUNIOR', 'SENIOR', 'GENERAL'].map((grp) => {
            const st = groupStats[grp] || { total: 0, assignedEvents: 0, totalEntries: 0 };
            const isActive = selectedGroup === grp;
            return (
              <button
                key={grp}
                onClick={() => setSelectedGroup(grp)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-[#0D472D] text-white border-[#0D472D] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{grp}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : st.assignedEvents === st.total && st.total > 0
                      ? 'bg-[#E6F4EA] text-[#0D472D]'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {st.assignedEvents}/{st.total}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input on the Right */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search programme or contestant name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D472D]/20 focus:border-[#0D472D] transition-all"
          />
        </div>
      </div>

      {/* 4. Programmes Cards Grid (2 in a Row Grid) */}
      {compLoading || regLoading || partLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs font-medium">
          Loading competition entries matrix...
        </div>
      ) : filteredCompetitions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
            <ClipboardList className="w-6 h-6" />
          </div>
          <p className="font-bold text-slate-800 text-sm">No programmes found matching the selected filter criteria.</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your category division or status filter chips above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCompetitions.map((comp) => {
            const assignedList = assignedMap.get(comp.id) || [];
            const locked = isLocked(comp);
            const isGroup = comp.participation_type === 'GROUP';
            const isUnlimited =
              comp.max_entries_per_team === null || comp.max_entries_per_team === undefined;
            const maxEntries = comp.max_entries_per_team;
            const canAddMore = isUnlimited
              ? true
              : isGroup
              ? assignedList.length === 0 || (typeof maxEntries === 'number' && maxEntries > 1)
              : assignedList.length < (maxEntries || 1);

            const groupName =
              comp.programme_group_name ||
              comp.group_name ||
              comp.programme_group_code ||
              'General';

            const hasEntries = assignedList.length > 0;

            return (
              <div
                key={comp.id}
                className="bg-white border border-slate-200 hover:border-slate-800 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-3">
                  {/* Header: Badges & Status */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Division Badge */}
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
                        {groupName}
                      </span>

                      {/* Participation Type */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          isGroup
                            ? 'bg-purple-50 text-purple-900 border-purple-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {isGroup ? 'Group Item' : 'Individual'}
                      </span>

                      {/* Item Type */}
                      <span className="text-xs text-slate-500 font-medium">
                        {comp.competition_type_name || comp.competition_type || 'General'}
                      </span>
                    </div>

                    {/* Reg Status Badge */}
                    {locked ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-500" />
                        <span>Locked</span>
                      </span>
                    ) : hasEntries ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Enrolled</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
                        <span>Vacant</span>
                      </span>
                    )}
                  </div>

                  {/* Programme Name & Code */}
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-xs font-bold text-[#0D472D] bg-[#E6F4EA] px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
                        {comp.competition_code || `P-${comp.programme_number}`}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 group-hover:text-[#0D472D] transition-colors leading-snug">
                        {comp.name}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">
                      {isUnlimited
                        ? 'Unlimited entries allowed'
                        : isGroup
                        ? `1 Team (${comp.max_participants || 4} contestants per house)`
                        : `Max ${maxEntries || 1} contestant entry per house`}
                    </p>
                  </div>

                  {/* Enrolled Contestants Box */}
                  <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Assigned House Contestants ({assignedList.length})
                    </span>

                    {assignedList.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        No contestants enrolled for this programme yet.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {assignedList.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-full text-xs shadow-2xs"
                          >
                            <span className="font-mono text-[10px] font-bold text-[#0D472D] bg-[#E6F4EA] px-1.5 py-0.2 rounded-full border border-emerald-200">
                              {r.participant_code}
                            </span>
                            <span className="font-semibold text-slate-800 truncate max-w-[140px]">
                              {r.participant_name}
                            </span>
                            {!locked && (
                              <button
                                onClick={() => {
                                  setRegToRemove(r);
                                  setIsRemoveModalOpen(true);
                                }}
                                className="p-0.5 text-slate-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Remove participant"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Summary & Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 font-medium">
                    {assignedList.length > 0 ? (
                      <span className="font-bold text-[#0D472D]">
                        {assignedList.length} {assignedList.length === 1 ? 'contestant' : 'contestants'} enrolled
                      </span>
                    ) : (
                      <span className="text-slate-400">Entry slot open</span>
                    )}
                  </span>

                  <div>
                    {locked ? (
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Locked</span>
                      </span>
                    ) : canAddMore ? (
                      <button
                        onClick={() => handleOpenAssign(comp)}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#0D472D] hover:bg-[#07321e] text-white text-xs font-bold shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{assignedList.length > 0 ? '+ Add More' : '+ Enroll Contestant'}</span>
                      </button>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        Full
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. MODAL: Assign / Enroll Contestant */}
      {selectedCompForAssign && (
        <Modal
          isOpen={!!selectedCompForAssign}
          onClose={() => {
            setSelectedCompForAssign(null);
            setSelectedParticipantIds([]);
          }}
          title={`Enroll Contestants: ${selectedCompForAssign.name}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Programme Meta Header */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-[#0D472D] bg-[#E6F4EA] px-2 py-0.5 rounded-full border border-emerald-200">
                  {selectedCompForAssign.competition_code || `P-${selectedCompForAssign.programme_number}`}
                </span>
                <span className="font-bold text-slate-900 ml-2 text-sm">
                  {selectedCompForAssign.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
                  {selectedCompForAssign.programme_group_name || selectedCompForAssign.group_name || 'General'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-200">
                  {selectedCompForAssign.participation_type === 'GROUP' ? 'Group' : 'Individual'}
                </span>
              </div>
            </div>

            {/* Selection Guidance & Quick Select Actions */}
            <div className="flex items-center justify-between text-slate-600 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-xs">
                  Select contestants ({eligibleParticipants.length} eligible):
                </p>
                {eligibleParticipants.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSelectAllEligible}
                      className="text-[11px] font-bold text-[#0D472D] hover:underline cursor-pointer"
                    >
                      Select Max
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedParticipantIds([])}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
              <span className="font-mono text-[11px] font-bold text-[#0D472D] bg-[#E6F4EA] px-2.5 py-0.5 rounded-full border border-emerald-200">
                Selected: {selectedParticipantIds.length}
                {selectedCompForAssign.participation_type === 'GROUP'
                  ? ` / max ${selectedCompForAssign.max_participants || 4}`
                  : selectedCompForAssign.max_entries_per_team
                  ? ` / max ${selectedCompForAssign.max_entries_per_team}`
                  : ' (Unlimited)'}
              </span>
            </div>

            {/* Eligible Contestants List */}
            {eligibleParticipants.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-400">
                <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-700 text-xs">
                  No eligible participants available for division &quot;
                  {selectedCompForAssign.programme_group_name || selectedCompForAssign.group_name || 'General'}
                  &quot;.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Make sure student members are added to your Team Roster under this category.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                {eligibleParticipants.map((p) => {
                  const isSelected = selectedParticipantIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleParticipantSelection(p.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#E6F4EA] border-emerald-300 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Handled by div click
                          className="w-4 h-4 text-[#0D472D] rounded border-slate-300 focus:ring-[#0D472D] cursor-pointer"
                        />
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">
                            {p.user_name || p.name}
                          </span>
                          <span className="text-[10px] text-slate-500">{p.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-[#0D472D] bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                          {p.participant_code}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {p.category_name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedCompForAssign(null);
                  setSelectedParticipantIds([]);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={assignMutation.isPending || selectedParticipantIds.length === 0}
                onClick={handleSubmitAssignment}
                className="px-5 py-2 rounded-full bg-[#0D472D] hover:bg-[#07321e] text-white font-bold text-xs shadow-xs transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
              >
                {assignMutation.isPending
                  ? 'Enrolling...'
                  : selectedParticipantIds.length > 1
                  ? `Confirm Enrollment (${selectedParticipantIds.length} Contestants)`
                  : 'Confirm Enrollment'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. MODAL: Cancel / Remove Assignment */}
      {regToRemove && (
        <Modal
          isOpen={isRemoveModalOpen}
          onClose={() => {
            setIsRemoveModalOpen(false);
            setRegToRemove(null);
          }}
          title="Remove Contestant Entry"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
              <p className="leading-relaxed font-semibold">
                This will unregister the contestant from this competition and free the slot for another team member.
              </p>
            </div>

            <p className="text-slate-600">
              Are you sure you want to remove{' '}
              <strong className="text-slate-900">{regToRemove.participant_name}</strong> (
              {regToRemove.participant_code}) from{' '}
              <strong className="text-slate-900">{regToRemove.competition_name}</strong>?
            </p>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                onClick={() => {
                  setIsRemoveModalOpen(false);
                  setRegToRemove(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={removeMutation.isPending}
                className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
                onClick={() => removeMutation.mutate(regToRemove.id)}
              >
                {removeMutation.isPending ? 'Removing...' : 'Remove Entry'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
