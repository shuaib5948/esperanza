import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Megaphone,
  Plus,
  Trash2,
  Users,
  Shield,
  Gavel,
  Globe,
  Radio,
  Search,
  ChevronRight,
  Clock,
  Sparkles,
  Inbox,
  Send,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal.js';
import { THEME } from '../../theme/theme.js';

export const AnnouncementsManagerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState<string>('ALL');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null);

  // 1. Fetch announcements
  const { data: announcements = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const res = await api.get<any[]>('/announcements');
      return res.data;
    },
  });

  // 2. Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      return api.post('/announcements', {
        title,
        content,
        target_role: targetRole === 'ALL' ? null : targetRole,
        status: 'PUBLISHED',
      });
    },
    onSuccess: (res: any) => {
      success('Announcement broadcasted');
      setIsAddModalOpen(false);
      setTitle('');
      setContent('');
      setTargetRole('ALL');
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      if (res?.data) {
        setSelectedAnnouncement(res.data);
      }
    },
    onError: (err: any) => {
      error(err.message || 'Failed to post announcement');
    },
  });

  // 3. Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/announcements/${id}`);
    },
    onSuccess: () => {
      success('Announcement removed');
      setSelectedAnnouncement(null);
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to delete announcement');
    },
  });

  const roleMeta = (role: string | null) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'Admins', icon: Shield, chip: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      case 'TEAM_LEADER':
        return { label: 'House Leaders', icon: Users, chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'PARTICIPANT':
        return { label: 'Participants', icon: Users, chip: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
      case 'JUDGE':
        return { label: 'Judges', icon: Gavel, chip: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
      default:
        return { label: 'Public', icon: Globe, chip: 'bg-[#121212] text-amber-200 border-white/[0.08]' };
    }
  };

  const filtered = announcements.filter((a) => {
    const matchesRole =
      filterRole === 'ALL' ||
      (filterRole === 'PUBLIC' && !a.target_role) ||
      a.target_role === filterRole;

    const matchesSearch =
      !searchTerm.trim() ||
      a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.content?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesRole && matchesSearch;
  });

  // Keep first item selected if none selected
  const activeItem =
    selectedAnnouncement && announcements.some((a) => a.id === selectedAnnouncement.id)
      ? selectedAnnouncement
      : filtered[0] || null;

  return (
    <div className="space-y-4">
      {/* 1. Header Bar: Minimal, Direct & Beautiful */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-xs">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bento-title font-bold text-white tracking-tight leading-none">
              Announcements
            </h1>
            <p className="text-xs text-amber-200/60 font-medium mt-1">
              Live festival broadcasts
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${THEME.classes.primaryBtn} text-xs font-black transition-all hover:scale-[1.02] cursor-pointer shadow-xs`}
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Announcement</span>
          </button>
        )}
      </div>

      {/* 2. Standard Master-Detail Experience */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Left Column (5 Cols): Feed List */}
        <div className="lg:col-span-5 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-3 flex flex-col gap-2.5">
          {/* Quick Filter & Search Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-amber-200/60" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#121212] border border-white/[0.08] rounded-xl text-xs text-amber-100 placeholder-slate-400 focus:outline-hidden focus:border-amber-400 font-medium"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-2.5 py-1.5 bg-[#121212] border border-white/[0.08] rounded-xl text-[11px] font-bold text-amber-200 cursor-pointer focus:outline-hidden"
            >
              <option value="ALL">All ({announcements.length})</option>
              <option value="PUBLIC">Public</option>
              <option value="TEAM_LEADER">Houses</option>
              <option value="PARTICIPANT">Contestants</option>
              <option value="JUDGE">Judges</option>
            </select>
          </div>

          {/* List items */}
          <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-amber-200/60">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center space-y-1 text-amber-200/60">
                <Inbox className="w-7 h-7 mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-amber-200/60">No notices</p>
              </div>
            ) : (
              filtered.map((item) => {
                const meta = roleMeta(item.target_role);
                const Icon = meta.icon;
                const isSelected = activeItem?.id === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedAnnouncement(item)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-left relative ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/30 shadow-2xs'
                        : 'bg-[#0A0A0A] hover:bg-[#121212] border-white/[0.08] hover:border-white/[0.14]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.chip}`}>
                        <Icon className="w-2.5 h-2.5" />
                        <span>{meta.label}</span>
                      </span>
                      <span className="text-[10px] font-medium text-amber-200/60 shrink-0">
                        {new Date(item.created_at).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        }).toLowerCase()}
                      </span>
                    </div>

                    <h4 className="text-xs font-bento-title font-bold text-white mt-1.5 truncate">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-amber-200/60 line-clamp-2 mt-0.5 leading-normal">
                      {item.content}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (7 Cols): Active Reading Pane */}
        <div className="lg:col-span-7 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-5 min-h-[400px] flex flex-col justify-between">
          {activeItem ? (
            <div className="space-y-4">
              {/* Reader Header */}
              <div className="flex items-start justify-between pb-3.5 border-b border-white/[0.08] gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const meta = roleMeta(activeItem.target_role);
                      const Icon = meta.icon;
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${meta.chip}`}>
                          <Icon className="w-3 h-3" />
                          <span>Target: {meta.label}</span>
                        </span>
                      );
                    })()}
                    <span className="text-xs text-amber-200/60 font-medium">
                      {new Date(activeItem.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bento-title font-bold text-white pt-1 leading-snug">
                    {activeItem.title}
                  </h2>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this broadcast?')) {
                        deleteMutation.mutate(activeItem.id);
                      }
                    }}
                    title="Delete announcement"
                    className="p-2 rounded-xl text-amber-200/60 hover:text-rose-300 hover:bg-rose-500/15 transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Reader Body */}
              <div className="p-4 rounded-xl bg-[#121212] border border-white/[0.08] text-xs sm:text-sm text-amber-200 leading-relaxed whitespace-pre-wrap font-sans">
                {activeItem.content}
              </div>

              {/* Telemetry Footer */}
              <div className="pt-2 flex items-center justify-between text-[11px] text-amber-200/60">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Verified Stage Dispatch
                </span>
                <span className="font-mono text-[10px]">ID {activeItem.id}</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-amber-200/60">
              <Megaphone className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-amber-200/60">Select an announcement</p>
              <span className="text-[11px] text-amber-200/60">Read the full broadcast details here</span>
            </div>
          )}
        </div>
      </div>

      {/* Broadcast Creation Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Broadcast Notice"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-3.5"
        >
          <div>
            <label className="block text-xs font-bold text-amber-200 mb-1">
              Notice Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Stage 2 Timing Update"
              className="w-full px-3.5 py-2 bg-[#121212] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-amber-400 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-amber-200 mb-1">
              Audience
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#121212] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-400 font-medium"
            >
              <option value="ALL">Public (All Attendees)</option>
              <option value="TEAM_LEADER">House Leaders (Diraya & Rivaya)</option>
              <option value="PARTICIPANT">Participants Only</option>
              <option value="JUDGE">Judges Only</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-amber-200 mb-1">
              Message
            </label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type message content..."
              className="w-full px-3.5 py-2 bg-[#121212] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-amber-400 font-medium"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-200/60 hover:bg-[#121212] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full ${THEME.classes.primaryBtn} text-xs font-black transition-all cursor-pointer`}
            >
              <Send className="w-3 h-3 stroke-[2.5]" />
              <span>Broadcast</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
