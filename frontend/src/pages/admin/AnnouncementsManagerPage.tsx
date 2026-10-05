import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import { Megaphone, Plus, Trash2, Calendar, Radio } from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';

export const AnnouncementsManagerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState<string>('ALL');

  // 1. Fetch announcements
  const { data: announcements = [], isLoading } = useQuery({
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
    onSuccess: () => {
      success('Announcement broadcast successfully!');
      setIsAddModalOpen(false);
      setTitle('');
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
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
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to delete announcement');
    },
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Festival Announcements</h1>
          <p className="text-sm text-slate-400 mt-1">
            Broadcast urgent schedule updates and notifications targeted by role.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          <span>New Announcement</span>
        </Button>
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <Card className="text-center py-12 text-slate-500 text-sm">
            No announcements currently active.
          </Card>
        ) : (
          announcements.map((a) => (
            <Card key={a.id} className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.target_role ? 'primary' : 'warning'} size="sm">
                      {a.target_role ? `Audience: ${a.target_role}` : 'All Attendees'}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1.5">{a.title}</h3>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(a.id)}
                  className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                {a.content}
              </p>
            </Card>
          ))
        )}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Broadcast Festival Announcement"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Stage 2 Venue Timing Delay"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Target Audience
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Users (Public Broadcast)</option>
              <option value="TEAM_LEADER">Team Leaders Only</option>
              <option value="PARTICIPANT">Participants Only</option>
              <option value="JUDGE">Judges Only</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Message Content
            </label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Detailed notice instructions..."
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending}>
              Broadcast
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
