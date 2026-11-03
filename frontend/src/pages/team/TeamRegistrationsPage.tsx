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
import { THEME } from '../../theme/theme.js';

export const formatProgTitle = (name?: string, group?: string) => {
  if (!name) return 'Programme Evaluation';
  if (!group) return name;
  const trimmedName = name.trim();
  const trimmedGroup = group.trim();
  if (
    trimmedName.toLowerCase().startsWith(trimmedGroup.toLowerCase()) ||
    trimmedName.toLowerCase().includes(`(${trimmedGroup.toLowerCase()})`) ||
    trimmedName.toLowerCase().endsWith(`- ${trimmedGroup.toLowerCase()}`)
  ) {
    return trimmedName;
  }
  return `${trimmedGroup} - ${trimmedName}`;
};

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
    const isGroup = (selectedCompForAssign.participation_type || '').toUpperCase() === 'GROUP';
    const isUnlimited =
      selectedCompForAssign.max_entries_per_team === null || selectedCompForAssign.max_entries_per_team === undefined;
    const maxEntriesAllowed = selectedCompForAssign.max_entries_per_team;
    const assignedList = assignedMap.get(selectedCompForAssign.id) || [];
    const maxGroupMembers = selectedCompForAssign.max_participants || (isGroup ? 4 : 1);

    const totalAllowed = isUnlimited
      ? 999
      : isGroup
      ? (maxEntriesAllowed || 1) * maxGroupMembers
      : (maxEntriesAllowed || 1);

    const remainingSlots = Math.max(0, totalAllowed - assignedList.length);

    if (selectedParticipantIds.includes(id)) {
      setSelectedParticipantIds(selectedParticipantIds.filter((pId) => pId !== id));
    } else {
      if (selectedParticipantIds.length >= remainingSlots) {
        error(
          isGroup
            ? `Cannot select more than ${remainingSlots} participant${remainingSlots === 1 ? '' : 's'}. Maximum limit is ${maxGroupMembers} participants per group.`
            : `Maximum ${remainingSlots} ${remainingSlots === 1 ? 'entry' : 'entries'} remaining for this competition.`
        );
        return;
      }
      setSelectedParticipantIds([...selectedParticipantIds, id]);
    }
  };

  const handleSelectAllEligible = () => {
    if (!selectedCompForAssign) return;
    const isGroup = (selectedCompForAssign.participation_type || '').toUpperCase() === 'GROUP';
    const isUnlimited =
      selectedCompForAssign.max_entries_per_team === null || selectedCompForAssign.max_entries_per_team === undefined;
    const maxEntriesAllowed = selectedCompForAssign.max_entries_per_team;
    const assignedList = assignedMap.get(selectedCompForAssign.id) || [];
    const maxGroupMembers = selectedCompForAssign.max_participants || (isGroup ? 4 : 1);

    const totalAllowed = isUnlimited
      ? eligibleParticipants.length
      : isGroup
      ? (maxEntriesAllowed || 1) * maxGroupMembers
      : (maxEntriesAllowed || 1);

    const remainingSlots = Math.max(0, totalAllowed - assignedList.length);
    const availableIds = eligibleParticipants.slice(0, remainingSlots).map((p) => p.id);
    setSelectedParticipantIds(availableIds);
  };

  const handleSubmitAssignment = () => {
    if (!selectedCompForAssign) return;
    if (selectedParticipantIds.length === 0) {
      error('Please select at least one contestant.');
      return;
    }

    const isGroup = (selectedCompForAssign.participation_type || '').toUpperCase() === 'GROUP';
    const assignedList = assignedMap.get(selectedCompForAssign.id) || [];

    // For brand new group registration (when 0 members are currently enrolled), enforce min 2 participants
    if (isGroup && assignedList.length === 0 && selectedParticipantIds.length < 2) {
      error('Group events require at least 2 participants for initial enrollment.');
      return;
    }

    assignMutation.mutate({
      competitionId: selectedCompForAssign.id,
      participantIds: selectedParticipantIds,
    });
  };

  const isLocked = (comp: CompetitionItem) => comp.status !== 'ACTIVE';

  return (
    <div className="space-y-4">
      {/* 1. Page Header Banner: Two-Tier on Mobile, Sleek Bento on Desktop */}
      <div className="bg-[#0A0A0A] border border-white/[0.08] p-3 sm:px-4 sm:py-3 rounded-2xl shadow-xs space-y-3 sm:space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 font-black shadow-xs shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight leading-none">
                Competition Registrations
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-1 truncate">
                60-Programme Entry Matrix
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t border-white/[0.06] sm:border-t-0">
            <button
              onClick={handleRefreshAll}
              title="Refresh registrations"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#121212] hover:bg-white/10 text-amber-300 border border-amber-500/30 hover:border-amber-400 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Category Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center bg-[#0A0A0A] border border-white/[0.08] p-3 rounded-2xl shadow-xs">
        {/* Category Tabs: Horizontally swipeable on mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedGroup('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
              selectedGroup === 'ALL'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black border-amber-400 shadow-xs'
                : 'bg-[#121212] text-slate-400 border-white/[0.08] hover:text-white hover:bg-white/5'
            }`}
          >
            <span>All (60)</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                selectedGroup === 'ALL' ? 'bg-black/15 text-slate-950 font-black' : 'bg-[#0A0A0A] text-amber-300'
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black border-amber-400 shadow-xs'
                    : 'bg-[#121212] text-slate-400 border-white/[0.08] hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{grp}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-black/15 text-slate-950 font-black'
                      : st.assignedEvents === st.total && st.total > 0
                      ? 'bg-amber-400/15 text-amber-300 font-bold'
                      : 'bg-[#0A0A0A] text-slate-400'
                  }`}
                >
                  {st.assignedEvents}/{st.total}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input on the Right */}
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search programme or contestant..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#121212] border border-white/[0.08] rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400/80 font-medium transition-all"
          />
        </div>
      </div>

      {/* 4. Programmes Cards Grid (2 in a Row Grid) */}
      {compLoading || regLoading || partLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs font-medium">
          Loading entries...
        </div>
      ) : filteredCompetitions.length === 0 ? (
        <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl shadow-xl p-12 text-center space-y-2 shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#121212] border border-white/[0.08] flex items-center justify-center text-slate-400">
            <ClipboardList className="w-6 h-6" />
          </div>
          <p className="font-bold text-white text-sm">No programmes found.</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try adjusting your search or category filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCompetitions.map((comp) => {
            const assignedList = assignedMap.get(comp.id) || [];
            const locked = isLocked(comp);
            const isGroup = (comp.participation_type || '').toUpperCase() === 'GROUP';
            const isUnlimited =
              comp.max_entries_per_team === null || comp.max_entries_per_team === undefined;
            const maxEntries = comp.max_entries_per_team;
            const maxGroupMembers = comp.max_participants || (isGroup ? 4 : 1);

            const totalSlotsAllowed = isUnlimited
              ? Infinity
              : isGroup
              ? (maxEntries || 1) * maxGroupMembers
              : (maxEntries || 1);

            const canAddMore = assignedList.length < totalSlotsAllowed;

            const groupName =
              comp.programme_group_name ||
              comp.group_name ||
              comp.programme_group_code ||
              'General';

            const hasEntries = assignedList.length > 0;

            return (
              <div
                key={comp.id}
                className="bg-[#0A0A0A] border border-white/[0.08] hover:border-amber-400/40 rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-2">
                  {/* Top Row: Title & Clean Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm sm:text-base font-black text-white group-hover:text-amber-300 transition-colors leading-tight">
                        {formatProgTitle(comp.name, groupName)}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {isGroup
                          ? `Group Event (${maxGroupMembers} per group)`
                          : 'Individual'} • {isUnlimited ? 'Unlimited entries' : `Max ${maxEntries || 1} entries`}
                      </p>
                    </div>

                    {/* Single Clean Status */}
                    <div className="shrink-0 text-right">
                      {locked ? (
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Locked</span>
                        </span>
                      ) : hasEntries ? (
                        <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>
                            {isGroup
                              ? `${assignedList.length}/${maxGroupMembers} Enrolled`
                              : `${assignedList.length} Enrolled`}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">Open</span>
                      )}
                    </div>
                  </div>

                  {/* Contestants: Clean Inline List (No heavy nested boxes) */}
                  {assignedList.length > 0 && (
                    <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                      {assignedList.map((r) => (
                        <span key={r.id} className="inline-flex items-center gap-1 text-slate-200">
                          <strong className="font-mono text-amber-300 font-bold">{r.participant_code}</strong>
                          <span className="text-white font-medium">{r.participant_name}</span>
                          {!locked && (
                            <button
                              onClick={() => {
                                setRegToRemove(r);
                                setIsRemoveModalOpen(true);
                              }}
                              className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer ml-0.5 text-sm leading-none"
                              title="Remove contestant"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-500">
                    {hasEntries
                      ? isGroup
                        ? `${assignedList.length} of ${maxGroupMembers} in group`
                        : `${assignedList.length} assigned`
                      : 'No entries yet'}
                  </span>

                  <div>
                    {locked ? (
                      <span className="text-xs text-slate-500">Registration Closed</span>
                    ) : canAddMore ? (
                      <button
                        onClick={() => handleOpenAssign(comp)}
                        className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl ${THEME.classes.primaryBtn} text-xs font-bold shadow-xs cursor-pointer`}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{hasEntries ? '+ Add More' : '+ Enroll'}</span>
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-slate-500">Full</span>
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
          title={`Enroll Contestants: ${formatProgTitle(
            selectedCompForAssign.name,
            selectedCompForAssign.programme_group_name || selectedCompForAssign.group_name
          )}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Programme Meta Header */}
            <div className="p-3.5 bg-[#121212] border border-white/[0.08] rounded-2xl flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-sm">
                  {formatProgTitle(
                    selectedCompForAssign.name,
                    selectedCompForAssign.programme_group_name || selectedCompForAssign.group_name
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#0A0A0A] text-slate-300 border border-white/[0.08]">
                  {selectedCompForAssign.participation_type === 'GROUP' ? 'Group Event' : 'Individual'}
                </span>
              </div>
            </div>

            {/* Selection Guidance & Quick Select Actions */}
            <div className="flex items-center justify-between text-slate-400 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <p className="font-bold text-xs text-white">
                  Select contestants ({eligibleParticipants.length} eligible):
                </p>
                {eligibleParticipants.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSelectAllEligible}
                      className="text-[11px] font-bold text-amber-300 hover:underline cursor-pointer"
                    >
                      Select Max
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedParticipantIds([])}
                      className="text-[11px] font-semibold text-slate-400 hover:text-white cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
              <span className="font-mono text-[11px] font-black text-amber-300 bg-amber-400/15 px-2.5 py-0.5 rounded-lg border border-amber-400/30">
                Selected: {selectedParticipantIds.length}
                {(selectedCompForAssign.participation_type || '').toUpperCase() === 'GROUP'
                  ? ` (Enrolled: ${assignedMap.get(selectedCompForAssign.id)?.length || 0} / Max: ${selectedCompForAssign.max_participants || 4})`
                  : selectedCompForAssign.max_entries_per_team
                  ? ` / max ${selectedCompForAssign.max_entries_per_team}`
                  : ' (Unlimited)'}
              </span>
            </div>

            {/* Eligible Contestants List */}
            {eligibleParticipants.length === 0 ? (
              <div className="py-8 text-center bg-[#121212] border border-white/[0.08] rounded-2xl text-slate-400">
                <Users className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                <p className="font-bold text-white text-xs">
                  No eligible participants for &quot;
                  {selectedCompForAssign.programme_group_name || selectedCompForAssign.group_name || 'General'}
                  &quot;.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Add members to your Team Roster under this category.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1 scrollbar-thin">
                {eligibleParticipants.map((p) => {
                  const isSelected = selectedParticipantIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleParticipantSelection(p.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-400/15 border-amber-400/40 shadow-2xs'
                          : 'bg-[#121212] hover:bg-white/[0.04] border-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Handled by div click
                          className="w-4 h-4 text-amber-500 rounded border-white/[0.2] focus:ring-amber-500 cursor-pointer accent-amber-400"
                        />
                        <div>
                          <span className="font-bold text-white text-xs block">
                            {p.user_name || p.name}
                          </span>
                          <span className="text-[10px] text-slate-400">{p.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-amber-300 bg-[#0A0A0A] px-2 py-0.5 rounded-lg border border-white/[0.08]">
                          {p.participant_code}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#0A0A0A] text-slate-300 border border-white/[0.08]">
                          {p.category_name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-2.5">
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
                className={`px-5 py-2 rounded-xl ${THEME.classes.primaryBtn} text-xs font-black shadow-xs transition-all cursor-pointer disabled:opacity-50`}
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
            <div className="flex items-center gap-3 p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-300" />
              <p className="leading-relaxed font-semibold">
                This will unregister the contestant and free the slot.
              </p>
            </div>

            <p className="text-slate-400">
              Are you sure you want to remove{' '}
              <strong className="text-white">{regToRemove.participant_name}</strong> (
              {regToRemove.participant_code}) from{' '}
              <strong className="text-white">{regToRemove.competition_name}</strong>?
            </p>

            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-2.5">
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
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
