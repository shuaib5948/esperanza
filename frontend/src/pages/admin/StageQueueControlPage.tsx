import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import {
  Sparkles,
  PhoneCall,
  Play,
  CheckCircle2,
  UserX,
  RefreshCw,
  Clock,
  Layers,
  Calendar,
  AlertTriangle,
  Radio,
  RotateCcw,
  Check,
  Shuffle,
  Bell,
  UserCheck,
  Gavel,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { ProgrammeStatusBadge } from '../../components/ui/ProgrammeStatusBadge.js';

interface Competition {
  id: number;
  competition_code: string;
  programme_number: number;
  name: string;
  programme_group_name?: string;
  group_name?: string;
  competition_type_name?: string;
  competition_type?: string;
  status: string;
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
  status: 'SCHEDULED' | 'CHECK_IN' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  submitted_scores_count?: number;
  total_performers_count?: number;
  published_results_count?: number;
}

interface QueueItem {
  id: number;
  competition_id: number;
  participant_id: number;
  queue_order: number;
  code_letter?: string | null;
  check_in_status?: 'PENDING' | 'REPORTED' | 'ABSENT';
  call_count?: number;
  stage_status: 'WAITING' | 'CALLED' | 'ON_STAGE' | 'COMPLETED' | 'ABSENT';
  called_at: string | null;
  stage_started_at: string | null;
  stage_ended_at: string | null;
  participant_name: string;
  participant_code: string;
  team_id?: number;
  team_name: string;
  team_color: string;
  scoring_status?: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'LOCKED';
  judges_submitted_count?: number;
}

const compareQueueOrder = (
  a: { queue_order?: number; code_letter?: string | null; participant_id: number },
  b: { queue_order?: number; code_letter?: string | null; participant_id: number }
) => {
  const orderA = a.queue_order ?? 999;
  const orderB = b.queue_order ?? 999;
  if (orderA !== orderB) return orderA - orderB;
  if (a.code_letter && b.code_letter) {
    const letterCmp = a.code_letter.localeCompare(b.code_letter);
    if (letterCmp !== 0) return letterCmp;
  } else if (a.code_letter) {
    return -1;
  } else if (b.code_letter) {
    return 1;
  }
  return a.participant_id - b.participant_id;
};

interface DrawnLot {
  queue_id: number;
  participant_id: number;
  participant_name: string;
  participant_code: string;
  team_name: string;
  code_letter: string;
  queue_order: number;
}

interface JudgeItem {
  id: number;
  judge_id?: number;
  judge_code: string;
  name: string;
  email: string;
  phone?: string;
  qualification?: string;
}

const CODE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

export const StageQueueControlPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error, info } = useToast();

  const [selectedCompId, setSelectedCompId] = useState<number | null>(null);

  // Backstage Check-In & Lot Draw Modal state
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [activeCheckInSched, setActiveCheckInSched] = useState<Schedule | null>(null);
  const [drawnLots, setDrawnLots] = useState<DrawnLot[]>([]);
  const [activeModalTab, setActiveModalTab] = useState<'ROLL_CALL' | 'LOTS_DRAW'>('ROLL_CALL');
  const [showUpcomingDetails, setShowUpcomingDetails] = useState<boolean>(false);

  // Late Arrival Modal state (Mid-Programme Protocol)
  const [isLateModalOpen, setIsLateModalOpen] = useState(false);
  const [selectedLateParticipantId, setSelectedLateParticipantId] = useState<number | null>(null);

  // 1. Fetch competitions list
  const { data: competitions = [] } = useQuery<Competition[]>({
    queryKey: ['competitions-list'],
    queryFn: async () => {
      const res = await api.get<Competition[]>('/competitions');
      return res.data;
    },
  });

  // 2. Fetch all schedules
  const { data: schedules = [], isLoading: schedulesLoading, isFetching: schedulesFetching, refetch: refetchSchedules } = useQuery<Schedule[]>({
    queryKey: ['schedules'],
    queryFn: async () => {
      const res = await api.get<Schedule[]>('/schedules');
      return res.data;
    },
    refetchInterval: 5000,
  });

  // Automatically select the LIVE competition on load if available, or first scheduled
  useEffect(() => {
    if (selectedCompId === null && schedules.length > 0) {
      const liveSched = schedules.find((s) => s.status === 'LIVE');
      if (liveSched) {
        setSelectedCompId(liveSched.competition_id);
      } else {
        const firstScheduled = schedules.find((s) => s.status === 'SCHEDULED' || s.status === 'CHECK_IN');
        if (firstScheduled) {
          setSelectedCompId(firstScheduled.competition_id);
        } else if (competitions.length > 0) {
          setSelectedCompId(competitions[0].id);
        }
      }
    }
  }, [schedules, competitions, selectedCompId]);

  // Find currently LIVE competition
  const liveSchedule = useMemo(() => {
    return schedules.find((s) => s.status === 'LIVE');
  }, [schedules]);

  // 3. Live Stage Queue (Strictly for the LIVE competition on stage)
  const {
    data: liveQueue = [],
    isLoading: liveQueueLoading,
    isFetching: liveQueueFetching,
    refetch: refetchLiveQueue,
  } = useQuery<QueueItem[]>({
    queryKey: ['stage-queue', liveSchedule?.competition_id],
    queryFn: async () => {
      if (!liveSchedule?.competition_id) return [];
      const res = await api.get<QueueItem[]>(`/stage/${liveSchedule.competition_id}/queue`);
      return res.data;
    },
    enabled: !!liveSchedule?.competition_id,
    refetchInterval: 3000,
  });

  // 4. Modal Check-In Queue (Dedicated to the schedule currently opened in the check-in modal)
  const {
    data: modalQueue = [],
    isLoading: modalQueueLoading,
    refetch: refetchModalQueue,
  } = useQuery<QueueItem[]>({
    queryKey: ['stage-queue', activeCheckInSched?.competition_id],
    queryFn: async () => {
      if (!activeCheckInSched?.competition_id) return [];
      const res = await api.get<QueueItem[]>(`/stage/${activeCheckInSched.competition_id}/queue`);
      return res.data;
    },
    enabled: !!activeCheckInSched?.competition_id && isCheckInModalOpen,
    refetchInterval: isCheckInModalOpen ? 3000 : false,
  });

  // Keep drawnLots in sync with modalQueue if existing code letters exist
  useEffect(() => {
    if (modalQueue.length > 0 && modalQueue.some((q) => q.code_letter)) {
      const existing = modalQueue
        .filter((q) => q.code_letter)
        .map((q) => ({
          queue_id: q.id,
          participant_id: q.participant_id,
          participant_name: q.participant_name,
          participant_code: q.participant_code,
          team_name: q.team_name,
          code_letter: q.code_letter!,
          queue_order: q.queue_order,
        }))
        .sort((a, b) => a.queue_order - b.queue_order);
      setDrawnLots(existing);
    } else if (modalQueue.length > 0 && !modalQueue.some((q) => q.code_letter)) {
      setDrawnLots([]);
    }
  }, [modalQueue]);

  // Mutations
  const updateScheduleStatusMutation = useMutation({
    mutationFn: async ({ scheduleId, status }: { scheduleId: number; status: Schedule['status'] }) => {
      return api.patch(`/schedules/${scheduleId}`, { status });
    },
    onSuccess: (_, vars) => {
      success(`Programme marked as ${vars.status}`);
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['stage-queue'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to update programme status');
    },
  });

  const initQueueMutation = useMutation({
    mutationFn: async (compId: number) => {
      return api.post(`/stage/${compId}/init`);
    },
    onSuccess: (_, compId) => {
      success('Performer lineup populated from registrations');
      queryClient.invalidateQueries({ queryKey: ['stage-queue', compId] });
      queryClient.invalidateQueries({ queryKey: ['stage-queue'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to initialize queue');
    },
  });

  const updateStageStatusMutation = useMutation({
    mutationFn: async ({ queueId, status }: { queueId: number; status: string }) => {
      return api.patch(`/stage/${queueId}/status`, { stage_status: status });
    },
    onSuccess: (_, vars) => {
      success(`Performer moved to ${vars.status}`);
      queryClient.invalidateQueries({ queryKey: ['stage-queue'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to update performer status');
    },
  });

  // Check-In status mutation
  const updateCheckInStatusMutation = useMutation({
    mutationFn: async ({ queueId, status }: { queueId: number; status: 'PENDING' | 'REPORTED' | 'ABSENT' }) => {
      return api.patch(`/stage/${queueId}/check-in`, { check_in_status: status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stage-queue'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to update check-in status');
    },
  });

  // Notify House Team Leader mutation
  const notifyTeamLeaderMutation = useMutation({
    mutationFn: async (queueId: number) => {
      return api.post(`/stage/${queueId}/notify-leader`);
    },
    onSuccess: () => {
      success('Broadcast alert notification sent to House Team Leader!');
    },
    onError: (err: any) => {
      error(err.message || 'Failed to alert team leader');
    },
  });

  // Assign Lots mutation
  const assignLotsMutation = useMutation({
    mutationFn: async ({ competitionId, lots }: { competitionId: number; lots: { queue_id: number; code_letter: string; queue_order: number }[] }) => {
      return api.post(`/stage/${competitionId}/assign-lots`, { lots });
    },
    onSuccess: (_, vars) => {
      success('Random lots (A, B, C...) assigned successfully!');
      queryClient.invalidateQueries({ queryKey: ['stage-queue', vars.competitionId] });
      queryClient.invalidateQueries({ queryKey: ['stage-queue'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to assign lots');
    },
  });

  // Append Late Performer mutation (Mid-Programme Protocol)
  const appendLatePerformerMutation = useMutation({
    mutationFn: async ({ competitionId, participantId }: { competitionId: number; participantId: number }) => {
      return api.post(`/stage/${competitionId}/append-late`, { participant_id: participantId });
    },
    onSuccess: (res: any) => {
      const data = res.data;
      success(`Late contestant added! Assigned Code ${data.code_letter || 'Next'} (Queue Order ${data.queue_order}).`);
      queryClient.invalidateQueries({ queryKey: ['stage-queue'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setIsLateModalOpen(false);
      setSelectedLateParticipantId(null);
    },
    onError: (err: any) => {
      error(err.message || 'Failed to append late performer');
    },
  });

  // Compute next sequential code letter for late arrival in live queue
  const nextAssignedLetter = useMemo(() => {
    let maxCharCode = 64; // 'A' is 65
    liveQueue.forEach((q: QueueItem) => {
      if (q.code_letter) {
        const code = q.code_letter.trim().toUpperCase().charCodeAt(0);
        if (code > maxCharCode) maxCharCode = code;
      }
    });
    return String.fromCharCode(maxCharCode + 1);
  }, [liveQueue]);

  const nextAssignedOrder = useMemo(() => {
    let maxOrder = 0;
    liveQueue.forEach((q: QueueItem) => {
      if (q.queue_order && q.queue_order > maxOrder) maxOrder = q.queue_order;
    });
    return maxOrder + 1;
  }, [liveQueue]);

  // Candidates for late check-in: in the live competition, contestants without an active reported lot
  const lateCheckInCandidates = useMemo(() => {
    return liveQueue.filter((q: QueueItem) => !q.code_letter || q.check_in_status !== 'REPORTED');
  }, [liveQueue]);

  // Check if official marks have been received from judge for the live competition
  const isLiveMarksReceived = useMemo(() => {
    if (!liveSchedule) return false;
    return Number(liveSchedule.submitted_scores_count ?? 0) > 0;
  }, [liveSchedule]);

  const isLiveCompOffStage = useMemo(() => {
    if (!liveSchedule) return false;
    const comp = competitions.find((c) => c.id === liveSchedule.competition_id);
    const typeName = (comp?.competition_type_name || comp?.competition_type || '').toUpperCase();
    return typeName === 'OFF_STAGE' || typeName.includes('OFF');
  }, [liveSchedule, competitions]);

  const selectedCompetition = useMemo(() => {
    return competitions.find((c) => c.id === selectedCompId) || null;
  }, [competitions, selectedCompId]);

  const selectedCompSchedule = useMemo(() => {
    return schedules.find((s) => s.competition_id === selectedCompId) || null;
  }, [schedules, selectedCompId]);

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

  // Find up to 3 upcoming programmes (next in sequence to prepare or go live)
  const upcomingSchedules = useMemo(() => {
    let list = schedules.filter(
      (s) => s.id !== liveSchedule?.id && (s.status === 'CHECK_IN' || s.status === 'SCHEDULED')
    );
    list.sort((a, b) => {
      if (a.status === 'CHECK_IN' && b.status !== 'CHECK_IN') return -1;
      if (a.status !== 'CHECK_IN' && b.status === 'CHECK_IN') return 1;

      const orderA = a.stage_order ?? 999;
      const orderB = b.stage_order ?? 999;
      if (orderA !== orderB) return orderA - orderB;

      const timeA = new Date(a.start_at).getTime();
      const timeB = new Date(b.start_at).getTime();
      if (timeA !== timeB) return timeA - timeB;

      return a.programme_number - b.programme_number;
    });
    return list.slice(0, 3);
  }, [schedules, liveSchedule]);

  const upcomingSchedule = upcomingSchedules[0] || null;

  // Active Performer for currently live competition (only present participants with lots)
  const activePerformer = useMemo(() => {
    const presentQueue = liveQueue.filter((q: QueueItem) => q.check_in_status === 'REPORTED' && Boolean(q.code_letter));
    if (presentQueue.length === 0) return null;
    return (
      presentQueue.find((q: QueueItem) => q.stage_status === 'ON_STAGE') ||
      presentQueue.find((q: QueueItem) => q.stage_status === 'CALLED') ||
      presentQueue.find((q: QueueItem) => q.stage_status === 'WAITING') ||
      presentQueue[0]
    );
  }, [liveQueue]);

  const sortedLiveQueue = useMemo(() => {
    return liveQueue
      .filter((q: QueueItem) => q.check_in_status === 'REPORTED' && Boolean(q.code_letter))
      .sort(compareQueueOrder);
  }, [liveQueue]);

  // Open Check-in Modal
  const handleOpenCheckIn = (sched: Schedule) => {
    setActiveCheckInSched(sched);
    setActiveModalTab('ROLL_CALL');
    setIsCheckInModalOpen(true);

    if (sched.status === 'SCHEDULED') {
      updateScheduleStatusMutation.mutate({
        scheduleId: sched.id,
        status: 'CHECK_IN',
      });
    }

    if (modalQueue.length === 0) {
      initQueueMutation.mutate(sched.competition_id);
    }
  };

  // Resequence lots so queue_order is strictly 1..N and code_letter is A, B, C...
  const resequenceLots = (lotsArray: DrawnLot[]): DrawnLot[] => {
    return lotsArray.map((item, idx) => ({
      ...item,
      queue_order: idx + 1,
      code_letter: CODE_LETTERS[idx] || `L${idx + 1}`,
    }));
  };

  // Move a participant up or down by 1 spot
  const handleMoveLot = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= drawnLots.length) return;
    const updated = [...drawnLots];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setDrawnLots(resequenceLots(updated));
  };

  // Move a participant directly to a specific 1-based position
  const handleSetPosition = (fromIndex: number, targetPosition: number) => {
    const toIndex = targetPosition - 1;
    if (toIndex < 0 || toIndex >= drawnLots.length || toIndex === fromIndex) return;
    const updated = [...drawnLots];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setDrawnLots(resequenceLots(updated));
  };

  // Initialize manual lots in attendance / roll-call order (A, B, C...) without random shuffling
  const handleInitializeManualLots = () => {
    const reportedOnly = modalQueue.filter((q: QueueItem) => q.check_in_status === 'REPORTED');
    if (reportedOnly.length === 0) {
      error('At least one participant must be marked Present to set lots.');
      return;
    }
    const lots: DrawnLot[] = reportedOnly.map((item, idx) => ({
      queue_id: item.id,
      participant_id: item.participant_id,
      participant_name: item.participant_name,
      participant_code: item.participant_code,
      team_name: item.team_name,
      code_letter: CODE_LETTERS[idx] || `L${idx + 1}`,
      queue_order: idx + 1,
    }));
    setDrawnLots(lots);
    setActiveModalTab('LOTS_DRAW');
    success(`Initialized lots in roll-call order. Use arrows or position selector to adjust order.`);
  };

  // Random Lot Drawing Function (Requires at least 1 present participant in modalQueue)
  const handleDrawLots = () => {
    if (modalQueue.length === 0) {
      error('No participants found in queue to draw lots.');
      return;
    }

    const reportedOnly = modalQueue.filter((q: QueueItem) => q.check_in_status === 'REPORTED');
    if (reportedOnly.length === 0) {
      error('At least one participant must be marked Present to move on in check-in.');
      return;
    }

    const shuffled = [...reportedOnly];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const lots: DrawnLot[] = shuffled.map((item, idx) => ({
      queue_id: item.id,
      participant_id: item.participant_id,
      participant_name: item.participant_name,
      participant_code: item.participant_code,
      team_name: item.team_name,
      code_letter: CODE_LETTERS[idx] || `L${idx + 1}`,
      queue_order: idx + 1,
    }));

    setDrawnLots(lots);
    setActiveModalTab('LOTS_DRAW');
    success(`Drawn ${lots.length} random lots (Code Letters A to ${lots[lots.length - 1]?.code_letter}) for present participants!`);
  };

  // Save Lots (Modal closes, event does NOT go live)
  const handleSaveLots = async () => {
    if (!activeCheckInSched || drawnLots.length === 0) {
      error('At least one participant must be marked Present and assigned a lot to move on.');
      return;
    }

    try {
      await assignLotsMutation.mutateAsync({
        competitionId: activeCheckInSched.competition_id,
        lots: drawnLots.map((l) => ({
          queue_id: l.queue_id,
          code_letter: l.code_letter,
          queue_order: l.queue_order,
        })),
      });

      setIsCheckInModalOpen(false);
      success('Lots saved successfully. Click "Go Live" on the programme when ready.');
    } catch (err: any) {
      error(err.message || 'Failed to save lots');
    }
  };

  // Go Live with Present participant verification
  const handleGoLive = async (sched: Schedule) => {
    try {
      const res = await api.get<QueueItem[]>(`/stage/${sched.competition_id}/queue`);
      const targetQueue = res.data || [];
      const hasPresentWithLots = targetQueue.some((q) => q.check_in_status === 'REPORTED' && Boolean(q.code_letter));
      if (!hasPresentWithLots) {
        error('Cannot go live: At least one participant must be marked Present with an assigned lot. Please complete check-in first.');
        handleOpenCheckIn(sched);
        return;
      }
    } catch {
      // Proceed to let backend validation guard handle if network fails
    }

    updateScheduleStatusMutation.mutate({
      scheduleId: sched.id,
      status: 'LIVE',
    });
    setSelectedCompId(sched.competition_id);
  };

  // Modal Queue Stats
  const reportedCount = modalQueue.filter((q: QueueItem) => q.check_in_status === 'REPORTED').length;
  const pendingCount = modalQueue.filter((q: QueueItem) => !q.check_in_status || q.check_in_status === 'PENDING').length;
  const absentCount = modalQueue.filter((q: QueueItem) => q.check_in_status === 'ABSENT').length;



  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
            </span>
            <h1 className="text-3xl font-black text-slate-900">Live Stage Queue Control</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Backstage check-in, judge sync, blind lot drawing (A, B, C...), and live stage calling console.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetchSchedules();
              refetchLiveQueue();
            }}
            disabled={schedulesFetching || liveQueueFetching}
            title="Refresh Live Data"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 hover:border-slate-800 shadow-xs transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${schedulesFetching || liveQueueFetching ? 'animate-spin' : ''}`} />
            <span>Live Feed</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. LARGE HERO AREA: CURRENT PROGRAMME (HAPPENING NOW)          */}
      {/* ============================================================== */}
      {liveSchedule ? (
        <div className="bg-[#0D472D] text-white rounded-2xl p-6 sm:p-7 shadow-md border border-emerald-900/40 relative overflow-hidden">
          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-800/60 pb-5">
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white">
                  {liveSchedule.programme_group ? `${liveSchedule.programme_group} - ` : ''}{liveSchedule.competition_name}
                </h2>

                <div className="flex flex-wrap items-center gap-4 text-xs text-emerald-100/90 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-300" />
                    <span>{formatDisplayDate(liveSchedule.start_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-300" />
                    <span className="font-mono">
                      {formatDisplayTime(liveSchedule.start_at)} – {formatDisplayTime(liveSchedule.end_at)}
                    </span>
                  </div>
                  {liveSchedule.stage_order && (
                    <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-full border border-white/20 text-xs">
                      Order {liveSchedule.stage_order}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Side: Live Badge & Conditional Finish Button */}
              <div className="shrink-0 flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 animate-pulse">
                  <Radio className="w-3.5 h-3.5 text-emerald-300" />
                  {isLiveCompOffStage ? 'OFF-STAGE ACTIVE' : 'LIVE'}
                </span>

                {/* For Off-stage: Finish button is always available to conclude the off-stage programme */}
                {isLiveCompOffStage ? (
                  <button
                    disabled={updateScheduleStatusMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold shadow-lg transition-all bg-white text-[#0D472D] hover:bg-slate-100 hover:scale-[1.03] cursor-pointer"
                    onClick={() =>
                      updateScheduleStatusMutation.mutate({
                        scheduleId: liveSchedule.id,
                        status: 'COMPLETED',
                      })
                    }
                    title="Finish off-stage programme and collect submissions. Will move to Results page for evaluation."
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#0D472D]" />
                    <span>Finish Programme</span>
                  </button>
                ) : isLiveMarksReceived ? (
                  <button
                    disabled={updateScheduleStatusMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold shadow-lg transition-all bg-white text-[#0D472D] hover:bg-slate-100 hover:scale-[1.03] cursor-pointer"
                    onClick={() =>
                      updateScheduleStatusMutation.mutate({
                        scheduleId: liveSchedule.id,
                        status: 'COMPLETED',
                      })
                    }
                    title="Complete and finish this live programme."
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#0D472D]" />
                    <span>Finish Programme</span>
                  </button>
                ) : null}
              </div>
            </div>

            {/* If Off-Stage: Showcase Off-Stage Programme In Progress */}
            {isLiveCompOffStage ? (
              <div className="bg-white text-slate-900 border border-emerald-800/30 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-[#0D472D] font-black text-2xl flex items-center justify-center shrink-0 border border-emerald-200">
                      <Layers className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#0D472D] block">
                        OFF-STAGE PROGRAMME IN PROGRESS
                      </span>
                      <h3 className="text-xl font-black text-slate-900">
                        Contestants Participating Off-Stage
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {sortedLiveQueue.length} contestants checked in with code letters (Code A, Code B, Code C...).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-[#0D472D] border border-emerald-200">
                      Programme Active
                    </span>
                  </div>
                </div>

                {/* Code Letters Display */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Assigned Code Letters:
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {sortedLiveQueue.length} Present Contestants
                    </span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
                    {sortedLiveQueue.map((item) => (
                      <div
                        key={item.id}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-center shrink-0 font-bold text-xs"
                      >
                        Code {item.code_letter}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* For Stage Items: Active Performer Showcase (Unchanged) */
              <>
                <div className="bg-white text-slate-900 border border-emerald-800/30 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xs">
                  <div className="flex items-center gap-4 sm:gap-5">
                    {/* Big Code Letter Badge */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#0D472D] text-white font-black text-3xl sm:text-4xl flex items-center justify-center shadow-md shrink-0">
                      {activePerformer?.code_letter ? activePerformer.code_letter : 'A'}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#0D472D] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        PERFORMING NOW ON STAGE
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                        {activePerformer ? activePerformer.participant_name : 'Waiting for Performer'}
                      </h3>
                      {activePerformer && (
                        <div className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                          <span className="font-mono text-[#0D472D] font-bold bg-[#E6F4EA] px-2.5 py-0.5 rounded-full border border-emerald-200">
                            {activePerformer.participant_code}
                          </span>
                          <span>•</span>
                          <span className="text-slate-700 font-bold">{activePerformer.team_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold border ${
                        activePerformer?.stage_status === 'ON_STAGE'
                          ? 'bg-emerald-50 text-[#0D472D] border-emerald-200'
                          : activePerformer?.stage_status === 'COMPLETED'
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {activePerformer?.stage_status === 'ON_STAGE'
                        ? 'On Stage'
                        : activePerformer?.stage_status || 'Ready'}
                    </span>
                  </div>
                </div>

                {/* Queue Progression Box — Present Participants with Lots (Code A, Code B, Code C) */}
                <div className="bg-white/95 backdrop-blur-xs text-slate-900 rounded-2xl p-4 border border-white/20 shadow-xs space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs tracking-wide">
                        Queue Progression
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {sortedLiveQueue.length} Present Performers
                      </span>
                    </div>

                    {/* Late Performer Action */}
                    <button
                      disabled={isLiveMarksReceived}
                      onClick={() => setIsLateModalOpen(true)}
                      className="flex items-center gap-1 px-3 py-1 rounded-full bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 hover:border-slate-800 shadow-2xs transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
                      title={
                        isLiveMarksReceived
                          ? 'Official marks already submitted; late additions are strictly locked.'
                          : 'Add an arriving contestant to the end of the line'
                      }
                    >
                      <Plus className="w-3.5 h-3.5 text-[#0D472D]" />
                      <span>Late Performer</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
                    {sortedLiveQueue.length === 0 ? (
                      <span className="text-xs text-slate-500 py-1">No present performers with assigned lots.</span>
                    ) : (
                      sortedLiveQueue.map((item) => {
                        const isActive = item.stage_status === 'ON_STAGE' || item.id === activePerformer?.id;
                        const isScored = item.scoring_status === 'SUBMITTED' || item.scoring_status === 'LOCKED';
                        const isDraft = item.scoring_status === 'DRAFT';

                        return (
                          <div
                            key={item.id}
                            className={`px-4 py-2 rounded-xl border text-center transition-all shrink-0 font-bold text-xs sm:text-sm shadow-2xs ${
                              isActive
                                ? 'bg-[#0D472D] text-white border-[#0D472D] shadow-sm ring-2 ring-emerald-400'
                                : isScored
                                ? 'bg-[#E6F4EA] text-[#0D472D] border-emerald-300'
                                : isDraft
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-white text-slate-800 border-slate-200'
                            }`}
                          >
                            Code {item.code_letter}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
              <Clock className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Stage is currently idle</h3>
              <p className="text-xs text-slate-500 mt-0.5 max-w-lg">
                No competition is currently LIVE. Complete backstage preparation for the upcoming programme below and click &quot;Go Live&quot; to begin.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. UPCOMING PROGRAMMES LIST (UP TO NEXT 3 IN LINE)              */}
      {/* ============================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Upcoming Programmes</h3>
        </div>

        {upcomingSchedules.length === 0 ? (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl text-center text-xs text-slate-500 shadow-xs">
            No further scheduled programmes found for this stage.
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingSchedules.map((sched, index) => {
              const isNextFirst = index === 0;
              const isCheckIn = sched.status === 'CHECK_IN';
              const isScheduled = sched.status === 'SCHEDULED';

              return (
                <div
                  key={sched.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="space-y-1">
                      <h4 className="text-lg font-bold text-slate-900">
                        {sched.programme_group ? `${sched.programme_group} - ` : ''}{sched.competition_name}
                      </h4>

                      <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                        <span>
                          {formatDisplayTime(sched.start_at)} – {formatDisplayTime(sched.end_at)}
                        </span>
                        {sched.stage_order && <span>• Order {sched.stage_order}</span>}
                      </div>
                    </div>

                    {/* Right: Actions (Uniform on every card) */}
                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                      {isScheduled && (
                        <button
                          onClick={() => handleOpenCheckIn(sched)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Check-In</span>
                        </button>
                      )}

                      {isCheckIn && (
                        <>
                          <button
                            onClick={() => handleOpenCheckIn(sched)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 hover:border-slate-800 text-xs font-semibold shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
                          >
                            <UserCheck className="w-4 h-4 text-[#0D472D]" />
                            <span>Edit Check-In</span>
                          </button>

                          {!liveSchedule && (
                            <button
                              disabled={updateScheduleStatusMutation.isPending}
                              onClick={() => handleGoLive(sched)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0D472D] hover:bg-[#07321e] text-white text-xs font-bold shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
                              title="Start live performance on stage"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Go Live</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: BACKSTAGE CHECK-IN, JUDGES & RANDOM LOT DRAWING         */}
      {/* ============================================================== */}
      <Modal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        title={`Backstage Setup: ${activeCheckInSched?.programme_number} - ${activeCheckInSched?.competition_name}`}
        maxWidth="3xl"
      >
        <div className="space-y-5">
          {/* Top Sub-tabs (2-Step Fast Flow) */}
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveModalTab('ROLL_CALL')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeModalTab === 'ROLL_CALL'
                    ? 'bg-[#0D472D] text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>1. Attendance ({reportedCount}/{modalQueue.length})</span>
              </button>

              <button
                onClick={() => {
                  if (reportedCount === 0) {
                    error('At least one participant must be marked Present before proceeding to Lot Drawing.');
                    return;
                  }
                  setActiveModalTab('LOTS_DRAW');
                }}
                disabled={reportedCount === 0}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  reportedCount === 0
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : activeModalTab === 'LOTS_DRAW'
                    ? 'bg-[#0D472D] text-white shadow-xs cursor-pointer'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer'
                }`}
                title={
                  reportedCount === 0
                    ? 'Mark at least one participant Present to unlock Lot Drawing'
                    : 'Draw Lots'
                }
              >
                <Shuffle className="w-4 h-4" />
                <span>2. Draw Lots ({drawnLots.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className={reportedCount > 0 ? 'text-[#0D472D]' : 'text-slate-500'}>
                {reportedCount} Present
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-amber-700">{pendingCount} Pending</span>
            </div>
          </div>

          {/* TAB 1: ATTENDANCE ROLL CALL */}
          {activeModalTab === 'ROLL_CALL' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                {reportedCount === 0 ? (
                  <span className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Mark at least 1 participant Present to draw lots.</span>
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-600">
                    {reportedCount} participant{reportedCount > 1 ? 's' : ''} reported backstage
                  </span>
                )}

                <button
                  disabled={reportedCount === 0}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold shadow-xs shrink-0 ml-auto transition-all ${
                    reportedCount === 0
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : 'bg-[#0D472D] hover:bg-[#07321e] text-white hover:scale-[1.02] cursor-pointer'
                  }`}
                  onClick={handleDrawLots}
                >
                  <Shuffle className="w-3.5 h-3.5 mr-1" />
                  <span>Next: Draw Lots ➔</span>
                </button>
              </div>

              {modalQueue.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs font-medium">
                  No participants loaded yet.{' '}
                  <button
                    onClick={() => activeCheckInSched && initQueueMutation.mutate(activeCheckInSched.competition_id)}
                    className="text-[#0D472D] underline font-bold cursor-pointer"
                  >
                    Populate from Registrations
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
                  {modalQueue.map((item: QueueItem) => {
                    const isReported = item.check_in_status === 'REPORTED';
                    const isAbsent = item.check_in_status === 'ABSENT';

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isReported
                            ? 'bg-emerald-50/60 border-emerald-200 shadow-2xs'
                            : isAbsent
                            ? 'bg-rose-50/60 border-rose-200 opacity-75'
                            : 'bg-white border-slate-200 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              updateCheckInStatusMutation.mutate({
                                queueId: item.id,
                                status: isReported ? 'PENDING' : 'REPORTED',
                              })
                            }
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                              isReported
                                ? 'bg-[#0D472D] text-white shadow-xs'
                                : 'border border-slate-300 bg-slate-50 hover:border-slate-500 text-slate-400'
                            }`}
                            title={isReported ? 'Mark as Pending' : 'Mark as Present'}
                          >
                            <Check className="w-4 h-4" />
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-slate-900 text-sm">{item.participant_name}</h5>
                              <span className="font-mono text-xs text-[#0D472D] font-bold bg-[#E6F4EA] px-2 py-0.5 rounded-full border border-emerald-200/60">
                                {item.participant_code}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-semibold text-slate-500">{item.team_name}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!isReported && (
                            <button
                              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold cursor-pointer"
                              onClick={() => notifyTeamLeaderMutation.mutate(item.id)}
                              disabled={notifyTeamLeaderMutation.isPending}
                              title="Send urgent notification to Team Leader"
                            >
                              <Bell className="w-3.5 h-3.5 text-amber-600" />
                              <span>Alert</span>
                            </button>
                          )}

                          {!isAbsent ? (
                            <button
                              className="px-3 py-1.5 rounded-full text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                              onClick={() =>
                                updateCheckInStatusMutation.mutate({
                                  queueId: item.id,
                                  status: 'ABSENT',
                                })
                              }
                            >
                              Absent
                            </button>
                          ) : (
                            <button
                              className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 cursor-pointer"
                              onClick={() =>
                                updateCheckInStatusMutation.mutate({
                                  queueId: item.id,
                                  status: 'PENDING',
                                })
                              }
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RANDOM & MANUAL LOTS DRAW */}
          {activeModalTab === 'LOTS_DRAW' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Shuffle className="w-4 h-4 text-[#0D472D]" />
                    <span>Performer Lot Order (A, B, C...)</span>
                  </h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Draw random lots or manually adjust order using the arrows or position selectors.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs cursor-pointer transition-colors"
                    onClick={handleInitializeManualLots}
                    title="Reset to attendance/roll-call order"
                  >
                    <span>Roll-Call Order</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0D472D] hover:bg-[#07321e] text-white text-xs font-semibold shadow-xs shrink-0 cursor-pointer transition-colors"
                    onClick={handleDrawLots}
                    title="Randomly shuffle all lots"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>{drawnLots.length > 0 ? 'Shuffle Lots' : 'Random Draw'}</span>
                  </button>
                </div>
              </div>

              {drawnLots.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs space-y-3 font-medium">
                  {reportedCount === 0 ? (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 max-w-md mx-auto space-y-2">
                      <AlertTriangle className="w-5 h-5 mx-auto text-amber-600" />
                      <p className="font-bold">No participants marked Present yet.</p>
                      <button
                        className="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-xs shadow-2xs"
                        onClick={() => setActiveModalTab('ROLL_CALL')}
                      >
                        ← Return to Attendance
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-slate-600 font-medium">Choose how to assign lots for {reportedCount} present contestants:</p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0D472D] hover:bg-[#07321e] text-white text-xs font-semibold shadow-xs cursor-pointer"
                          onClick={handleDrawLots}
                        >
                          <Shuffle className="w-4 h-4" />
                          <span>Random Draw ({reportedCount})</span>
                        </button>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold shadow-xs cursor-pointer"
                          onClick={handleInitializeManualLots}
                        >
                          <span>Manual / Roll-Call Order</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 max-h-[44vh] overflow-y-auto pr-1">
                  {drawnLots.map((lot, idx) => (
                    <div
                      key={lot.queue_id}
                      className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Order & Lot Code Badge */}
                        <div className="w-9 h-9 rounded-xl bg-[#0D472D] text-white font-mono font-bold text-base flex items-center justify-center shadow-xs shrink-0">
                          {lot.code_letter}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="font-bold text-slate-900 text-sm truncate">{lot.participant_name}</h5>
                            <span className="font-mono text-[11px] text-[#0D472D] font-bold bg-[#E6F4EA] px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
                              {lot.participant_code}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 font-semibold truncate block">{lot.team_name}</span>
                        </div>
                      </div>

                      {/* Manual Reordering Controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Position select */}
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Pos:</span>
                          <select
                            value={lot.queue_order}
                            onChange={(e) => handleSetPosition(idx, Number(e.target.value))}
                            className="text-xs font-mono font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-emerald-600 focus:outline-hidden cursor-pointer"
                            title="Directly jump to position"
                          >
                            {drawnLots.map((_, pIdx) => (
                              <option key={pIdx + 1} value={pIdx + 1}>
                                #{pIdx + 1}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Up / Down Swap Buttons */}
                        <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveLot(idx, 'UP')}
                            title="Move Up"
                            className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === drawnLots.length - 1}
                            onClick={() => handleMoveLot(idx, 'DOWN')}
                            title="Move Down"
                            className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  onClick={() => setActiveModalTab('ROLL_CALL')}
                >
                  ← Back to Attendance
                </button>

                {drawnLots.length > 0 && (
                  <button
                    className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#0D472D] hover:bg-[#07321e] text-white text-xs font-bold shadow-xs cursor-pointer"
                    onClick={handleSaveLots}
                    disabled={assignLotsMutation.isPending}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    <span>Save Lots</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 2. Emergency Late Performer Modal (Mid-Programme Protocol) */}
      <Modal
        isOpen={isLateModalOpen}
        onClose={() => {
          setIsLateModalOpen(false);
          setSelectedLateParticipantId(null);
        }}
        title="Check-In Late Performer"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium">
            <span className="text-slate-600">Appends contestant as the last lot:</span>
            <span className="font-mono font-bold text-[#0D472D] bg-[#E6F4EA] px-2.5 py-0.5 rounded-full border border-emerald-200">
              Code {nextAssignedLetter} (Order {nextAssignedOrder})
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Select Arriving Contestant
            </label>

            {lateCheckInCandidates.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium py-6 text-center">
                All registered contestants for this programme are already marked present with active lots.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {lateCheckInCandidates.map((c: QueueItem) => {
                  const isSelected = selectedLateParticipantId === c.participant_id;
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setSelectedLateParticipantId(c.participant_id)}
                      className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-[#0D472D] bg-[#E6F4EA] ring-2 ring-emerald-600/30'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                            isSelected ? 'bg-[#0D472D] text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.participant_code}
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-900 text-sm">{c.participant_name}</h5>
                          <span className="text-xs text-slate-500 font-semibold">{c.team_name}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          c.check_in_status === 'ABSENT'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        Status: {c.check_in_status || 'Pending'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              onClick={() => {
                setIsLateModalOpen(false);
                setSelectedLateParticipantId(null);
              }}
            >
              Cancel
            </button>

            <button
              className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#0D472D] hover:bg-[#07321e] text-white font-bold text-xs shadow-xs disabled:opacity-50 cursor-pointer"
              disabled={!selectedLateParticipantId || !liveSchedule || appendLatePerformerMutation.isPending}
              onClick={() => {
                if (selectedLateParticipantId && liveSchedule) {
                  appendLatePerformerMutation.mutate({
                    competitionId: liveSchedule.competition_id,
                    participantId: selectedLateParticipantId,
                  });
                }
              }}
            >
              <Check className="w-4 h-4" />
              <span>Confirm & Append (Code {nextAssignedLetter})</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
