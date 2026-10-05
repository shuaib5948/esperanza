import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import { Sliders, Award, Edit3, Check } from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';

interface PointRule {
  id: number;
  name: string;
  position: number | null;
  points: number;
  participation_points: number;
  active: boolean;
}

export const PointRulesManagerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPoints, setEditPoints] = useState<string>('0');
  const [editPartPoints, setEditPartPoints] = useState<string>('0');

  // 1. Fetch point rules
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['point-rules'],
    queryFn: async () => {
      const res = await api.get<PointRule[]>('/points/rules');
      return res.data;
    },
  });

  // 2. Update rule mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, points, participation_points }: any) => {
      return api.patch(`/points/rules/${id}`, {
        points: parseFloat(points),
        participation_points: parseFloat(participation_points),
      });
    },
    onSuccess: () => {
      success('Points rule updated successfully');
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['point-rules'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to update rule');
    },
  });

  const startEdit = (rule: PointRule) => {
    setEditingId(rule.id);
    setEditPoints(String(rule.points));
    setEditPartPoints(String(rule.participation_points));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Festival Point Rules</h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure standing points awarded to competing teams for 1st, 2nd, 3rd, and participation.
          </p>
        </div>
      </div>

      <Card className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-bold uppercase text-slate-400">
                <th className="py-3 px-4">Award Title</th>
                <th className="py-3 px-4">Rank Position</th>
                <th className="py-3 px-4">Standing Points</th>
                <th className="py-3 px-4">Participation Bonus</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rules.map((rule) => {
                const isEditing = editingId === rule.id;

                return (
                  <tr key={rule.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-indigo-400" />
                      <span>{rule.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-300">
                      {rule.position ? `#${rule.position}` : 'Any'}
                    </td>
                    <td className="py-3.5 px-4">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.5"
                          value={editPoints}
                          onChange={(e) => setEditPoints(e.target.value)}
                          className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-mono"
                        />
                      ) : (
                        <span className="font-mono font-bold text-indigo-400">
                          {Number(rule.points).toFixed(1)} pts
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.5"
                          value={editPartPoints}
                          onChange={(e) => setEditPartPoints(e.target.value)}
                          className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-mono"
                        />
                      ) : (
                        <span className="font-mono text-slate-400">
                          +{Number(rule.participation_points).toFixed(1)} pts
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            isLoading={updateMutation.isPending}
                            onClick={() =>
                              updateMutation.mutate({
                                id: rule.id,
                                points: editPoints,
                                participation_points: editPartPoints,
                              })
                            }
                          >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            <span>Save</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => startEdit(rule)}
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1" />
                          <span>Edit</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
