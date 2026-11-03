import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  RotateCcw,
  X,
  Layers,
  Shield,
  ChevronDown,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal.js';
import { THEME } from '../../theme/theme.js';

interface Participant {
  id: number;
  user_id: number;
  participant_code: string;
  registration_number?: string;
  name?: string;
  user_name?: string;
  email?: string;
  team_id: number;
  team_name: string;
  team_code: string;
  category_id: number;
  category_name: string;
  category_code?: string;
  class_name?: string;
  status: string;
}

export const ParticipantsManagerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  // Filter States
  const [participantSearch, setParticipantSearch] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('ALL');

  // Modals State
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [isEditParticipantOpen, setIsEditParticipantOpen] = useState(false);
  const [deletingParticipant, setDeletingParticipant] = useState<Participant | null>(null);
  const [isDeleteParticipantOpen, setIsDeleteParticipantOpen] = useState(false);

  // Forms State (Email field removed)
  const [newPartData, setNewPartData] = useState({
    name: '',
    password: 'Esperanza@2026',
    team_id: '1',
    category_id: '1',
    registration_number: '',
    class_name: '',
  });

  const [editPartData, setEditPartData] = useState({
    name: '',
    team_id: '1',
    category_id: '1',
    registration_number: '',
    class_name: '',
    status: 'ACTIVE',
  });

  // Queries
  const { data: participantsResponse, isLoading: participantsLoading } = useQuery<any>({
    queryKey: ['admin-participants'],
    queryFn: async () => {
      const res = await api.get<any>('/participants?limit=200');
      return res.data;
    },
  });

  const participants: Participant[] = useMemo(() => {
    if (!participantsResponse) return [];
    if (Array.isArray(participantsResponse)) return participantsResponse;
    if (Array.isArray(participantsResponse.participants)) return participantsResponse.participants;
    if (Array.isArray(participantsResponse.data)) return participantsResponse.data;
    return [];
  }, [participantsResponse]);

  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await api.get<any[]>('/teams');
      return res.data;
    },
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<any[]>('/participant-categories');
      return res.data;
    },
  });

  // Helper to compute next 3-digit registration number based on category
  const getNextRegistrationNumber = (catId: string | number) => {
    const selectedCat = categories.find((c) => String(c.id) === String(catId));
    const catCode = (selectedCat?.code || selectedCat?.name || '').toUpperCase();
    let baseNum = 100;
    if (catCode.includes('J1') || catCode === '1') baseNum = 100;
    else if (catCode.includes('J2') || catCode === '2') baseNum = 200;
    else if (catCode.includes('SEN')) baseNum = 300;
    else baseNum = 300;

    let maxNum = baseNum;
    participants.forEach((p) => {
      const reg = p.registration_number || p.participant_code;
      const num = parseInt(reg?.replace(/\D/g, '') || '', 10);
      if (!isNaN(num) && num >= baseNum && num < baseNum + 100) {
        if (num > maxNum) maxNum = num;
      }
    });
    return String(maxNum + 1);
  };

  // Open Add Participant Modal
  const handleOpenAddParticipant = () => {
    const defaultTeamId = teams[0]?.id ? String(teams[0].id) : '1';
    const defaultCatId = categories[0]?.id ? String(categories[0].id) : '1';
    const nextReg = getNextRegistrationNumber(defaultCatId);

    setNewPartData({
      name: '',
      password: 'Esperanza@2026',
      team_id: defaultTeamId,
      category_id: defaultCatId,
      registration_number: nextReg,
      class_name: '',
    });
    setIsAddParticipantOpen(true);
  };

  // When changing category in Add Modal, update 3-digit registration number
  const handleAddCategoryChange = (catId: string) => {
    const nextReg = getNextRegistrationNumber(catId);
    setNewPartData((prev) => ({
      ...prev,
      category_id: catId,
      registration_number: nextReg,
    }));
  };

  // Mutations - Participants
  const createParticipantMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/participants', payload);
    },
    onSuccess: () => {
      success('Participant created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-participants'] });
      setIsAddParticipantOpen(false);
    },
    onError: (err: any) => {
      error(err.message || 'Failed to create participant');
    },
  });

  const updateParticipantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return api.patch(`/participants/${id}`, data);
    },
    onSuccess: () => {
      success('Participant updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-participants'] });
      setIsEditParticipantOpen(false);
      setEditingParticipant(null);
    },
    onError: (err: any) => {
      error(err.message || 'Failed to update participant');
    },
  });

  const deleteParticipantMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/participants/${id}`);
    },
    onSuccess: () => {
      success('Participant deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-participants'] });
      setIsDeleteParticipantOpen(false);
      setDeletingParticipant(null);
    },
    onError: (err: any) => {
      error(err.message || 'Failed to delete participant');
    },
  });

  // Handlers
  const handleOpenEditParticipant = (p: Participant) => {
    setEditingParticipant(p);
    setEditPartData({
      name: p.user_name || p.name || '',
      team_id: String(p.team_id),
      category_id: String(p.category_id),
      registration_number: p.registration_number || p.participant_code || '',
      class_name: p.class_name || '',
      status: p.status || 'ACTIVE',
    });
    setIsEditParticipantOpen(true);
  };

  const handleEditParticipantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant) return;
    if (!editPartData.name.trim()) {
      error('Name is required');
      return;
    }

    updateParticipantMutation.mutate({
      id: editingParticipant.id,
      data: {
        name: editPartData.name.trim(),
        team_id: parseInt(editPartData.team_id, 10),
        category_id: parseInt(editPartData.category_id, 10),
        registration_number: editPartData.registration_number.trim() || null,
        class_name: editPartData.class_name.trim() || null,
        status: editPartData.status,
      },
    });
  };

  const handleAddParticipantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartData.name.trim()) {
      error('Name is required');
      return;
    }

    const payload = {
      name: newPartData.name.trim(),
      password: newPartData.password || 'Esperanza@2026',
      team_id: parseInt(newPartData.team_id, 10),
      category_id: parseInt(newPartData.category_id, 10),
      registration_number: newPartData.registration_number.trim() || undefined,
      class_name: newPartData.class_name.trim() || undefined,
    };

    createParticipantMutation.mutate(payload);
  };

  // KPIs
  const dirayaCount = useMemo(
    () => participants.filter((p) => (p.team_name || p.team_code || '').toUpperCase().includes('DIRAYA') || p.team_id === 1).length,
    [participants]
  );
  const rivayaCount = useMemo(
    () => participants.filter((p) => (p.team_name || p.team_code || '').toUpperCase().includes('RIVAYA') || p.team_id === 2).length,
    [participants]
  );

  // Filtered lists (search without email)
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const pName = p.user_name || p.name || '';
      const reg = p.registration_number || p.participant_code || '';

      const matchSearch =
        participantSearch === '' ||
        pName.toLowerCase().includes(participantSearch.toLowerCase()) ||
        reg.toLowerCase().includes(participantSearch.toLowerCase());

      const matchTeam =
        selectedTeamFilter === 'ALL' || String(p.team_id) === selectedTeamFilter;
      const matchCat =
        selectedCatFilter === 'ALL' || String(p.category_id) === selectedCatFilter;

      return matchSearch && matchTeam && matchCat;
    });
  }, [participants, participantSearch, selectedTeamFilter, selectedCatFilter]);

  const isFiltered =
    selectedTeamFilter !== 'ALL' ||
    selectedCatFilter !== 'ALL' ||
    participantSearch.trim() !== '';

  const handleResetFilters = () => {
    setSelectedTeamFilter('ALL');
    setSelectedCatFilter('ALL');
    setParticipantSearch('');
  };

  return (
    <div className="space-y-5">
      {/* Top Header with Global Dashboard Style Action Button on Top Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-xs shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bento-title font-bold text-white tracking-tight leading-none">
              Participants
            </h1>
            <p className="text-xs text-amber-200/60 font-medium mt-1">
              Contestants, chest numbers & houses
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAddParticipant}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full ${THEME.classes.primaryBtn} text-xs font-black transition-all hover:scale-[1.02] cursor-pointer shrink-0`}
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Participant</span>
        </button>
      </div>

      {/* Filter Toolbar — Dropdowns & Search */}
      <div className="bg-[#0A0A0A] rounded-[20px] p-3.5 border border-white/[0.08] shadow-xl shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Left: Dropdowns & Reset */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Team Dropdown */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-amber-200/60">
                <Shield className={`w-3.5 h-3.5 ${selectedTeamFilter !== 'ALL' ? 'text-slate-950' : 'text-amber-200/60'}`} />
              </div>
              <select
                value={selectedTeamFilter}
                onChange={(e) => setSelectedTeamFilter(e.target.value)}
                className={`appearance-none rounded-full pl-9 pr-9 py-2 text-xs font-semibold border transition-all cursor-pointer focus:outline-hidden ${
                  selectedTeamFilter !== 'ALL'
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 border-amber-400 shadow-xs font-bold'
                    : 'bg-[#121212] hover:bg-white/10/80 text-amber-200 border-amber-500/30 hover:border-amber-500/30'
                }`}
              >
                <option value="ALL">All Houses ({participants.length})</option>
                {teams.map((t) => {
                  const count = participants.filter((p) => p.team_id === t.id).length;
                  return (
                    <option key={t.id} value={String(t.id)} className="bg-[#0A0A0A] text-amber-100">
                      {t.name} ({count})
                    </option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <ChevronDown className={`w-3.5 h-3.5 ${selectedTeamFilter !== 'ALL' ? 'text-slate-950' : 'text-amber-200/60'}`} />
              </div>
            </div>

            {/* Category Dropdown */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-amber-200/60">
                <Layers className={`w-3.5 h-3.5 ${selectedCatFilter !== 'ALL' ? 'text-slate-950' : 'text-amber-200/60'}`} />
              </div>
              <select
                value={selectedCatFilter}
                onChange={(e) => setSelectedCatFilter(e.target.value)}
                className={`appearance-none rounded-full pl-9 pr-9 py-2 text-xs font-semibold border transition-all cursor-pointer focus:outline-hidden ${
                  selectedCatFilter !== 'ALL'
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 border-amber-400 shadow-xs font-bold'
                    : 'bg-[#121212] hover:bg-white/10/80 text-amber-200 border-amber-500/30 hover:border-amber-500/30'
                }`}
              >
                <option value="ALL">All Categories ({participants.length})</option>
                {categories.map((c) => {
                  const count = participants.filter((p) => p.category_id === c.id).length;
                  return (
                    <option key={c.id} value={String(c.id)} className="bg-[#0A0A0A] text-amber-100">
                      {c.name} ({count})
                    </option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <ChevronDown className={`w-3.5 h-3.5 ${selectedCatFilter !== 'ALL' ? 'text-slate-950' : 'text-amber-200/60'}`} />
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleResetFilters}
              disabled={!isFiltered}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isFiltered
                  ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/15 border border-rose-500/30 shadow-2xs hover:scale-[1.02]'
                  : 'bg-[#121212] text-amber-200/60 border border-white/[0.08] opacity-60 cursor-not-allowed'
              }`}
              title={isFiltered ? 'Reset filters and search' : 'No filters applied'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Right: Search Bar with Clear Button (Email removed) */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 text-amber-200/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={participantSearch}
              onChange={(e) => setParticipantSearch(e.target.value)}
              placeholder="Search contestant, reg number..."
              className="w-full bg-[#121212] border border-white/[0.08]/80 rounded-full pl-9 pr-8 py-2 text-xs font-medium text-amber-100 placeholder-slate-400 focus:outline-hidden focus:border-amber-500"
            />
            {participantSearch && (
              <button
                onClick={() => setParticipantSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-200/60 hover:text-amber-200/60 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Participants Container: Mobile Cards (<md) & Desktop Table (>=md) */}
      <div className="bg-[#0A0A0A] rounded-2xl border border-white/[0.08] shadow-xl overflow-hidden">
        {/* Mobile View: Clean Contestant Cards */}
        <div className="md:hidden divide-y divide-white/[0.04]">
          {participantsLoading ? (
            <div className="py-8 text-center text-amber-200/60 font-medium text-xs">
              Loading participants directory...
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="py-8 text-center text-amber-200/60 font-medium text-xs">
              No participants found matching the criteria.
            </div>
          ) : (
            filteredParticipants.map((p) => {
              const regNum = p.registration_number || p.participant_code;
              const isDiraya = (p.team_name || p.team_code || '').toUpperCase().includes('DIRAYA') || p.team_id === 1;

              return (
                <div key={p.id} className="p-3.5 space-y-2 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-amber-400 text-xs bg-amber-500/10 px-2 py-0.5 rounded-md border border-white/[0.08]">
                      Reg {regNum}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300">
                      <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                      {p.status === 'ACTIVE' ? 'Active' : p.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-sm">
                    {p.user_name || p.name}
                  </h3>

                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 font-bold text-xs ${isDiraya ? 'text-emerald-300' : 'text-rose-300'}`}>
                        <span className={`w-2 h-2 rounded-full ${isDiraya ? 'bg-[#00E676] shadow-[0_0_6px_rgba(0,230,118,0.5)]' : 'bg-[#FF2A6D] shadow-[0_0_6px_rgba(255,42,109,0.5)]'}`} />
                        {p.team_name}
                      </span>
                      <span className="text-white/20">•</span>
                      <span className="text-amber-200/70 font-medium">
                        {p.category_name || 'General'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenEditParticipant(p)}
                      className="p-1.5 rounded-lg text-amber-200/60 hover:text-white bg-[#121212] border border-white/[0.08] transition-colors cursor-pointer"
                      title="Edit contestant profile"
                    >
                      <Pencil className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[580px]">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] font-bold uppercase tracking-wider text-amber-300/70 bg-[#121212]">
                <th className="py-3 px-4 text-left w-20 font-bold">Reg No</th>
                <th className="py-3 px-4 text-left font-bold">Contestant Name</th>
                <th className="py-3 px-4 text-left font-bold">House / Team</th>
                <th className="py-3 px-4 text-left font-bold">Category</th>
                <th className="py-3 px-4 text-left font-bold">Status</th>
                <th className="py-3 px-4 text-right w-20 font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {participantsLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-amber-200/60 font-medium">
                    Loading participants directory...
                  </td>
                </tr>
              ) : filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-amber-200/60 font-medium">
                    No participants found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p) => {
                  const regNum = p.registration_number || p.participant_code;
                  const isDiraya = (p.team_name || p.team_code || '').toUpperCase().includes('DIRAYA') || p.team_id === 1;

                  return (
                    <tr key={p.id} className="hover:bg-white/[0.04] transition-colors">
                      {/* Registration Number */}
                      <td className="py-3 px-4 text-left font-mono font-bold text-amber-400">
                        {regNum}
                      </td>

                      {/* Contestant Name */}
                      <td className="py-3 px-4 text-left">
                        <div className="font-bold text-white text-sm">
                          {p.user_name || p.name}
                        </div>
                      </td>

                      {/* House / Team */}
                      <td className="py-3 px-4 text-left">
                        <span className={`inline-flex items-center gap-1.5 font-bold text-xs ${isDiraya ? 'text-emerald-300' : 'text-rose-300'}`}>
                          <span className={`w-2 h-2 rounded-full ${isDiraya ? 'bg-[#00E676] shadow-[0_0_6px_rgba(0,230,118,0.5)]' : 'bg-[#FF2A6D] shadow-[0_0_6px_rgba(255,42,109,0.5)]'}`} />
                          {p.team_name}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-left text-amber-200/80 font-medium">
                        {p.category_name || '—'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-left">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300">
                          <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                          {p.status === 'ACTIVE' ? 'Active' : p.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEditParticipant(p)}
                          className="p-1.5 rounded-lg text-amber-200/60 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                          title="Edit contestant profile"
                        >
                          <Pencil className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODALS SECTION                                                 */}
      {/* ============================================================== */}

      {/* Add Participant Modal (Email removed, 3-digit series auto-assigned) */}
      <Modal
        isOpen={isAddParticipantOpen}
        onClose={() => setIsAddParticipantOpen(false)}
        title="Add New Participant"
        maxWidth="lg"
      >
        <form onSubmit={handleAddParticipantSubmit} className="space-y-4">
          {/* Row 1: Full Name */}
          <div>
            <label className="block text-xs font-bold text-amber-200 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={newPartData.name}
              onChange={(e) => setNewPartData({ ...newPartData, name: e.target.value })}
              placeholder="e.g. Salman Faris"
              className="w-full px-3.5 py-2 bg-[#121212] border border-white/[0.08] rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Row 2: Team Affiliation & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-amber-200 uppercase tracking-wider mb-1.5">
                House / Team *
              </label>
              <select
                required
                value={newPartData.team_id}
                onChange={(e) => setNewPartData({ ...newPartData, team_id: e.target.value })}
                className="w-full px-3.5 py-2 bg-[#121212] border border-white/[0.08] rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-200 uppercase tracking-wider mb-1.5">
                Category / Division *
              </label>
              <select
                required
                value={newPartData.category_id}
                onChange={(e) => handleAddCategoryChange(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#121212] border border-white/[0.08] rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: 3-Digit Registration Number */}
          <div>
            <label className="block text-xs font-bold text-amber-200 uppercase tracking-wider mb-1.5">
              3-Digit Register Number *
            </label>
            <input
              type="text"
              required
              value={newPartData.registration_number}
              onChange={(e) =>
                setNewPartData({ ...newPartData, registration_number: e.target.value })
              }
              placeholder="e.g. 101, 201, 301..."
              className="w-full px-3.5 py-2 bg-[#121212] border border-white/[0.08] rounded-xl text-xs font-semibold text-white font-mono focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/[0.08] flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsAddParticipantOpen(false)}
              className="px-4 py-2 rounded-full text-xs font-semibold text-amber-200/60 hover:bg-[#121212] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createParticipantMutation.isPending}
              className={`px-5 py-2 rounded-full ${THEME.classes.primaryBtn} text-xs font-black transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50`}
            >
              {createParticipantMutation.isPending ? 'Creating...' : 'Create Participant'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Participant Modal (Email removed, Delete button placed on bottom-left) */}
      {editingParticipant && (
        <Modal
          isOpen={isEditParticipantOpen}
          onClose={() => {
            setIsEditParticipantOpen(false);
            setEditingParticipant(null);
          }}
          title={`Edit Contestant: ${editingParticipant.user_name || editingParticipant.name}`}
          maxWidth="lg"
        >
          <form onSubmit={handleEditParticipantSubmit} className="space-y-4">
            {/* Row 1: Full Name */}
            <div>
              <label className="block text-xs font-bold text-amber-200 uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={editPartData.name}
                onChange={(e) => setEditPartData({ ...editPartData, name: e.target.value })}
                className="w-full px-3.5 py-2 bg-[#121212] border border-white/[0.08] rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>

            {/* Row 2: Team & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-amber-200 uppercase tracking-wider mb-1.5">
                  House / Team *
                </label>
                <select
                  required
                  value={editPartData.team_id}
                  onChange={(e) => setEditPartData({ ...editPartData, team_id: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#121212] border border-white/[0.08] rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-200 uppercase tracking-wider mb-1.5">
                  Category / Division *
                </label>
                <select
                  required
                  value={editPartData.category_id}
                  onChange={(e) =>
                    setEditPartData({ ...editPartData, category_id: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-[#121212] border border-white/[0.08] rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: 3-Digit Register Number & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-amber-200 uppercase tracking-wider mb-1.5">
                  3-Digit Register Number
                </label>
                <input
                  type="text"
                  value={editPartData.registration_number}
                  onChange={(e) =>
                    setEditPartData({ ...editPartData, registration_number: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-[#121212] border border-white/[0.08] rounded-xl text-xs font-semibold text-white font-mono focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-200 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={editPartData.status}
                  onChange={(e) => setEditPartData({ ...editPartData, status: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#121212] border border-white/[0.08] rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            {/* Modal Actions — Delete on left, Cancel and Save on right */}
            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  const target = editingParticipant;
                  setIsEditParticipantOpen(false);
                  if (target) {
                    setDeletingParticipant(target);
                    setIsDeleteParticipantOpen(true);
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-rose-300 hover:bg-rose-500/15 border border-rose-500/30 hover:border-rose-500/30 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Participant</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditParticipantOpen(false);
                    setEditingParticipant(null);
                  }}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-amber-200/60 hover:bg-[#121212] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateParticipantMutation.isPending}
                  className={`px-5 py-2 rounded-full ${THEME.classes.primaryBtn} text-xs font-black transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50`}
                >
                  {updateParticipantMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingParticipant && (
        <Modal
          isOpen={isDeleteParticipantOpen}
          onClose={() => {
            setIsDeleteParticipantOpen(false);
            setDeletingParticipant(null);
          }}
          title="Delete Participant"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-300" />
              <p className="text-xs leading-relaxed font-semibold">
                This will remove their event registrations and attendance records.
              </p>
            </div>

            <p className="text-sm text-amber-200">
              Are you sure you want to permanently delete{' '}
              <span className="font-bold text-white">
                {deletingParticipant.user_name || deletingParticipant.name}
              </span>{' '}
              (Reg No: {deletingParticipant.registration_number || deletingParticipant.participant_code}) from {deletingParticipant.team_name}?
            </p>

            <div className="pt-4 border-t border-white/[0.08] flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteParticipantOpen(false);
                  setDeletingParticipant(null);
                }}
                className="px-4 py-2 rounded-full text-xs font-semibold text-amber-200/60 hover:bg-[#121212] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteParticipantMutation.isPending}
                onClick={() => deleteParticipantMutation.mutate(deletingParticipant.id)}
                className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
              >
                {deleteParticipantMutation.isPending ? 'Deleting...' : 'Delete Participant'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
