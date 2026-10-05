import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import { Gavel, UserPlus, Lock, Unlock, ShieldAlert } from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';

export const JudgingOverviewPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [selectedScoreSheetId, setSelectedScoreSheetId] = useState<number | null>(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [judgeId, setJudgeId] = useState<number>(1);
  const [competitionId, setCompetitionId] = useState<number>(1);

  // 1. Fetch judges
  const { data: judges = [], isLoading } = useQuery({
    queryKey: ['judges-list'],
    queryFn: async () => {
      const res = await api.get<any[]>('/judges');
      return res.data;
    },
  });

  // 2. Fetch competitions
  const { data: competitions = [] } = useQuery({
    queryKey: ['competitions-list'],
    queryFn: async () => {
      const res = await api.get<any[]>('/competitions');
      return res.data;
    },
  });

  // 3. Assign judge mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      return api.post('/judges/assign', {
        judge_id: judgeId,
        competition_id: competitionId,
      });
    },
    onSuccess: () => {
      success('Judge assigned to competition successfully');
      setIsAssignModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['judges-list'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to assign judge');
    },
  });

  // 4. Admin unlock mutation
  const unlockMutation = useMutation({
    mutationFn: async () => {
      if (!selectedScoreSheetId) return;
      return api.post(`/judges/scoresheets/${selectedScoreSheetId}/unlock`, {
        reason: unlockReason,
      });
    },
    onSuccess: () => {
      success('Score sheet unlocked with audit log recording');
      setIsUnlockModalOpen(false);
      setUnlockReason('');
      queryClient.invalidateQueries({ queryKey: ['judges-list'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to unlock score sheet');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Judges & Scoring Overview</h1>
          <p className="text-sm text-slate-400 mt-1">
            Assign evaluation panels and manage audited score locks.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={() => setIsAssignModalOpen(true)}>
          <UserPlus className="w-4 h-4 mr-1.5" />
          <span>Assign Judge to Event</span>
        </Button>
      </div>

      {/* Judges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {judges.map((j) => (
          <Card key={j.id} className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Gavel className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{j.user_name || j.name}</h3>
                    <Badge variant={j.judge_type === 'OFF_STAGE' ? 'info' : 'primary'} size="sm">
                      {j.judge_type === 'OFF_STAGE' ? 'Off-Stage Panel' : j.judge_type === 'STAGE' ? 'Stage Panel' : 'General'}
                    </Badge>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{j.judge_code}</span>
                </div>
              </div>
              <Badge variant="success" size="sm">
                {j.status}
              </Badge>
            </div>

            <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <strong className="text-slate-400 block mb-0.5">Qualification:</strong>
              {j.qualification || 'Certified Festival Evaluator'}
            </p>
          </Card>
        ))}
      </div>

      {/* Assign Judge Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Judge to Competition"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            assignMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Select Judge
            </label>
            <select
              value={judgeId}
              onChange={(e) => setJudgeId(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {judges.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.user_name} ({j.judge_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Select Competition
            </label>
            <select
              value={competitionId}
              onChange={(e) => setCompetitionId(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.programme_number} - {c.name} ({c.group_name})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={assignMutation.isPending}>
              Assign Judge
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
