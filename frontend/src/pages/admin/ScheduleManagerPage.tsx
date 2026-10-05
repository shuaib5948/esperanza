import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import {
  Calendar,
  Clock,
  Search,
  Filter,
  Pencil,
  Trash2,
  Plus,
  ArrowUpDown,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
  Users,
  RotateCcw,
  X,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import {
  ProgrammeStatusBadge,
  getUnifiedProgrammeStatus,
} from '../../components/ui/ProgrammeStatusBadge.js';

interface Competition {
  id: number;
  competition_code: string;
  programme_number: number;
  name: string;
  programme_group_name?: string;
  group_name?: string;
  programme_group_code?: string;
  competition_type_name?: string;
  competition_type?: string;
  status: string;
  schedule_status?: string | null;
  registered_count?: number;
  published_results_count?: number;
}

interface Schedule {
  id: number;
  competition_id: number;
  competition_name: string;
  competition_code: string;
  programme_number: number;
  programme_group: string;
  start_at: string;
  end_at: string;
  stage_order?: number | null;
  status: string;
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

export const ScheduleManagerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  // Filter & Sort States
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'CHRONOLOGICAL' | 'PROGRAMME_NUM'>('CHRONOLOGICAL');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);

  // Form State
  const [formDate, setFormDate] = useState<string>('2026-10-15');
  const [formStartTime, setFormStartTime] = useState<string>('09:00');
  const [formEndTime, setFormEndTime] = useState<string>('10:30');
  const [formStageOrder, setFormStageOrder] = useState<string>('');

  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<{ id: number; name: string; progNum: number } | null>(null);

  // 1. Fetch all 60 competitions
  const { data: competitions = [], isLoading: isLoadingComps } = useQuery<Competition[]>({
    queryKey: ['competitions-list'],
    queryFn: async () => {
      const res = await api.get<Competition[]>('/competitions');
      return res.data;
    },
  });

  // 2. Fetch all schedules
  const { data: schedules = [], isLoading: isLoadingSchedules } = useQuery<Schedule[]>({
    queryKey: ['schedules'],
    queryFn: async () => {
      const res = await api.get<Schedule[]>('/schedules');
      return res.data;
    },
  });

  // 3. Fetch all registrations for contestant lineup
  const { data: registrations = [], isLoading: isLoadingRegistrations } = useQuery<Registration[]>({
    queryKey: ['registrations'],
    queryFn: async () => {
      const res = await api.get<Registration[]>('/registrations');
      return res.data;
    },
  });

  // 3. Create schedule mutation
  const createMutation = useMutation({
    mutationFn: async (payload: { competition_id: number; start_at: string; end_at: string; stage_order?: number | null }) => {
      return api.post('/schedules', {
        ...payload,
        venue_id: null,
      });
    },
    onSuccess: () => {
      success('Programme scheduled successfully');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to schedule programme');
    },
  });

  // 4. Update schedule mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { start_at: string; end_at: string; stage_order?: number | null } }) => {
      return api.patch(`/schedules/${id}`, {
        ...data,
        venue_id: null,
      });
    },
    onSuccess: () => {
      success('Schedule updated successfully');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to update schedule');
    },
  });

  // 5. Delete schedule mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/schedules/${id}`);
    },
    onSuccess: () => {
      success('Schedule slot cleared');
      setIsDeleteModalOpen(false);
      setScheduleToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to clear schedule');
    },
  });

  // Helpers for Local Datetime Handling
  const formatDisplayDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  const formatDisplayTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return isoStr;
    }
  };

  // Open Modal for Setting Schedule
  const handleOpenAdd = (comp: Competition) => {
    if (Number(comp.registered_count ?? 0) === 0) {
      error(`Cannot schedule "${comp.name}": At least 1 participant must be registered and assigned first.`);
      return;
    }
    setSelectedComp(comp);
    setModalMode('CREATE');
    setEditingScheduleId(null);
    setFormDate('2026-10-15');
    setFormStartTime('09:00');
    setFormEndTime('10:30');
    setFormStageOrder('');
    setIsModalOpen(true);
  };

  // Open Modal for Editing Existing Schedule
  const handleOpenEdit = (comp: Competition, sched: Schedule) => {
    setSelectedComp(comp);
    setModalMode('EDIT');
    setEditingScheduleId(sched.id);

    try {
      const dStart = new Date(sched.start_at);
      const dEnd = new Date(sched.end_at);

      const y = dStart.getFullYear();
      const m = String(dStart.getMonth() + 1).padStart(2, '0');
      const d = String(dStart.getDate()).padStart(2, '0');
      setFormDate(`${y}-${m}-${d}`);

      const sH = String(dStart.getHours()).padStart(2, '0');
      const sM = String(dStart.getMinutes()).padStart(2, '0');
      setFormStartTime(`${sH}:${sM}`);

      const eH = String(dEnd.getHours()).padStart(2, '0');
      const eM = String(dEnd.getMinutes()).padStart(2, '0');
      setFormEndTime(`${eH}:${eM}`);
    } catch {
      setFormDate('2026-10-15');
      setFormStartTime('09:00');
      setFormEndTime('10:30');
    }

    setFormStageOrder(sched.stage_order ? String(sched.stage_order) : '');
    setIsModalOpen(true);
  };

  // Form Submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate || !formStartTime || !formEndTime) {
      error('Please fill in date, start time, and end time');
      return;
    }

    const startDateTime = new Date(`${formDate}T${formStartTime}:00`);
    const endDateTime = new Date(`${formDate}T${formEndTime}:00`);

    if (endDateTime <= startDateTime) {
      error('End time must be after start time');
      return;
    }

    const payload = {
      start_at: startDateTime.toISOString(),
      end_at: endDateTime.toISOString(),
      stage_order: formStageOrder.trim() ? parseInt(formStageOrder.trim(), 10) : null,
    };

    if (modalMode === 'CREATE' && selectedComp) {
      if (Number(selectedComp.registered_count ?? 0) === 0) {
        error(`Cannot schedule "${selectedComp.name}": At least 1 participant must be registered and assigned first.`);
        return;
      }
      createMutation.mutate({
        competition_id: selectedComp.id,
        ...payload,
      });
    } else if (modalMode === 'EDIT' && editingScheduleId) {
      updateMutation.mutate({
        id: editingScheduleId,
        data: payload,
      });
    }
  };

  // Processed and Merged Data
  const processedData = useMemo(() => {
    const schedMap = new Map<number, Schedule>();
    schedules.forEach((s) => {
      schedMap.set(s.competition_id, s);
    });

    const assignedRegs = registrations.filter((r) => r.status === 'ASSIGNED');
    const compRegMap = new Map<number | string, { diraya: Registration[]; rivaya: Registration[] }>();

    competitions.forEach((c) => {
      compRegMap.set(c.id, { diraya: [], rivaya: [] });
    });

    assignedRegs.forEach((reg) => {
      const isDiraya =
        reg.team_id === 1 ||
        reg.team_code === 'DIRAYA' ||
        reg.team_code === 'TEAM_A' ||
        reg.team_name?.toUpperCase() === 'DIRAYA';
      const isRivaya =
        reg.team_id === 2 ||
        reg.team_code === 'RIVAYA' ||
        reg.team_code === 'TEAM_B' ||
        reg.team_name?.toUpperCase() === 'RIVAYA';

      const compEntry = compRegMap.get(reg.competition_id);
      if (compEntry) {
        if (isDiraya) compEntry.diraya.push(reg);
        if (isRivaya) compEntry.rivaya.push(reg);
      }
    });

    const enriched = competitions.map((comp) => {
      const sched = schedMap.get(comp.id);
      const regEntry = compRegMap.get(comp.id) || { diraya: [], rivaya: [] };
      return {
        comp,
        sched,
        hasSchedule: !!sched,
        diraya: regEntry.diraya,
        rivaya: regEntry.rivaya,
        totalAssigned: regEntry.diraya.length + regEntry.rivaya.length,
      };
    });

    // 1. Category Filter
    let filtered = enriched;
    if (activeCategory !== 'ALL') {
      filtered = filtered.filter(({ comp }) => {
        const group = (comp.programme_group_name || comp.group_name || '').toUpperCase();
        return group.includes(activeCategory);
      });
    }

    // 2. Status Filter (Unified 6-status pipeline)
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(({ comp, sched }) => {
        const unified = getUnifiedProgrammeStatus(comp, sched);
        return unified === statusFilter;
      });
    }

    // 3. Search Filter (matches programme or participant name / chest code)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(({ comp, diraya, rivaya }) => {
        return (
          comp.name.toLowerCase().includes(q) ||
          comp.competition_code.toLowerCase().includes(q) ||
          String(comp.programme_number).includes(q) ||
          diraya.some((p) => p.participant_name.toLowerCase().includes(q) || p.participant_code.toLowerCase().includes(q)) ||
          rivaya.some((p) => p.participant_name.toLowerCase().includes(q) || p.participant_code.toLowerCase().includes(q))
        );
      });
    }

    // 4. Sorting
    if (sortBy === 'CHRONOLOGICAL') {
      filtered.sort((a, b) => {
        // Scheduled items first, ordered by date & start_at, then stage_order
        if (a.hasSchedule && b.hasSchedule) {
          const timeA = new Date(a.sched!.start_at).getTime();
          const timeB = new Date(b.sched!.start_at).getTime();
          if (timeA !== timeB) return timeA - timeB;
          const orderA = a.sched!.stage_order ?? 999;
          const orderB = b.sched!.stage_order ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          return a.comp.programme_number - b.comp.programme_number;
        }
        if (a.hasSchedule && !b.hasSchedule) return -1;
        if (!a.hasSchedule && b.hasSchedule) return 1;
        return a.comp.programme_number - b.comp.programme_number;
      });
    } else {
      // By Programme Number (#1 to #60)
      filtered.sort((a, b) => a.comp.programme_number - b.comp.programme_number);
    }

    // Metrics Calculation
    const totalScheduled = enriched.filter((i) => i.hasSchedule).length;
    const totalUnscheduled = enriched.length - totalScheduled;
    const totalAssigned = assignedRegs.length;

    const distinctDates = new Set<string>();
    schedules.forEach((s) => {
      try {
        const d = new Date(s.start_at);
        distinctDates.add(d.toISOString().split('T')[0]);
      } catch {
        // ignore
      }
    });

    return {
      items: filtered,
      totalComps: competitions.length,
      totalScheduled,
      totalUnscheduled,
      totalAssigned,
      distinctDaysCount: distinctDates.size,
    };
  }, [competitions, schedules, registrations, activeCategory, statusFilter, searchQuery, sortBy]);

  const categoryOptions = [
    { id: 'ALL', label: 'All Categories' },
    { id: 'J1', label: 'J1 (General 1)' },
    { id: 'J2', label: 'J2 (General 2)' },
    { id: 'JUNIOR', label: 'Junior' },
    { id: 'SENIOR', label: 'Senior' },
    { id: 'GENERAL', label: 'General' },
  ];

  const statusOptions = [
    { id: 'ALL', label: 'All Statuses' },
    { id: 'DRAFT', label: 'Draft' },
    { id: 'SCHEDULED', label: 'Scheduled' },
    { id: 'COMPLETED', label: 'Completed' },
    { id: 'PUBLISHED', label: 'Published' },
  ];

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: competitions.length };
    categoryOptions.forEach((cat) => {
      if (cat.id !== 'ALL') {
        counts[cat.id] = competitions.filter((comp) => {
          const group = (comp.programme_group_name || comp.group_name || '').toUpperCase();
          return group.includes(cat.id);
        }).length;
      }
    });
    return counts;
  }, [competitions]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: competitions.length,
      DRAFT: 0,
      SCHEDULED: 0,
      COMPLETED: 0,
      PUBLISHED: 0,
    };
    const schedMap = new Map<number, Schedule>();
    schedules.forEach((s) => schedMap.set(s.competition_id, s));

    competitions.forEach((comp) => {
      const sched = schedMap.get(comp.id);
      const unified = getUnifiedProgrammeStatus(comp, sched);
      if (counts[unified] !== undefined) {
        counts[unified]++;
      }
    });
    return counts;
  }, [competitions, schedules]);

  const isFiltered =
    activeCategory !== 'ALL' ||
    statusFilter !== 'ALL' ||
    searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setActiveCategory('ALL');
    setStatusFilter('ALL');
    setSearchQuery('');
  };

  const isLoading = isLoadingComps || isLoadingSchedules || isLoadingRegistrations;

  return (
    <div className="space-y-5">
      {/* Header and Top Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
        <div>
          <h1 className="text-2xl xl:text-3xl font-bento-title text-slate-900 tracking-[-0.035em] leading-none flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-[#0D472D]" />
            Schedule & Lineup
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Festival timetable scheduling and contestant lineup for all 60 competitions.
          </p>
        </div>

        {/* Dashboard-style rounded-full pill button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              const firstUnscheduled = competitions.find(
                (c) => !schedules.some((s) => s.competition_id === c.id) && Number(c.registered_count ?? 0) > 0
              );
              if (firstUnscheduled) {
                handleOpenAdd(firstUnscheduled);
              } else {
                success('All competitions with assigned contestants are scheduled!');
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0D472D] hover:bg-[#07321e] text-white text-xs font-semibold shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Quick Schedule</span>
          </button>
        </div>
      </div>



      {/* Unified Filters Toolbar — Category & Status Dropdowns with Reset & Search */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Left: Dropdowns & Reset Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* 1. Category Dropdown */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Layers className={`w-3.5 h-3.5 ${activeCategory !== 'ALL' ? 'text-white' : 'text-slate-400'}`} />
              </div>
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                className={`appearance-none rounded-full pl-9 pr-9 py-2 text-xs font-semibold border transition-all cursor-pointer focus:outline-hidden ${
                  activeCategory !== 'ALL'
                    ? 'bg-[#0D472D] text-white border-[#0D472D] shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                {categoryOptions.map((cat) => (
                  <option
                    key={cat.id}
                    value={cat.id}
                    className="bg-white text-slate-800 py-1 font-medium"
                  >
                    {cat.label} {categoryCounts[cat.id] !== undefined ? `(${categoryCounts[cat.id]})` : ''}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <ChevronDown className={`w-3.5 h-3.5 ${activeCategory !== 'ALL' ? 'text-white' : 'text-slate-400'}`} />
              </div>
            </div>

            {/* 2. Status Dropdown */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Filter className={`w-3.5 h-3.5 ${statusFilter !== 'ALL' ? 'text-white' : 'text-slate-400'}`} />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`appearance-none rounded-full pl-9 pr-9 py-2 text-xs font-semibold border transition-all cursor-pointer focus:outline-hidden ${
                  statusFilter !== 'ALL'
                    ? 'bg-[#0D472D] text-white border-[#0D472D] shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                {statusOptions.map((st) => (
                  <option
                    key={st.id}
                    value={st.id}
                    className="bg-white text-slate-800 py-1 font-medium"
                  >
                    {st.label} {statusCounts[st.id] !== undefined ? `(${statusCounts[st.id]})` : ''}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <ChevronDown className={`w-3.5 h-3.5 ${statusFilter !== 'ALL' ? 'text-white' : 'text-slate-400'}`} />
              </div>
            </div>

            {/* 3. Reset Button */}
            <button
              onClick={handleResetFilters}
              disabled={!isFiltered}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isFiltered
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 shadow-2xs hover:scale-[1.02]'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 opacity-60 cursor-not-allowed'
              }`}
              title={isFiltered ? 'Reset all filters and search' : 'No filters applied'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Right: Search Bar with Instant Clear Button */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search programme, contestant, reg number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-full pl-9 pr-8 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0D472D] focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Programme Cards */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs">
          <div className="text-center text-slate-400 font-medium">Loading festival competitions and schedules...</div>
        </div>
      ) : processedData.items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs">
          <div className="flex flex-col items-center justify-center space-y-3">
            <Calendar className="w-12 h-12 text-slate-300" />
            <p className="text-slate-500 font-medium text-sm">No programmes found matching the selected criteria.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {processedData.items.map(({ comp, sched, hasSchedule, diraya, rivaya, totalAssigned }) => {
            const isPublished = Number(comp.published_results_count ?? 0) > 0 || Number(sched?.published_results_count ?? 0) > 0;
            const isCompleted = isPublished || comp.status === 'COMPLETED' || comp.schedule_status === 'COMPLETED' || sched?.status === 'COMPLETED';
            const groupName = comp.programme_group_name || comp.group_name;
            const fullTitle = groupName
              ? comp.name.toLowerCase().startsWith(groupName.toLowerCase())
                ? comp.name.includes('-')
                  ? comp.name
                  : `${groupName} - ${comp.name.slice(groupName.length).trim()}`
                : `${groupName} - ${comp.name}`
              : comp.name;

            return (
              <div
                key={comp.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between"
              >
                {/* Card Header — Category - Programme Name & Status Badge */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50/90 border-b border-slate-200 gap-3">
                  <h3 className="font-bento-title font-bold text-sm text-slate-900 truncate" title={fullTitle}>
                    {fullTitle}
                  </h3>
                  <div className="shrink-0">
                    <ProgrammeStatusBadge competition={comp} schedule={sched} />
                  </div>
                </div>

                {/* Card Body — Date, Time & Action Button */}
                <div className="p-3.5 sm:px-4 sm:py-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200">
                  {hasSchedule && sched ? (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      {/* Date Badge */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/80 border border-emerald-200/80 text-emerald-900 text-xs font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-[#0D472D] shrink-0" />
                        <span>{formatDisplayDate(sched.start_at)}</span>
                      </div>

                      {/* Time Badge */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{formatDisplayTime(sched.start_at)} – {formatDisplayTime(sched.end_at)}</span>
                      </div>

                      {/* Stage Order */}
                      {sched.stage_order !== null && sched.stage_order !== undefined && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                          <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">Order</span>
                          <span className="font-mono">{sched.stage_order}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-xs font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="italic">Not scheduled yet</span>
                    </div>
                  )}

                  {/* Actions — Dashboard style rounded-full buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isPublished ? (
                      <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#0D472D] text-xs font-bold flex items-center gap-1.5 cursor-not-allowed" title="Published programme">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0D472D]" />
                        <span>Published</span>
                      </span>
                    ) : isCompleted ? (
                      <span className="px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1.5 cursor-not-allowed" title="Completed programme cannot be edited or rescheduled">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Completed</span>
                      </span>
                    ) : hasSchedule && sched ? (
                      <button
                        onClick={() => handleOpenEdit(comp, sched)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-300 hover:border-slate-800 shadow-2xs transition-all hover:scale-[1.02] cursor-pointer"
                        title="Change Date & Time"
                      >
                        <Pencil className="w-3 h-3 text-[#0D472D]" />
                        <span>Change</span>
                      </button>
                    ) : (
                      <button
                        disabled={totalAssigned === 0}
                        title={
                          totalAssigned === 0
                            ? 'Cannot schedule: At least 1 participant must be registered and assigned first'
                            : undefined
                        }
                        onClick={() => handleOpenAdd(comp)}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                          totalAssigned === 0
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            : 'bg-[#0D472D] hover:bg-[#07321e] text-white hover:scale-[1.02]'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Schedule</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Contestant Lineup: Team Diraya vs Team Rivaya Standard High-Contrast Boxes */}
                <div className="p-3.5 bg-slate-50/70 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Team Diraya Box */}
                    <div className="bg-white rounded-xl border border-emerald-200/90 shadow-2xs p-3 flex flex-col justify-between">
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-100/80 mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#0D472D]" />
                          <span className="text-xs font-bold uppercase tracking-wider text-[#0D472D]">
                            Team Diraya
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                          {diraya.length} {diraya.length === 1 ? 'entry' : 'entries'}
                        </span>
                      </div>

                      {diraya.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {diraya.map((p, idx) => (
                            <div
                              key={p.id || idx}
                              className="flex items-center gap-2 bg-slate-50/80 hover:bg-emerald-50/40 border border-slate-200 rounded-lg px-2.5 py-1.5 transition-colors"
                            >
                              <span className="font-mono text-xs bg-emerald-100 text-[#0D472D] border border-emerald-200 px-1.5 py-0.5 rounded font-bold shrink-0">
                                {p.participant_code}
                              </span>
                              <span className="text-xs font-semibold text-slate-800 truncate" title={p.participant_name}>
                                {p.participant_name}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-3 text-xs text-slate-400 font-medium italic bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                          No Diraya contestant assigned
                        </div>
                      )}
                    </div>

                    {/* Team Rivaya Box */}
                    <div className="bg-white rounded-xl border border-amber-200/90 shadow-2xs p-3 flex flex-col justify-between">
                      <div className="flex items-center justify-between pb-2 border-b border-amber-100/80 mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-600" />
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                            Team Rivaya
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                          {rivaya.length} {rivaya.length === 1 ? 'entry' : 'entries'}
                        </span>
                      </div>

                      {rivaya.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {rivaya.map((p, idx) => (
                            <div
                              key={p.id || idx}
                              className="flex items-center gap-2 bg-slate-50/80 hover:bg-amber-50/40 border border-slate-200 rounded-lg px-2.5 py-1.5 transition-colors"
                            >
                              <span className="font-mono text-xs bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded font-bold shrink-0">
                                {p.participant_code}
                              </span>
                              <span className="text-xs font-semibold text-slate-800 truncate" title={p.participant_name}>
                                {p.participant_name}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-3 text-xs text-slate-400 font-medium italic bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                          No Rivaya contestant assigned
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule / Edit Modal */}
      {selectedComp && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={modalMode === 'CREATE' ? 'Schedule Competition' : 'Change Date & Time'}
          maxWidth="md"
        >
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Programme Info Header */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#0D472D] text-sm">
                    {selectedComp.programme_number}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{selectedComp.name}</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    Number(selectedComp.registered_count ?? 0) === 0
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  {selectedComp.registered_count ?? 0} {Number(selectedComp.registered_count ?? 0) === 1 ? 'Contestant' : 'Contestants'}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {selectedComp.programme_group_name || selectedComp.group_name} •{' '}
                {selectedComp.competition_type_name || selectedComp.competition_type}
              </div>
            </div>

            {modalMode === 'CREATE' && Number(selectedComp?.registered_count ?? 0) === 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>
                  This programme has 0 registered participants. At least 1 participant must be registered and assigned before scheduling.
                </span>
              </div>
            )}

            {/* Date Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Festival Date *
              </label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:border-[#0D472D] cursor-pointer"
              />
            </div>

            {/* Timing Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Start Time *
                </label>
                <input
                  type="time"
                  required
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:border-[#0D472D] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  End Time *
                </label>
                <input
                  type="time"
                  required
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:border-[#0D472D] cursor-pointer"
                />
              </div>
            </div>

            {/* Sequence / Running Order */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Running Order / Sequence Number (Optional)
              </label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 1 (for 1st event), 2, 3..."
                value={formStageOrder}
                onChange={(e) => setFormStageOrder(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-mono focus:outline-hidden focus:border-[#0D472D]"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Helps rearrange events that share the same time slot or day into strict sequence.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2.5">
              {modalMode === 'EDIT' && editingScheduleId ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedComp || !editingScheduleId) return;
                    setIsModalOpen(false);
                    setScheduleToDelete({
                      id: editingScheduleId,
                      name: selectedComp.name,
                      progNum: selectedComp.programme_number,
                    });
                    setIsDeleteModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 transition-colors cursor-pointer"
                  title="Remove this schedule slot"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Schedule</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={(modalMode === 'CREATE' && Number(selectedComp?.registered_count ?? 0) === 0) || createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 rounded-full bg-[#0D472D] hover:bg-[#07321e] text-white text-xs font-semibold shadow-xs transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : modalMode === 'CREATE'
                    ? 'Schedule Programme'
                    : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete / Clear Confirmation Modal */}
      {scheduleToDelete && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setScheduleToDelete(null);
          }}
          title="Clear Schedule Slot"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
              <p className="text-xs leading-relaxed font-semibold">
                This will remove the assigned date and time for this competition. The programme will return to unscheduled status.
              </p>
            </div>

            <p className="text-sm text-slate-700">
              Are you sure you want to clear the schedule for{' '}
              <span className="font-bold text-slate-900">
                {scheduleToDelete.progNum} - {scheduleToDelete.name}
              </span>
              ?
            </p>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setScheduleToDelete(null);
                }}
                className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(scheduleToDelete.id)}
                className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Clearing...' : 'Clear Schedule'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
