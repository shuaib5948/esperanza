import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import { Sliders, Award, Edit3, Check, X } from 'lucide-react';
import { THEME } from '../../theme/theme.js';

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
  const { data: rules = [], isLoading } = useQuery<PointRule[]>({
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
      success('Point rule updated');
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
    <div className="space-y-4 max-w-4xl">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-xs">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bento-title font-bold text-white tracking-tight leading-none">
              Point Rules
            </h1>
            <p className="text-xs text-amber-200/60 font-medium mt-1">
              Scoring allocations & rank points
            </p>
          </div>
        </div>
      </div>

      {/* 2. Main Rules Container: Mobile Cards (<md) & Desktop Table (>=md) */}
      <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl shadow-xl shadow-xs overflow-hidden">
        {/* Mobile View: Rule Cards (<md) */}
        <div className="md:hidden divide-y divide-white/[0.04]">
          {isLoading ? (
            <div className="py-8 text-center text-amber-200/60 text-xs">
              Loading rules...
            </div>
          ) : (
            rules.map((rule) => {
              const isEditing = editingId === rule.id;

              return (
                <div key={rule.id} className="p-3.5 space-y-2 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white text-sm flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-500" />
                      {rule.name}
                    </span>
                    <span className="font-mono text-xs text-amber-200/60 font-bold bg-[#121212] px-2 py-0.5 rounded-md border border-white/[0.08]">
                      Rank {rule.position || 'Any'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="number"
                          step="0.5"
                          value={editPoints}
                          onChange={(e) => setEditPoints(e.target.value)}
                          className="w-16 px-2 py-1 bg-[#121212] border border-amber-400 rounded-lg text-xs font-mono font-bold text-white"
                        />
                        <span className="text-[10px] text-amber-200/60">pts</span>
                        <input
                          type="number"
                          step="0.5"
                          value={editPartPoints}
                          onChange={(e) => setEditPartPoints(e.target.value)}
                          className="w-16 px-2 py-1 bg-[#121212] border border-amber-400 rounded-lg text-xs font-mono font-bold text-white"
                        />
                        <span className="text-[10px] text-amber-200/60">bonus</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-amber-300">
                          {parseFloat(Number(rule.points).toFixed(1))} pts
                        </span>
                        <span className="font-mono text-amber-200/60 text-[11px]">
                          +{parseFloat(Number(rule.participation_points).toFixed(1))} participation
                        </span>
                      </div>
                    )}

                    <div>
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              updateMutation.mutate({
                                id: rule.id,
                                points: editPoints,
                                participation_points: editPartPoints,
                              })
                            }
                            className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded-md bg-[#121212] text-amber-200/60 hover:text-white cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(rule)}
                          className="p-1.5 rounded-lg text-amber-200/60 hover:text-white bg-[#121212] border border-white/[0.08] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Rules Table (>=md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[520px]">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] font-bento-title uppercase tracking-wider text-amber-200/60 bg-[#121212]">
                <th className="py-3 px-4 font-bold">Award</th>
                <th className="py-3 px-4 font-bold">Rank</th>
                <th className="py-3 px-4 font-bold">Points</th>
                <th className="py-3 px-4 font-bold">Participation Points</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-amber-200/60">
                    Loading rules...
                  </td>
                </tr>
              ) : (
                rules.map((rule) => {
                  const isEditing = editingId === rule.id;

                  return (
                    <tr key={rule.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-600" />
                        <span>{rule.name}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-200/60">
                        {rule.position ? `${rule.position}` : 'Any'}
                      </td>
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.5"
                            value={editPoints}
                            onChange={(e) => setEditPoints(e.target.value)}
                            className="w-20 px-2 py-1 bg-[#0A0A0A] border border-amber-400 rounded-lg text-xs font-mono font-bold text-white focus:outline-hidden"
                          />
                        ) : (
                          <span className="font-mono font-bold text-amber-300">
                            {parseFloat(Number(rule.points).toFixed(1))} pts
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.5"
                            value={editPartPoints}
                            onChange={(e) => setEditPartPoints(e.target.value)}
                            className="w-20 px-2 py-1 bg-[#0A0A0A] border border-amber-400 rounded-lg text-xs font-mono font-bold text-white focus:outline-hidden"
                          />
                        ) : (
                          <span className="font-mono text-amber-200/60">
                            +{parseFloat(Number(rule.participation_points).toFixed(1))} pts
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() =>
                                updateMutation.mutate({
                                  id: rule.id,
                                  points: editPoints,
                                  participation_points: editPartPoints,
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 rounded-lg text-amber-200/60 hover:bg-[#121212] font-bold text-[11px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(rule)}
                            className="px-2.5 py-1 rounded-lg text-amber-300 hover:bg-white/[0.03] font-bold text-[11px] cursor-pointer transition-colors"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
