import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import {
  Search,
  Filter,
  SlidersHorizontal,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { Button } from '../../components/ui/Button.js';
import {
  ProgrammeStatusBadge,
  getUnifiedProgrammeStatus,
} from '../../components/ui/ProgrammeStatusBadge.js';

interface Criterion {
  id?: number;
  name: string;
  max_marks: number;
  weightage?: number;
  description?: string;
}

interface Competition {
  id: number;
  programme_number: number;
  name: string;
  programme_group_id?: number;
  competition_type_id?: number;
  programme_group_name?: string;
  programme_group_code?: string;
  group_name?: string;
  group_code?: string;
  competition_type?: string;
  competition_type_name?: string;
  participation_type: string;
  description?: string;
  rules?: string;
  max_participants?: number;
  max_entries_per_team?: number;
  status: string;
  schedule_status?: string | null;
  criteria_count?: number;
  published_results_count?: number;
}

interface ProgrammeGroup {
  id: number;
  name: string;
  code: string;
}

interface CompetitionType {
  id: number;
  name: string;
}

export const CompetitionsManagerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [isCriteriaModalOpen, setIsCriteriaModalOpen] = useState(false);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [newCritName, setNewCritName] = useState('');
  const [newCritMax, setNewCritMax] = useState('20');

  // Add Competition Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    programme_number: '',
    name: '',
    programme_group_id: '',
    competition_type_id: '',
    participation_type: 'INDIVIDUAL',
    description: '',
    rules: '',
    max_participants: '4',
    max_entries_per_team: '1',
  });

  // Edit & Delete Competition State
  const [editingComp, setEditingComp] = useState<Competition | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    programme_number: '',
    name: '',
    programme_group_id: '',
    competition_type_id: '',
    participation_type: 'INDIVIDUAL',
    description: '',
    rules: '',
    max_participants: '4',
    max_entries_per_team: '1',
    status: 'DRAFT',
  });

  const [deletingComp, setDeletingComp] = useState<Competition | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // 1. Fetch competitions
  const { data: competitions = [], isLoading } = useQuery({
    queryKey: ['competitions', selectedGroup],
    queryFn: async () => {
      const endpoint =
        selectedGroup === 'ALL'
          ? '/competitions'
          : `/competitions?group=${encodeURIComponent(selectedGroup)}`;
      const res = await api.get<Competition[]>(endpoint);
      return res.data;
    },
  });

  // Fetch programme groups & competition types for dropdowns
  const { data: programmeGroups = [] } = useQuery<ProgrammeGroup[]>({
    queryKey: ['programme-groups'],
    queryFn: async () => {
      const res = await api.get<ProgrammeGroup[]>('/programme-groups');
      return res.data;
    },
  });

  const { data: competitionTypes = [] } = useQuery<CompetitionType[]>({
    queryKey: ['competition-types'],
    queryFn: async () => {
      const res = await api.get<CompetitionType[]>('/competitions/meta/types');
      return res.data;
    },
  });

  // 2. Fetch criteria for a competition
  const openCriteriaModal = async (comp: Competition) => {
    setSelectedComp(comp);
    try {
      const res = await api.get<Criterion[]>(`/competitions/${comp.id}/criteria`);
      setCriteria(res.data);
      setIsCriteriaModalOpen(true);
    } catch (err: any) {
      error(err.message || 'Failed to load criteria');
    }
  };

  // 3. Save criteria mutation
  const saveCriteriaMutation = useMutation({
    mutationFn: async (updatedCriteria: Criterion[]) => {
      if (!selectedComp) return;
      return api.post(`/competitions/${selectedComp.id}/criteria`, {
        criteria: updatedCriteria,
      });
    },
    onSuccess: () => {
      success('Evaluation criteria updated successfully');
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      setIsCriteriaModalOpen(false);
    },
    onError: (err: any) => {
      error(err.message || 'Failed to save criteria');
    },
  });

  // 4. Update status mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return api.patch(`/competitions/${id}`, { status });
    },
    onSuccess: () => {
      success('Competition status updated');
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to update status');
    },
  });

  // 5. Create competition mutation
  const createCompetitionMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/competitions', payload);
    },
    onSuccess: () => {
      success('New competition created successfully');
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      setIsAddModalOpen(false);
      setFormData({
        programme_number: '',
        name: '',
        programme_group_id: '',
        competition_type_id: '',
        participation_type: 'INDIVIDUAL',
        description: '',
        rules: '',
        max_participants: '',
        max_entries_per_team: '2',
      });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to create competition');
    },
  });

  const handleTypeChange = (typeId: string, isEdit = false) => {
    const selectedType = competitionTypes.find((t) => String(t.id) === typeId);
    const typeName = selectedType?.name?.toUpperCase() || '';
    const isStage = typeName.includes('STAGE') && !typeName.includes('OFF');
    const isOffStage = typeName.includes('OFF');

    if (isEdit) {
      setEditFormData((prev) => ({
        ...prev,
        competition_type_id: typeId,
        max_entries_per_team: isStage ? '2' : isOffStage ? '' : prev.max_entries_per_team,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        competition_type_id: typeId,
        max_entries_per_team: isStage ? '2' : isOffStage ? '' : prev.max_entries_per_team,
      }));
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      error('Competition name is required');
      return;
    }
    const progNum = parseInt(formData.programme_number, 10);
    if (isNaN(progNum) || progNum <= 0) {
      error('Please enter a valid positive programme number');
      return;
    }
    const groupId = parseInt(formData.programme_group_id, 10);
    if (isNaN(groupId) || groupId <= 0) {
      error('Please select a programme group');
      return;
    }

    const isIndividual = formData.participation_type === 'INDIVIDUAL';
    const payload: any = {
      programme_number: progNum,
      name: formData.name.trim(),
      programme_group_id: groupId,
      competition_type_id: formData.competition_type_id ? parseInt(formData.competition_type_id, 10) : null,
      participation_type: formData.participation_type,
      description: formData.description.trim() || null,
      rules: formData.rules.trim() || null,
      max_participants: isIndividual ? 1 : (parseInt(formData.max_participants, 10) || 4),
      max_entries_per_team: formData.max_entries_per_team ? parseInt(formData.max_entries_per_team, 10) : null,
    };

    createCompetitionMutation.mutate(payload);
  };

  // 6. Update competition mutation
  const updateCompetitionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return api.patch(`/competitions/${id}`, data);
    },
    onSuccess: () => {
      success('Competition updated successfully');
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      setIsEditModalOpen(false);
      setEditingComp(null);
    },
    onError: (err: any) => {
      error(err.message || 'Failed to update competition');
    },
  });

  // 8. Lock / Unlock All Registrations
  const lockAllMutation = useMutation({
    mutationFn: async () => {
      return api.post('/competitions/registration/lock-all');
    },
    onSuccess: () => {
      success('All competition registrations locked');
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to lock registrations');
    },
  });

  const unlockAllMutation = useMutation({
    mutationFn: async () => {
      return api.post('/competitions/registration/unlock-all');
    },
    onSuccess: () => {
      success('All competition registrations unlocked');
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to unlock registrations');
    },
  });

  // 9. Toggle Single Competition Registration Lock/Unlock
  const toggleRegStatusMutation = useMutation({
    mutationFn: async (comp: Competition) => {
      const action = comp.status === 'ACTIVE' ? 'close-registration' : 'open-registration';
      return api.post(`/competitions/${comp.id}/${action}`);
    },
    onSuccess: (_, comp) => {
      const newStatus = comp.status === 'ACTIVE' ? 'locked (CLOSED)' : 'unlocked (ACTIVE)';
      success(`Registration ${newStatus} for ${comp.programme_number} - ${comp.name}`);
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to toggle registration status');
    },
  });

  const handleOpenEdit = (comp: Competition) => {
    setEditingComp(comp);
    const grp = programmeGroups.find(
      (g) => g.id === comp.programme_group_id || g.name === comp.group_name || g.code === comp.group_code
    );
    const typ = competitionTypes.find(
      (t) => t.id === comp.competition_type_id || t.name === comp.competition_type || t.name === comp.competition_type_name
    );

    setEditFormData({
      programme_number: String(comp.programme_number),
      name: comp.name,
      programme_group_id: grp ? String(grp.id) : (programmeGroups[0]?.id ? String(programmeGroups[0].id) : ''),
      competition_type_id: typ ? String(typ.id) : '',
      participation_type: comp.participation_type || 'INDIVIDUAL',
      description: comp.description || '',
      rules: comp.rules || '',
      max_participants: comp.max_participants ? String(comp.max_participants) : '4',
      max_entries_per_team: comp.max_entries_per_team !== null && comp.max_entries_per_team !== undefined ? String(comp.max_entries_per_team) : '',
      status: comp.status || 'DRAFT',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComp) return;
    if (!editFormData.name.trim()) {
      error('Competition name is required');
      return;
    }
    const progNum = parseInt(editFormData.programme_number, 10);
    if (isNaN(progNum) || progNum <= 0) {
      error('Please enter a valid programme number');
      return;
    }
    const groupId = parseInt(editFormData.programme_group_id, 10);
    if (isNaN(groupId) || groupId <= 0) {
      error('Please select a programme group');
      return;
    }

    const isIndividual = editFormData.participation_type === 'INDIVIDUAL';
    const payload: any = {
      programme_number: progNum,
      name: editFormData.name.trim(),
      programme_group_id: groupId,
      competition_type_id: editFormData.competition_type_id ? parseInt(editFormData.competition_type_id, 10) : null,
      participation_type: editFormData.participation_type,
      description: editFormData.description.trim() || null,
      rules: editFormData.rules.trim() || null,
      max_participants: isIndividual ? 1 : (parseInt(editFormData.max_participants, 10) || 4),
      max_entries_per_team: editFormData.max_entries_per_team ? parseInt(editFormData.max_entries_per_team, 10) : null,
      status: editFormData.status,
    };

    updateCompetitionMutation.mutate({ id: editingComp.id, data: payload });
  };

  // 7. Delete competition mutation
  const deleteCompetitionMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/competitions/${id}`);
    },
    onSuccess: () => {
      success('Competition deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      setIsDeleteModalOpen(false);
      setDeletingComp(null);
    },
    onError: (err: any) => {
      error(err.message || 'Failed to delete competition');
    },
  });

  const handleOpenDelete = (comp: Competition) => {
    setDeletingComp(comp);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deletingComp) return;
    deleteCompetitionMutation.mutate(deletingComp.id);
  };

  const handleAddCriterion = () => {
    if (!newCritName.trim()) return;
    const maxMarks = parseFloat(newCritMax) || 10;
    setCriteria((prev) => [
      ...prev,
      {
        name: newCritName.trim(),
        max_marks: maxMarks,
        description: 'Standard rubric criterion',
      },
    ]);
    setNewCritName('');
    setNewCritMax('20');
  };

  const handleRemoveCriterion = (idx: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== idx));
  };

  const filteredCompetitions = competitions.filter((c) => {
    const groupName = c.programme_group_name || c.group_name || '';
    const groupCode = c.programme_group_code || c.group_code || '';
    const matchesGroup =
      selectedGroup === 'ALL' ||
      groupName.toUpperCase() === selectedGroup.toUpperCase() ||
      groupCode.toUpperCase() === selectedGroup.toUpperCase();

    const matchesSearch =
      search === '' ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      String(c.programme_number).includes(search);

    const globalStatus = getUnifiedProgrammeStatus(c);
    const matchesStatus =
      selectedStatus === 'ALL' ||
      globalStatus === selectedStatus;

    return matchesGroup && matchesSearch && matchesStatus;
  });

  const totalMaxMarks = criteria.reduce((sum, c) => sum + Number(c.max_marks || 0), 0);
  const activeCount = competitions.filter((c) => c.status === 'ACTIVE').length;
  const isAnyUnlocked = activeCount > 0;

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: competitions.length,
      LIVE: 0,
      CHECK_IN: 0,
      SCHEDULED: 0,
      COMPLETED: 0,
      PUBLISHED: 0,
      DRAFT: 0,
    };
    competitions.forEach((c) => {
      const s = getUnifiedProgrammeStatus(c);
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [competitions]);

  const statusPills: { id: string; label: string; icon?: React.ReactNode }[] = [
    { id: 'ALL', label: 'All' },
    { id: 'SCHEDULED', label: 'Scheduled' },
    { id: 'COMPLETED', label: 'Completed' },
    { id: 'PUBLISHED', label: 'Published' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Festival Competitions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete catalogue with programme groups, stage/off-stage assignment, and direct 100-mark evaluation.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            disabled={lockAllMutation.isPending || unlockAllMutation.isPending}
            onClick={() => {
              if (isAnyUnlocked) {
                lockAllMutation.mutate();
              } else {
                unlockAllMutation.mutate();
              }
            }}
            title={
              isAnyUnlocked
                ? 'Freeze and lock participant registration for all open programmes'
                : 'Unlock participant registration for all programmes'
            }
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-900 text-xs font-semibold border border-slate-300 hover:border-slate-900 shadow-xs transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
          >
            {isAnyUnlocked ? (
              <>
                <Lock className="w-3.5 h-3.5 stroke-[2.2] text-amber-600" />
                <span>Lock All</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5 stroke-[2.2] text-emerald-600" />
                <span>Unlock All</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              const nextNum =
                competitions.length > 0
                  ? Math.max(...competitions.map((c) => c.programme_number)) + 1
                  : 1;
              setFormData({
                programme_number: String(nextNum),
                name: '',
                programme_group_id: programmeGroups[0]?.id ? String(programmeGroups[0].id) : '',
                competition_type_id: competitionTypes[0]?.id ? String(competitionTypes[0].id) : '',
                participation_type: 'INDIVIDUAL',
                description: '',
                rules: '',
                max_participants: '',
                max_entries_per_team: '1',
              });
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0D472D] hover:bg-[#07321e] text-white text-xs font-semibold shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Programme</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar: Option 2 (Live Lifecycle Chips on left + Category Dropdown & Search on right) */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center">
        {/* Left: Stage Lifecycle Chips */}
        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
          {statusPills.map((pill) => {
            const count = statusCounts[pill.id] ?? 0;
            const isActive = selectedStatus === pill.id;

            return (
              <button
                key={pill.id}
                onClick={() => setSelectedStatus(pill.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#0D472D] text-white shadow-2xs font-semibold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {pill.icon}
                <span>{pill.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Category Dropdown + Search Input + Reset */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          {/* Category Dropdown */}
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-[#0D472D] cursor-pointer shrink-0"
          >
            <option value="ALL">All Categories ({competitions.length})</option>
            {['J1', 'J2', 'JUNIOR', 'SENIOR', 'GENERAL'].map((grp) => {
              const count = competitions.filter((c) => {
                const name = (c.programme_group_name || c.group_name || '').toUpperCase();
                const code = (c.programme_group_code || c.group_code || '').toUpperCase();
                return name === grp || code === grp;
              }).length;
              return (
                <option key={grp} value={grp}>
                  {grp} Category ({count})
                </option>
              );
            })}
          </select>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search 60 programmes..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0D472D]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* Quick Reset Button if active filters */}
          {(selectedGroup !== 'ALL' || selectedStatus !== 'ALL' || search) && (
            <button
              onClick={() => {
                setSelectedGroup('ALL');
                setSelectedStatus('ALL');
                setSearch('');
              }}
              className="px-2.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-full transition-colors cursor-pointer shrink-0"
              title="Reset all filters"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Competitions Table — Clean Unified Bento Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80">
                <th className="py-3.5 px-4 text-center w-28">Prog No</th>
                <th className="py-3.5 px-4 text-center">Competition Name</th>
                <th className="py-3.5 px-4 text-center">Group</th>
                <th className="py-3.5 px-4 text-center">Type</th>
                <th className="py-3.5 px-4 text-center">Participation</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    Loading festival competitions...
                  </td>
                </tr>
              ) : filteredCompetitions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    No competitions found matching filters.
                  </td>
                </tr>
              ) : (
                filteredCompetitions.map((comp) => {
                  const isCompleted = comp.status === 'COMPLETED' || comp.schedule_status === 'COMPLETED';

                  return (
                    <tr key={comp.id} className="hover:bg-slate-50/90 transition-colors">
                      {/* Programme Number */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono text-xs font-bold text-[#0D472D] bg-[#E6F4EA] border border-emerald-200/80 px-3 py-1 rounded-full inline-block shadow-2xs">
                          {comp.programme_number}
                        </span>
                      </td>

                      {/* Competition Name */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-slate-900 text-[13px]">
                          {comp.name}
                        </div>
                      </td>

                      {/* Group */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 inline-block">
                          {comp.programme_group_name || comp.group_name || '-'}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full border inline-block ${
                            (comp.competition_type_name || comp.competition_type) === 'STAGE'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {comp.competition_type_name || comp.competition_type || 'OFF_STAGE'}
                        </span>
                      </td>

                      {/* Participation */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full border inline-block ${
                            comp.participation_type === 'GROUP'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {comp.participation_type === 'GROUP' ? 'GROUP' : 'INDIVIDUAL'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex justify-center">
                          <ProgrammeStatusBadge competition={comp} />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            disabled={isCompleted}
                            className={`p-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-800 shadow-2xs transition-all hover:scale-[1.05] cursor-pointer ${
                              isCompleted ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                            onClick={() => !isCompleted && toggleRegStatusMutation.mutate(comp)}
                            title={
                              comp.status === 'ACTIVE'
                                ? 'Registration Open — Click to Lock Entries'
                                : 'Registration Locked — Click to Unlock Entries'
                            }
                          >
                            {comp.status === 'ACTIVE' ? (
                              <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-amber-500" />
                            )}
                          </button>
                          <button
                            disabled={isCompleted}
                            className={`p-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-800 shadow-2xs transition-all hover:scale-[1.05] cursor-pointer ${
                              isCompleted ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                            onClick={() => !isCompleted && handleOpenEdit(comp)}
                            title={isCompleted ? 'Completed programme cannot be edited' : 'Edit Competition & Rules'}
                          >
                            <Pencil className="w-3.5 h-3.5 text-slate-700" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rubrics Management Modal */}
      {selectedComp && (
        <Modal
          isOpen={isCriteriaModalOpen}
          onClose={() => setIsCriteriaModalOpen(false)}
          title={`Scoring Rubrics: ${selectedComp.programme_number} - ${selectedComp.name}`}
          maxWidth="xl"
        >
          <div className="space-y-5">
            <p className="text-xs text-slate-400">
              Configure judging criteria and maximum marks for judges evaluating this competition.
            </p>

            {/* Existing Criteria List */}
            <div className="space-y-2">
              {criteria.map((crit, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800"
                >
                  <div>
                    <span className="text-sm font-bold text-white">{crit.name}</span>
                    <span className="text-xs text-slate-400 ml-2 font-mono">
                      Max: {crit.max_marks} pts
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveCriterion(idx)}
                    className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <div className="flex justify-between items-center px-3 py-2 text-xs font-bold text-slate-300">
                <span>Total Score Cap:</span>
                <span className="text-indigo-400 font-mono text-sm">{totalMaxMarks} pts</span>
              </div>
            </div>

            {/* Add New Criterion Line */}
            <div className="pt-4 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={newCritName}
                onChange={(e) => setNewCritName(e.target.value)}
                placeholder="Criterion Name (e.g. Pronunciation)"
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="number"
                value={newCritMax}
                onChange={(e) => setNewCritMax(e.target.value)}
                placeholder="Max"
                className="w-24 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button variant="secondary" size="md" onClick={handleAddCriterion}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setIsCriteriaModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                isLoading={saveCriteriaMutation.isPending}
                onClick={() => saveCriteriaMutation.mutate(criteria)}
              >
                Save Rubrics
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add New Competition Modal */}
      {/* Add Competition Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Competition"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {/* Row 1: Programme Number & Competition Name */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Prog No *
              </label>
              <input
                type="number"
                required
                value={formData.programme_number}
                onChange={(e) => setFormData({ ...formData, programme_number: e.target.value })}
                placeholder="e.g. 61"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 font-mono focus:outline-hidden focus:border-[#0D472D]"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Competition Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Classical Monologue"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#0D472D]"
              />
            </div>
          </div>

          {/* Row 2: Programme Group, Competition Type, Participation Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Programme Group *
              </label>
              <select
                required
                value={formData.programme_group_id}
                onChange={(e) => setFormData({ ...formData, programme_group_id: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#0D472D] cursor-pointer"
              >
                <option value="">Select Group</option>
                {programmeGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Competition Type
              </label>
              <select
                value={formData.competition_type_id}
                onChange={(e) => handleTypeChange(e.target.value, false)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#0D472D] cursor-pointer"
              >
                <option value="">Select Type</option>
                {competitionTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Participation
              </label>
              <select
                value={formData.participation_type}
                onChange={(e) => setFormData({ ...formData, participation_type: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#0D472D] cursor-pointer"
              >
                <option value="INDIVIDUAL">INDIVIDUAL</option>
                <option value="GROUP">GROUP</option>
              </select>
            </div>
          </div>

          {/* Row 3: Quota Configuration */}
          {formData.participation_type === 'GROUP' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Max Participants per Group *
                </label>
                <input
                  type="number"
                  min={2}
                  required
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                  placeholder="e.g. 4"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 font-mono focus:outline-hidden focus:border-[#0D472D]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Max Entries per Team
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.max_entries_per_team}
                  onChange={(e) => setFormData({ ...formData, max_entries_per_team: e.target.value })}
                  placeholder="Leave blank for Unlimited"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 font-mono focus:outline-hidden focus:border-[#0D472D]"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Max Entries per Team
              </label>
              <input
                type="number"
                min={1}
                value={formData.max_entries_per_team}
                onChange={(e) => setFormData({ ...formData, max_entries_per_team: e.target.value })}
                placeholder="Leave blank for Unlimited"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 font-mono focus:outline-hidden focus:border-[#0D472D]"
              />
            </div>
          )}

          {/* Row 4: Description / Format */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Description / Format
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the event format or background..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#0D472D]"
            />
          </div>

          {/* Row 5: Rules / Guidelines */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Rules / Guidelines
            </label>
            <textarea
              rows={2}
              value={formData.rules}
              onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
              placeholder="e.g. Time limit 5 mins, no electronic aids permitted..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#0D472D]"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createCompetitionMutation.isPending}
              className="px-5 py-2 rounded-full bg-[#0D472D] hover:bg-[#07321e] text-white text-xs font-semibold shadow-xs transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
            >
              {createCompetitionMutation.isPending ? 'Creating...' : 'Create Competition'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Competition Modal */}
      {editingComp && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingComp(null);
          }}
          title={`Edit Competition: ${editingComp.programme_number} - ${editingComp.name}`}
          maxWidth="xl"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {/* Row 1: Programme Number & Competition Name */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Prog No *
                </label>
                <input
                  type="number"
                  required
                  value={editFormData.programme_number}
                  onChange={(e) => setEditFormData({ ...editFormData, programme_number: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 font-mono focus:outline-hidden focus:border-[#0D472D]"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Competition Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#0D472D]"
                />
              </div>
            </div>

            {/* Row 2: Programme Group, Competition Type, Participation Type (Clean 3-col grid, Status dropdown removed) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Programme Group *
                </label>
                <select
                  required
                  value={editFormData.programme_group_id}
                  onChange={(e) => setEditFormData({ ...editFormData, programme_group_id: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#0D472D] cursor-pointer"
                >
                  <option value="">Select Group</option>
                  {programmeGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Competition Type
                </label>
                <select
                  value={editFormData.competition_type_id}
                  onChange={(e) => handleTypeChange(e.target.value, true)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#0D472D] cursor-pointer"
                >
                  <option value="">Select Type</option>
                  {competitionTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Participation
                </label>
                <select
                  value={editFormData.participation_type}
                  onChange={(e) => setEditFormData({ ...editFormData, participation_type: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#0D472D] cursor-pointer"
                >
                  <option value="INDIVIDUAL">INDIVIDUAL</option>
                  <option value="GROUP">GROUP</option>
                </select>
              </div>
            </div>

            {/* Row 3: Quota Configuration */}
            {editFormData.participation_type === 'GROUP' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Max Participants per Group *
                  </label>
                  <input
                    type="number"
                    min={2}
                    required
                    value={editFormData.max_participants}
                    onChange={(e) => setEditFormData({ ...editFormData, max_participants: e.target.value })}
                    placeholder="e.g. 4"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 font-mono focus:outline-hidden focus:border-[#0D472D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Max Entries per Team
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editFormData.max_entries_per_team}
                    onChange={(e) => setEditFormData({ ...editFormData, max_entries_per_team: e.target.value })}
                    placeholder="Leave blank for Unlimited"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 font-mono focus:outline-hidden focus:border-[#0D472D]"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Max Entries per Team
                </label>
                <input
                  type="number"
                  min={1}
                  value={editFormData.max_entries_per_team}
                  onChange={(e) => setEditFormData({ ...editFormData, max_entries_per_team: e.target.value })}
                  placeholder="Leave blank for Unlimited"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 font-mono focus:outline-hidden focus:border-[#0D472D]"
                />
              </div>
            )}

            {/* Row 4: Description / Format */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Description / Format
              </label>
              <textarea
                rows={2}
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Event format or details..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#0D472D]"
              />
            </div>

            {/* Row 5: Official Rules & Instructions */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Official Rules & Instructions
              </label>
              <textarea
                rows={2}
                value={editFormData.rules}
                onChange={(e) => setEditFormData({ ...editFormData, rules: e.target.value })}
                placeholder="Specific rules or constraints..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#0D472D]"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  const target = editingComp;
                  setIsEditModalOpen(false);
                  if (target) {
                    handleOpenDelete(target);
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Programme</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingComp(null);
                  }}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateCompetitionMutation.isPending}
                  className="px-5 py-2 rounded-full bg-[#0D472D] hover:bg-[#07321e] text-white text-xs font-semibold shadow-xs transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
                >
                  {updateCompetitionMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingComp && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingComp(null);
          }}
          title="Delete Competition"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="text-xs leading-relaxed font-semibold">
                This action is irreversible. All related criteria, schedule entries, and participation registrations will also be deleted.
              </p>
            </div>

            <p className="text-sm text-slate-300">
              Are you sure you want to delete <span className="font-bold text-white">{deletingComp.programme_number} - {deletingComp.name}</span> ({deletingComp.group_name})?
            </p>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingComp(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                isLoading={deleteCompetitionMutation.isPending}
                onClick={handleConfirmDelete}
              >
                Delete Competition
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
