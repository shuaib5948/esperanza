import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import {
  Lock,
  Save,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Play,
  Table,
  Sliders,
  Award,
  Check,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';

interface Participant {
  participant_id: number;
  participant_code: string;
  participant_name: string;
  team_name: string;
  queue_order?: number;
  code_letter?: string | null;
  sheet_id?: number | null;
  status?: string | null;
  total_marks?: number | null;
  remarks?: string | null;
  scores?: {
    criterion_id?: number;
    marks: number | null;
    remarks?: string | null;
  }[];
}

const SCORE_PRESETS = [60, 70, 75, 80, 85, 90, 95, 100];

export const JudgeScoringPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const competitionId = parseInt(searchParams.get('competitionId') || '1', 10);

  const queryClient = useQueryClient();
  const { success, error } = useToast();

  // Mode: SEQUENTIAL (A -> B -> C...) or MATRIX (Overall calibration table)
  const [viewMode, setViewMode] = useState<'SEQUENTIAL' | 'MATRIX'>('SEQUENTIAL');
  const [activePerformerIndex, setActivePerformerIndex] = useState(0);

  // Started performers tracking: participant_id -> boolean
  const [startedPerformers, setStartedPerformers] = useState<Record<number, boolean>>({});

  // Direct marks map: participant_id -> marks (0 to 100)
  const [allMarks, setAllMarks] = useState<Record<number, number>>({});
  // Remarks map: participant_id -> remarks
  const [allRemarks, setAllRemarks] = useState<Record<number, string>>({});

  const [isBulkLockModalOpen, setIsBulkLockModalOpen] = useState(false);

  // 1. Fetch competition score sheet & participants
  const { data: sheetData, isLoading } = useQuery({
    queryKey: ['judge-scoresheet', competitionId],
    queryFn: async () => {
      const res = await api.get<any>(`/judge/competitions/${competitionId}/scoresheet`);
      return res.data;
    },
    enabled: !!competitionId,
  });

  const competition = sheetData?.competition;
  const rawParticipants: Participant[] = sheetData?.participants || [];

  // Sort participants by queue_order / code_letter order
  const participants = useMemo(() => {
    return [...rawParticipants].sort((a, b) => {
      const orderA = a.queue_order ?? 999;
      const orderB = b.queue_order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      if (a.code_letter && b.code_letter) {
        return a.code_letter.localeCompare(b.code_letter);
      }
      return a.participant_id - b.participant_id;
    });
  }, [rawParticipants]);

  // Synchronize existing marks into local state
  useEffect(() => {
    if (participants.length > 0) {
      const newMarks: Record<number, number> = {};
      const newRemarks: Record<number, string> = {};
      const newStarted: Record<number, boolean> = {};

      participants.forEach((p) => {
        if (p.total_marks !== null && p.total_marks !== undefined) {
          newMarks[p.participant_id] = Number(p.total_marks);
          newStarted[p.participant_id] = true;
        } else if (p.scores && p.scores.length > 0) {
          const sum = p.scores.reduce((acc, s) => acc + (Number(s.marks) || 0), 0);
          if (sum > 0) {
            newMarks[p.participant_id] = sum;
            newStarted[p.participant_id] = true;
          }
        }

        if (p.remarks) {
          newRemarks[p.participant_id] = p.remarks;
        }

        if (p.status === 'SUBMITTED' || p.status === 'LOCKED' || p.status === 'DRAFT') {
          newStarted[p.participant_id] = true;
        }
      });

      setAllMarks((prev) => ({ ...newMarks, ...prev }));
      setAllRemarks((prev) => ({ ...newRemarks, ...prev }));
      setStartedPerformers((prev) => ({ ...newStarted, ...prev }));
    }
  }, [participants]);

  const currentParticipant: Participant | undefined = participants[activePerformerIndex];

  // Check if competition scores are locked
  const isAllLocked = useMemo(() => {
    return participants.length > 0 && participants.every((p) => p.status === 'SUBMITTED' || p.status === 'LOCKED');
  }, [participants]);

  // Helper to get participant mark
  const getParticipantMark = (pId: number): number => {
    return allMarks[pId] ?? 0;
  };

  // Rank computation for calibration matrix
  const participantRanks = useMemo(() => {
    const totals = participants.map((p) => ({
      pId: p.participant_id,
      total: allMarks[p.participant_id] ?? 0,
    }));
    totals.sort((a, b) => b.total - a.total);

    const ranks: Record<number, number> = {};
    totals.forEach((item, index) => {
      ranks[item.pId] = index + 1;
    });
    return ranks;
  }, [participants, allMarks]);

  // Individual save mutation (Sequential Mode)
  const saveIndividualScoresMutation = useMutation({
    mutationFn: async ({ participantId, isDraft }: { participantId: number; isDraft: boolean }) => {
      const pMark = allMarks[participantId] ?? 0;
      const pRemarks = allRemarks[participantId] || '';

      return api.post(`/judge/competitions/${competitionId}/scores`, {
        participant_id: participantId,
        marks: pMark,
        remarks: pRemarks,
        is_draft: isDraft,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['judge-scoresheet', competitionId] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to save scores');
    },
  });

  // Bulk save mutation (Calibration Matrix)
  const saveBulkScoresMutation = useMutation({
    mutationFn: async ({ isDraft }: { isDraft: boolean }) => {
      const items = participants.map((p) => ({
        participant_id: p.participant_id,
        marks: allMarks[p.participant_id] ?? 0,
        remarks: allRemarks[p.participant_id] || '',
      }));

      return api.post(`/judge/competitions/${competitionId}/bulk-scores`, {
        items,
        is_draft: isDraft,
      });
    },
    onSuccess: (_, vars) => {
      if (vars.isDraft) {
        success('All draft marks saved successfully!');
      } else {
        success('Official score sheet officially locked and submitted!');
        setIsBulkLockModalOpen(false);
      }
      queryClient.invalidateQueries({ queryKey: ['judge-scoresheet', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['judge-dashboard'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to submit bulk scores');
    },
  });

  // Handle Mark Change
  const handleMarkChange = (participantId: number, val: number) => {
    const clamped = Math.min(100, Math.max(0, val));
    setAllMarks((prev) => ({
      ...prev,
      [participantId]: clamped,
    }));
  };

  // Handle Remarks Change
  const handleRemarksChange = (participantId: number, val: string) => {
    setAllRemarks((prev) => ({
      ...prev,
      [participantId]: val,
    }));
  };

  // Handle Complete current performer and advance to next
  const handleCompleteAndNext = async () => {
    if (!currentParticipant) return;

    try {
      await saveIndividualScoresMutation.mutateAsync({
        participantId: currentParticipant.participant_id,
        isDraft: true,
      });

      const currentLetter = currentParticipant.code_letter || `Performer #${activePerformerIndex + 1}`;

      // Check if this was the last performer
      if (activePerformerIndex >= participants.length - 1) {
        success(`Completed evaluation for ${currentLetter}! Switching to Overall Calibration Matrix.`);
        setViewMode('MATRIX');
      } else {
        const nextIndex = activePerformerIndex + 1;
        const nextLetter = participants[nextIndex]?.code_letter || `Performer #${nextIndex + 1}`;
        setActivePerformerIndex(nextIndex);
        success(`Saved ${currentLetter}. Now evaluating Code Letter ${nextLetter}!`);
      }
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              to="/judge"
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-indigo-400">
                  PROGRAMME {competition?.programme_number}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white">
                  {competition?.name || 'Evaluation Score Sheet'}
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Official Blind Adjudication • {participants.length} Contestants • Direct 100 Marks Scale
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('SEQUENTIAL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'SEQUENTIAL'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Sequential Live Mode</span>
          </button>

          <button
            onClick={() => setViewMode('MATRIX')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'MATRIX'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Overall Calibration Matrix</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <Card className="text-center py-20 text-slate-400 text-sm">Loading competition score sheet...</Card>
      ) : participants.length === 0 ? (
        <Card className="text-center py-20 text-slate-500 text-sm">
          No participants registered or assigned for this competition yet.
        </Card>
      ) : viewMode === 'SEQUENTIAL' ? (
        /* ============================================================== */
        /* MODE 1: SEQUENTIAL LIVE SCORING (A -> B -> C...)              */
        /* ============================================================== */
        <div className="space-y-6">
          {/* Stepper Pill Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {participants.map((p, idx) => {
              const isSelected = idx === activePerformerIndex;
              const pMark = getParticipantMark(p.participant_id);
              const isCompleted = pMark > 0;
              const displayLabel = p.code_letter ? `Code ${p.code_letter}` : `Performer #${idx + 1}`;

              return (
                <button
                  key={p.participant_id}
                  onClick={() => setActivePerformerIndex(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30 scale-105'
                      : isCompleted
                      ? 'bg-slate-900/90 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/60'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {p.code_letter ? (
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-xs ${
                        isSelected ? 'bg-white text-indigo-700' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {p.code_letter}
                    </span>
                  ) : null}
                  <span>{displayLabel}</span>
                  {isCompleted && <Check className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />}
                </button>
              );
            })}

            <button
              onClick={() => setViewMode('MATRIX')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ml-auto"
            >
              <Table className="w-3.5 h-3.5" />
              <span>Review All Matrix ➔</span>
            </button>
          </div>

          {currentParticipant ? (
            <div className="space-y-6">
              {/* Blind Performer Spotlight Header */}
              <Card className="border-indigo-500/40 bg-gradient-to-r from-indigo-950/40 via-slate-900/80 to-slate-950 p-6 rounded-2xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-black text-3xl flex items-center justify-center shadow-xl shadow-indigo-600/30 shrink-0">
                      {currentParticipant.code_letter || String.fromCharCode(65 + activePerformerIndex)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-400">
                          CONTESTANT {activePerformerIndex + 1} OF {participants.length}
                        </span>
                        {isAllLocked ? (
                          <Badge variant="success" size="sm">
                            <Lock className="w-3 h-3 mr-1" />
                            Locked
                          </Badge>
                        ) : startedPerformers[currentParticipant.participant_id] ? (
                          <Badge variant="warning" size="sm">
                            Evaluating
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            Ready on Stage
                          </Badge>
                        )}
                      </div>
                      <h2 className="text-2xl font-black text-white mt-1">
                        PERFORMER CODE LETTER{' '}
                        {currentParticipant.code_letter || String.fromCharCode(65 + activePerformerIndex)}
                      </h2>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        REG CODE: {currentParticipant.participant_code} • Blind Adjudication Active
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
                      Performer Total Mark
                    </span>
                    <span className="text-3xl font-black text-indigo-400">
                      {getParticipantMark(currentParticipant.participant_id).toFixed(1)}{' '}
                      <span className="text-sm font-semibold text-slate-400">/ 100</span>
                    </span>
                  </div>
                </div>
              </Card>

              {/* Ready / Start Barrier */}
              {!startedPerformers[currentParticipant.participant_id] && !isAllLocked ? (
                <Card className="py-16 text-center space-y-4 border-indigo-500/30 bg-slate-900/60">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                    <Play className="w-8 h-8 ml-1" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h3 className="text-xl font-black text-white">
                      Performer Code {currentParticipant.code_letter || String.fromCharCode(65 + activePerformerIndex)} is
                      Taking Stage
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Press start when the contestant begins their performance to activate direct 100-mark scoring.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="lg"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-3 text-base shadow-xl shadow-emerald-600/30"
                    onClick={() => {
                      setStartedPerformers((prev) => ({
                        ...prev,
                        [currentParticipant.participant_id]: true,
                      }));
                    }}
                  >
                    <Play className="w-5 h-5 mr-2" />
                    <span>
                      Start Performance Code{' '}
                      {currentParticipant.code_letter || String.fromCharCode(65 + activePerformerIndex)}
                    </span>
                  </Button>
                </Card>
              ) : (
                /* Direct 100-Mark Scoring Card */
                <Card className="space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Award className="w-5 h-5 text-indigo-400" />
                      <span>Direct Scoring (Out of 100 Marks)</span>
                    </h3>
                    <span className="text-xs text-slate-400">
                      Enter the contestant's score directly from 0 to 100 points
                    </span>
                  </div>

                  {/* Direct Score Big Input & Range */}
                  <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div>
                        <h4 className="text-lg font-black text-white">Direct Total Mark</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Type numeric score or use slider and preset buttons below
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          disabled={isAllLocked}
                          value={allMarks[currentParticipant.participant_id] ?? 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleMarkChange(currentParticipant.participant_id, val);
                          }}
                          className="w-32 px-4 py-3 bg-slate-800 border-2 border-indigo-500/50 rounded-xl text-3xl font-black text-indigo-400 text-center focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 disabled:opacity-60 font-mono shadow-inner"
                        />
                        <span className="text-xl font-bold text-slate-400">/ 100</span>
                      </div>
                    </div>

                    {/* Smooth Range Slider */}
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.5"
                        disabled={isAllLocked}
                        value={allMarks[currentParticipant.participant_id] ?? 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          handleMarkChange(currentParticipant.participant_id, val);
                        }}
                        className="w-full accent-indigo-500 h-3 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-40"
                      />
                      <div className="flex justify-between text-[11px] font-mono font-semibold text-slate-500">
                        <span>0</span>
                        <span>25</span>
                        <span>50</span>
                        <span>75</span>
                        <span>100</span>
                      </div>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                      <span className="text-xs font-semibold text-slate-400 mr-2">Quick Presets:</span>
                      {SCORE_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          disabled={isAllLocked}
                          onClick={() => handleMarkChange(currentParticipant.participant_id, preset)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                            allMarks[currentParticipant.participant_id] === preset
                              ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                              : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Remarks Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Judge Remarks / Feedback (Optional)
                    </label>
                    <textarea
                      rows={2}
                      disabled={isAllLocked}
                      placeholder="Enter qualitative comments, observations, or feedback for this performance..."
                      value={allRemarks[currentParticipant.participant_id] || ''}
                      onChange={(e) => handleRemarksChange(currentParticipant.participant_id, e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 resize-none"
                    />
                  </div>

                  {/* Navigation and Next Actions */}
                  <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      {activePerformerIndex > 0 && (
                        <Button
                          variant="secondary"
                          size="md"
                          onClick={() => setActivePerformerIndex(activePerformerIndex - 1)}
                        >
                          <ArrowLeft className="w-4 h-4 mr-1.5" />
                          <span>Previous Performer</span>
                        </Button>
                      )}

                      <Button
                        variant="secondary"
                        size="md"
                        onClick={() =>
                          saveIndividualScoresMutation.mutate({
                            participantId: currentParticipant.participant_id,
                            isDraft: true,
                          })
                        }
                        isLoading={saveIndividualScoresMutation.isPending}
                        disabled={isAllLocked}
                      >
                        <Save className="w-4 h-4 mr-1.5" />
                        <span>Save Draft</span>
                      </Button>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        variant="primary"
                        size="md"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30"
                        onClick={handleCompleteAndNext}
                        isLoading={saveIndividualScoresMutation.isPending}
                        disabled={isAllLocked}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        <span>
                          {activePerformerIndex >= participants.length - 1
                            ? 'Complete Code ' +
                              (currentParticipant.code_letter || String.fromCharCode(65 + activePerformerIndex)) +
                              ' & Review Overall Matrix ➔'
                            : 'Complete Code ' +
                              (currentParticipant.code_letter || String.fromCharCode(65 + activePerformerIndex)) +
                              ' & Next (Code ' +
                              (participants[activePerformerIndex + 1]?.code_letter ||
                                String.fromCharCode(65 + activePerformerIndex + 1)) +
                              ') ➔'}
                        </span>
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        /* ============================================================== */
        /* MODE 2: OVERALL REVIEW & CALIBRATION MATRIX                   */
        /* ============================================================== */
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Table className="w-4 h-4 text-indigo-400" />
                <span>Overall Review & Score Calibration Matrix</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Compare marks out of 100 side-by-side across all performers. You can directly edit any mark or remarks in the table before final locking.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button variant="secondary" size="sm" onClick={() => setViewMode('SEQUENTIAL')}>
                <Sliders className="w-3.5 h-3.5 mr-1" />
                <span>Return to Performer View</span>
              </Button>
            </div>
          </div>

          {/* Spreadsheet Matrix Table */}
          <Card className="p-0 overflow-hidden border-slate-800 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-xs font-bold uppercase text-slate-400">
                    <th className="py-3 px-4 w-16">Lot</th>
                    <th className="py-3 px-4 min-w-[150px]">Contestant</th>
                    <th className="py-3 px-4 text-center min-w-[140px]">
                      <div>Mark / 100</div>
                      <div className="text-[10px] text-slate-500 font-normal">Direct Score</div>
                    </th>
                    <th className="py-3 px-3 text-center w-20">Rank</th>
                    <th className="py-3 px-4 min-w-[200px]">Remarks</th>
                    <th className="py-3 px-4 text-right min-w-[100px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  {participants.map((p, idx) => {
                    const pTotal = allMarks[p.participant_id] ?? 0;
                    const pRank = participantRanks[p.participant_id];

                    return (
                      <tr key={p.participant_id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-black text-slate-300">
                          {p.code_letter ? (
                            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                              {p.code_letter}
                            </span>
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-white block">
                            Code Letter {p.code_letter || String.fromCharCode(65 + idx)}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">{p.participant_code}</span>
                        </td>
                        {/* Direct Score Input for Live Calibration */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              disabled={isAllLocked}
                              value={allMarks[p.participant_id] ?? 0}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                handleMarkChange(p.participant_id, val);
                              }}
                              className="w-24 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-base font-black text-indigo-400 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 font-mono"
                            />
                            <span className="text-xs font-semibold text-slate-500">/ 100</span>
                          </div>
                        </td>
                        {/* Dynamically Calibrated Rank */}
                        <td className="py-3.5 px-3 text-center">
                          {pTotal > 0 ? (
                            <span
                              className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-black ${
                                pRank === 1
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : pRank === 2
                                  ? 'bg-slate-300/20 text-slate-200 border border-slate-400/30'
                                  : pRank === 3
                                  ? 'bg-amber-700/20 text-amber-400 border border-amber-700/30'
                                  : 'text-slate-400'
                              }`}
                            >
                              {pRank === 1 ? '1st' : pRank === 2 ? '2nd' : pRank === 3 ? '3rd' : `${pRank}th`}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        {/* Remarks Input */}
                        <td className="py-3.5 px-4">
                          <input
                            type="text"
                            disabled={isAllLocked}
                            placeholder="Add remarks..."
                            value={allRemarks[p.participant_id] || ''}
                            onChange={(e) => handleRemarksChange(p.participant_id, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                          />
                        </td>
                        {/* Status */}
                        <td className="py-3.5 px-4 text-right">
                          {p.status === 'SUBMITTED' || p.status === 'LOCKED' ? (
                            <Badge variant="success" size="sm">
                              <Lock className="w-3 h-3 mr-1" /> Locked
                            </Badge>
                          ) : pTotal > 0 ? (
                            <Badge variant="warning" size="sm">
                              Draft
                            </Badge>
                          ) : (
                            <Badge variant="neutral" size="sm">
                              Unrated
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Matrix Actions Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Award className="w-4 h-4 text-amber-400" />
              <span>
                Verify that all 100-scale marks and calibrated rankings are accurate before locking the score sheet.
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => saveBulkScoresMutation.mutate({ isDraft: true })}
                isLoading={saveBulkScoresMutation.isPending}
                disabled={isAllLocked}
              >
                <Save className="w-4 h-4 mr-1.5" />
                <span>Save All Drafts</span>
              </Button>

              {!isAllLocked ? (
                <Button
                  variant="primary"
                  size="md"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30"
                  onClick={() => setIsBulkLockModalOpen(true)}
                  disabled={saveBulkScoresMutation.isPending}
                >
                  <Lock className="w-4 h-4 mr-1.5" />
                  <span>Lock & Submit Official Scores</span>
                </Button>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Official Scoresheet Locked</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lock Confirmation Modal */}
      <Modal
        isOpen={isBulkLockModalOpen}
        onClose={() => setIsBulkLockModalOpen(false)}
        title="Finalize & Lock Official Festival Scoresheet"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
            <span>
              Once locked, your marks out of 100 for all {participants.length} contestants will be permanently submitted and finalized for official results computation.
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Programme:</span>
              <strong className="text-white">{competition?.programme_number} - {competition?.name}</strong>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Total Contestants Evaluated:</span>
              <strong className="text-emerald-400">{participants.length} Contestants</strong>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" onClick={() => setIsBulkLockModalOpen(false)}>
              Back to Calibration
            </Button>
            <Button
              variant="primary"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              isLoading={saveBulkScoresMutation.isPending}
              onClick={() => saveBulkScoresMutation.mutate({ isDraft: false })}
            >
              <Lock className="w-4 h-4 mr-1.5" />
              <span>Confirm & Lock Submission</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
