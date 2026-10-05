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
        <div>
          <h1 className="text-2xl xl:text-3xl font-bento-title text-slate-900 tracking-[-0.035em] leading-none flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#0D472D]" />
            Participants & Roster
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Festival contestant master directory, chest numbers, house rosters, and categories.
          </p>
        </div>

        <button
          onClick={handleOpenAddParticipant}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0D472D] hover:bg-[#07321e] text-white text-xs font-semibold shadow-xs transition-all hover:scale-[1.02] cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Participant</span>
        </button>
      </div>

      {/* Filter Toolbar — Dropdowns & Search */}
      <div className="bg-white rounded-[20px] p-3.5 border border-slate-100 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Left: Dropdowns & Reset */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Team Dropdown */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Shield className={`w-3.5 h-3.5 ${selectedTeamFilter !== 'ALL' ? 'text-white' : 'text-slate-400'}`} />
              </div>
              <select
                value={selectedTeamFilter}
                onChange={(e) => setSelectedTeamFilter(e.target.value)}
                className={`appearance-none rounded-full pl-9 pr-9 py-2 text-xs font-semibold border transition-all cursor-pointer focus:outline-hidden ${
                  selectedTeamFilter !== 'ALL'
                    ? 'bg-[#0D472D] text-white border-[#0D472D] shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100/80 text-slate-700 border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <option value="ALL">All Houses ({participants.length})</option>
                {teams.map((t) => {
                  const count = participants.filter((p) => p.team_id === t.id).length;
                  return (
                    <option key={t.id} value={String(t.id)} className="bg-white text-slate-800">
                      {t.name} ({count})
                    </option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <ChevronDown className={`w-3.5 h-3.5 ${selectedTeamFilter !== 'ALL' ? 'text-white' : 'text-slate-400'}`} />
              </div>
            </div>

            {/* Category Dropdown */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Layers className={`w-3.5 h-3.5 ${selectedCatFilter !== 'ALL' ? 'text-white' : 'text-slate-400'}`} />
              </div>
              <select
                value={selectedCatFilter}
                onChange={(e) => setSelectedCatFilter(e.target.value)}
                className={`appearance-none rounded-full pl-9 pr-9 py-2 text-xs font-semibold border transition-all cursor-pointer focus:outline-hidden ${
                  selectedCatFilter !== 'ALL'
                    ? 'bg-[#0D472D] text-white border-[#0D472D] shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100/80 text-slate-700 border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <option value="ALL">All Categories ({participants.length})</option>
                {categories.map((c) => {
                  const count = participants.filter((p) => p.category_id === c.id).length;
                  return (
                    <option key={c.id} value={String(c.id)} className="bg-white text-slate-800">
                      {c.name} ({count})
                    </option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <ChevronDown className={`w-3.5 h-3.5 ${selectedCatFilter !== 'ALL' ? 'text-white' : 'text-slate-400'}`} />
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleResetFilters}
              disabled={!isFiltered}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isFiltered
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 shadow-2xs hover:scale-[1.02]'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 opacity-60 cursor-not-allowed'
              }`}
              title={isFiltered ? 'Reset filters and search' : 'No filters applied'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Right: Search Bar with Clear Button (Email removed) */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={participantSearch}
              onChange={(e) => setParticipantSearch(e.target.value)}
              placeholder="Search contestant, reg number..."
              className="w-full bg-slate-50 border border-slate-200/80 rounded-full pl-9 pr-8 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0D472D]"
            />
            {participantSearch && (
              <button
                onClick={() => setParticipantSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Participants Table — Clean Bento Studio Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80">
                <th className="py-3.5 px-4 text-center w-28">Reg No</th>
                <th className="py-3.5 px-4 text-center">Contestant Name</th>
                <th className="py-3.5 px-4 text-center">House / Team</th>
                <th className="py-3.5 px-4 text-center">Category</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {participantsLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    Loading participants directory...
                  </td>
                </tr>
              ) : filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    No participants found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p) => {
                  const regNum = p.registration_number || p.participant_code;
                  const isDiraya = (p.team_name || p.team_code || '').toUpperCase().includes('DIRAYA') || p.team_id === 1;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/90 transition-colors">
                      {/* 3-Digit Registration Number */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono text-xs font-bold text-[#0D472D] bg-[#E6F4EA] border border-emerald-200/80 px-3 py-1 rounded-full inline-block shadow-2xs">
                          {regNum}
                        </span>
                      </td>

                      {/* Contestant Name */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-slate-900 text-[13px]">
                          {p.user_name || p.name}
                        </div>
                      </td>

                      {/* House / Team */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full border inline-block ${
                            isDiraya
                              ? 'bg-[#E6F4EA] text-[#0D472D] border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {p.team_name}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 inline-block">
                          {p.category_name}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full border inline-block ${
                            p.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      {/* Actions: Only Edit button (Delete is inside the Edit Modal) */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenEditParticipant(p)}
                          className="flex items-center justify-center gap-1.5 px-3.5 py-1 rounded-full bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 hover:border-slate-800 shadow-2xs transition-all hover:scale-[1.02] cursor-pointer mx-auto"
                          title="Edit contestant profile"
                        >
                          <Pencil className="w-3 h-3 text-[#0D472D]" />
                          <span>Edit</span>
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
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={newPartData.name}
              onChange={(e) => setNewPartData({ ...newPartData, name: e.target.value })}
              placeholder="e.g. Salman Faris"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#0D472D]"
            />
          </div>

          {/* Row 2: Team Affiliation & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                House / Team *
              </label>
              <select
                required
                value={newPartData.team_id}
                onChange={(e) => setNewPartData({ ...newPartData, team_id: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#0D472D] cursor-pointer"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Category / Division *
              </label>
              <select
                required
                value={newPartData.category_id}
                onChange={(e) => handleAddCategoryChange(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#0D472D] cursor-pointer"
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
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
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
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 font-mono focus:outline-hidden focus:border-[#0D472D]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsAddParticipantOpen(false)}
              className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createParticipantMutation.isPending}
              className="px-5 py-2 rounded-full bg-[#0D472D] hover:bg-[#07321e] text-white text-xs font-semibold shadow-xs transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={editPartData.name}
                onChange={(e) => setEditPartData({ ...editPartData, name: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#0D472D]"
              />
            </div>

            {/* Row 2: Team & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  House / Team *
                </label>
                <select
                  required
                  value={editPartData.team_id}
                  onChange={(e) => setEditPartData({ ...editPartData, team_id: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#0D472D] cursor-pointer"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category / Division *
                </label>
                <select
                  required
                  value={editPartData.category_id}
                  onChange={(e) =>
                    setEditPartData({ ...editPartData, category_id: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#0D472D] cursor-pointer"
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  3-Digit Register Number
                </label>
                <input
                  type="text"
                  value={editPartData.registration_number}
                  onChange={(e) =>
                    setEditPartData({ ...editPartData, registration_number: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 font-mono focus:outline-hidden focus:border-[#0D472D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={editPartData.status}
                  onChange={(e) => setEditPartData({ ...editPartData, status: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#0D472D] cursor-pointer"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            {/* Modal Actions — Delete on left, Cancel and Save on right */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
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
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 transition-colors cursor-pointer"
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
                  className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateParticipantMutation.isPending}
                  className="px-5 py-2 rounded-full bg-[#0D472D] hover:bg-[#07321e] text-white text-xs font-semibold shadow-xs transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
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
            <div className="flex items-center gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
              <p className="text-xs leading-relaxed font-semibold">
                Deleting this participant will also remove their event registrations and attendance records.
              </p>
            </div>

            <p className="text-sm text-slate-700">
              Are you sure you want to permanently delete{' '}
              <span className="font-bold text-slate-900">
                {deletingParticipant.user_name || deletingParticipant.name}
              </span>{' '}
              (Reg No: {deletingParticipant.registration_number || deletingParticipant.participant_code}) from {deletingParticipant.team_name}?
            </p>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteParticipantOpen(false);
                  setDeletingParticipant(null);
                }}
                className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
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
