import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { Modal } from '../ui/Modal.js';
import {
  Sparkles,
  MapPin,
  Clock,
  RefreshCw,
  CheckCircle2,
  Trophy,
  Award,
} from 'lucide-react';

export interface ParticipantSummary {
  id: number;
  name?: string;
  user_name?: string;
  participant_code: string;
  registration_number?: string;
  team_id?: number;
  team_name?: string;
  team_code?: string;
  category_id?: number;
  category_name?: string;
  category_code?: string;
  class_name?: string;
  status?: string;
}

interface ProgrammeItem {
  id: number;
  competition_id: number;
  competition_name: string;
  competition_code?: string;
  programme_number: number;
  participation_type?: 'INDIVIDUAL' | 'GROUP' | string;
  programme_group?: string;
  competition_type?: string;
  entry_code?: string;
  status: string;
  competition_status?: string;
  schedule_status?: string;
  start_at?: string;
  end_at?: string;
  venue_name?: string;
  stage_status?: string;
  check_in_status?: string;
  queue_order?: number;
  position?: number | null;
  result_status?: string;
}

interface ParticipantProgrammesModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: ParticipantSummary | null;
}

/**
 * Formats competition title as "Category - Programme Name" (e.g. "General - Magazine")
 * and prevents duplicate prefixes or awkward code strings.
 */
function formatProgrammeTitle(prog: ProgrammeItem, fallbackCategory?: string): string {
  const rawGroup = (prog.programme_group || fallbackCategory || 'General').trim();
  let cleanGroup = rawGroup;

  if (/^j[12]$/i.test(rawGroup)) {
    cleanGroup = rawGroup.toUpperCase(); // J1, J2
  } else if (/^jun(ior)?$/i.test(rawGroup)) {
    cleanGroup = 'Junior';
  } else if (/^sen(ior)?$/i.test(rawGroup)) {
    cleanGroup = 'Senior';
  } else if (/^gen(eral)?$/i.test(rawGroup)) {
    cleanGroup = 'General';
  } else if (rawGroup.length > 0) {
    cleanGroup = rawGroup.charAt(0).toUpperCase() + rawGroup.slice(1).toLowerCase();
  }

  const rawName = (prog.competition_name || '').trim();
  if (!rawName) return cleanGroup;

  // If name already starts with the group name, avoid duplicating it
  const cleanPrefix = cleanGroup.toLowerCase();
  const lowerName = rawName.toLowerCase();
  if (lowerName.startsWith(cleanPrefix)) {
    let remainder = rawName.slice(cleanPrefix.length).trim();
    if (remainder.startsWith('-') || remainder.startsWith(':')) {
      remainder = remainder.slice(1).trim();
    }
    return remainder ? `${cleanGroup} - ${remainder}` : rawName;
  }

  return `${cleanGroup} - ${rawName}`;
}

/**
 * Renders live lifecycle status of the programme instead of a static "Enrolled" label.
 */
function renderProgrammeStatus(prog: ProgrammeItem) {
  const isOnStage = prog.stage_status === 'ON_STAGE' || prog.schedule_status === 'LIVE';
  const isCalled = prog.stage_status === 'CALLED';
  const isCheckIn = prog.check_in_status === 'REPORTED' || prog.schedule_status === 'CHECK_IN';
  const isResultsPublished = prog.result_status === 'PUBLISHED' || prog.competition_status === 'PUBLISHED';
  const isCompleted = prog.competition_status === 'COMPLETED' || prog.schedule_status === 'COMPLETED' || prog.stage_status === 'COMPLETED';
  const isScheduled = !!prog.start_at || prog.schedule_status === 'SCHEDULED';

  // 1. Result: Winner position (1st, 2nd, 3rd)
  if (isResultsPublished && prog.position) {
    if (prog.position === 1) {
      return (
        <span className="text-[11px] font-black text-amber-300 inline-flex items-center gap-1">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>1st Place</span>
        </span>
      );
    }
    if (prog.position === 2) {
      return (
        <span className="text-[11px] font-black text-slate-200 inline-flex items-center gap-1">
          <Award className="w-3.5 h-3.5 text-slate-300" />
          <span>2nd Place</span>
        </span>
      );
    }
    if (prog.position === 3) {
      return (
        <span className="text-[11px] font-black text-amber-600 inline-flex items-center gap-1">
          <Award className="w-3.5 h-3.5 text-amber-600" />
          <span>3rd Place</span>
        </span>
      );
    }
  }

  // 2. Result: Published
  if (isResultsPublished) {
    return (
      <span className="text-[11px] font-bold text-emerald-400 inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span>Results Out</span>
      </span>
    );
  }

  // 3. Stage Queue: Live on Stage
  if (isOnStage) {
    return (
      <span className="text-[11px] font-bold text-rose-400 animate-pulse inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        <span>Live on Stage</span>
      </span>
    );
  }

  // 4. Stage Queue: Called
  if (isCalled) {
    return (
      <span className="text-[11px] font-bold text-amber-400 animate-pulse inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        <span>Called</span>
      </span>
    );
  }

  // 5. Backstage Check-In / Reported
  if (isCheckIn) {
    return (
      <span className="text-[11px] font-bold text-amber-300 inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        <span>Reporting</span>
      </span>
    );
  }

  // 6. Completed
  if (isCompleted) {
    return (
      <span className="text-[11px] font-medium text-slate-300 inline-flex items-center gap-1">
        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
        <span>Completed</span>
      </span>
    );
  }

  // 7. Scheduled
  if (isScheduled) {
    return (
      <span className="text-[11px] font-medium text-sky-400 inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
        <span>Scheduled</span>
      </span>
    );
  }

  // 8. Default fallback: Registered
  return (
    <span className="text-[11px] font-medium text-slate-400 inline-flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
      <span>Registered</span>
    </span>
  );
}

/**
 * Determines whether a programme is Off-Stage or Stage based on competition_type / programme_group
 */
function isOffStageProgramme(prog: ProgrammeItem): boolean {
  const type = (prog.competition_type || '').toUpperCase();
  if (type.includes('OFF')) return true;
  if (type.includes('STAGE')) return false;

  const group = (prog.programme_group || '').toUpperCase();
  if (group.includes('OFF')) return true;

  return false;
}

function isStageProgramme(prog: ProgrammeItem): boolean {
  return !isOffStageProgramme(prog);
}

function isGroupProgramme(prog: ProgrammeItem): boolean {
  const partType = (prog.participation_type || '').toUpperCase();
  if (partType === 'GROUP' || partType === 'TEAM') return true;

  const compType = (prog.competition_type || '').toUpperCase();
  if (compType === 'GROUP' || compType === 'TEAM') return true;

  return false;
}

export const ParticipantProgrammesModal: React.FC<ParticipantProgrammesModalProps> = ({
  isOpen,
  onClose,
  participant,
}) => {
  const participantId = participant?.id;

  const {
    data: rawData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['participant-registrations', participantId],
    queryFn: async () => {
      if (!participantId) return [];
      const res = await api.get<any>(`/participants/${participantId}/registrations`);
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data?.data)) return res.data.data;
      return [];
    },
    enabled: isOpen && !!participantId,
  });

  const programmes: ProgrammeItem[] = React.useMemo(() => {
    if (!rawData || !Array.isArray(rawData)) return [];
    return rawData;
  }, [rawData]);

  if (!participant) return null;

  const participantName = participant.user_name || participant.name || 'Contestant';
  const chestCode = participant.participant_code || participant.registration_number || 'N/A';
  const teamName = participant.team_name || (participant.team_id === 1 ? 'Diraya' : participant.team_id === 2 ? 'Rivaya' : 'Team');
  const isDiraya = teamName.toUpperCase().includes('DIRAYA') || participant.team_id === 1;

  // Accurate Stage, Off-Stage, and Group counts
  const stageCount = programmes.filter(isStageProgramme).length;
  const offstageCount = programmes.filter(isOffStageProgramme).length;
  const groupCount = programmes.filter(isGroupProgramme).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Contestant Programmes"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* 1. Sleek Contestant Identity Header (Fluid, non-boxy) */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Chest code accent */}
            <div
              className={`font-mono font-black text-xs px-2.5 py-1.5 rounded-xl shrink-0 ${
                isDiraya
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              }`}
            >
              {chestCode}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white truncate">
                  {participantName}
                </h3>
                <span className={`text-xs font-bold ${isDiraya ? 'text-emerald-400' : 'text-rose-400'}`}>
                  • {teamName}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Category: <span className="text-amber-200/90 font-medium">{participant.category_name || 'General'}</span>
                {participant.class_name && (
                  <span> • Class: {participant.class_name}</span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-amber-300 hover:text-white transition-all cursor-pointer shrink-0"
            title="Refresh programmes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>

        {/* 2. Fluid Non-Boxy Stats Bar (No chunky rectangular box cards) */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3.5 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Total Enrolled:</span>
            <span className="font-black text-amber-300 tabular-nums">
              {isLoading ? '...' : programmes.length}
            </span>
          </div>
          <span className="text-white/10 hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-400">Stage:</span>
            <span className="font-bold text-slate-200 tabular-nums">{stageCount}</span>
          </div>
          <span className="text-white/10 hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span className="text-slate-400">Off-Stage:</span>
            <span className="font-bold text-slate-200 tabular-nums">{offstageCount}</span>
          </div>
          <span className="text-white/10 hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span className="text-slate-400">Group:</span>
            <span className="font-bold text-slate-200 tabular-nums">{groupCount}</span>
          </div>
        </div>

        {/* 3. Programmes List (Clean, non-boxy divider rows) */}
        <div className="space-y-1">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-amber-200/60 font-medium">
              Loading enrolled programmes...
            </div>
          ) : programmes.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2">
              <Sparkles className="w-7 h-7 text-amber-400/50 mx-auto" />
              <p className="text-xs font-bold text-slate-300">No Programmes Enrolled</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                This contestant has not been registered in any stage or off-stage competitions yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05] max-h-[52vh] overflow-y-auto pr-1">
              {programmes.map((prog, idx) => {
                const title = formatProgrammeTitle(prog, participant.category_name);
                const isGroup = isGroupProgramme(prog);
                const isOffstage = isOffStageProgramme(prog);
                const isOnStage = prog.stage_status === 'ON_STAGE';
                const isCalled = prog.stage_status === 'CALLED';
                const progNum = String(prog.programme_number || (idx + 1)).padStart(2, '0');

                return (
                  <div
                    key={prog.id || `${prog.competition_id}-${idx}`}
                    className="py-3 px-2 hover:bg-white/[0.03] rounded-xl transition-colors space-y-1.5 group"
                  >
                    {/* Top Row: Programme Number (without #) & Formatted Title */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-xs font-black text-amber-400/90 shrink-0 w-6 text-center">
                          {progNum}
                        </span>
                        <h4 className="text-sm font-bold text-white group-hover:text-amber-200 transition-colors truncate">
                          {title}
                        </h4>
                      </div>

                      {/* Live Programme Status Indicator */}
                      <div className="shrink-0 text-right">
                        {renderProgrammeStatus(prog)}
                      </div>
                    </div>

                    {/* Bottom Row: Subtle Clean Meta Tags (Text + dot dividers, no heavy boxes) */}
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pl-8 text-[11px] text-slate-400">
                      {/* Stage / Off-stage */}
                      <span className={`font-medium ${isOffstage ? 'text-sky-300' : 'text-emerald-300'}`}>
                        {isOffstage ? 'Off-Stage' : 'Stage'}
                      </span>

                      {/* Group tag only when it is a group event */}
                      {isGroup && (
                        <>
                          <span className="text-white/10">•</span>
                          <span className="text-purple-300 font-medium">Group</span>
                        </>
                      )}

                      {/* Venue (if present) */}
                      {prog.venue_name && (
                        <>
                          <span className="text-white/10">•</span>
                          <span className="flex items-center gap-1 text-slate-300">
                            <MapPin className="w-3 h-3 text-amber-400/70" />
                            {prog.venue_name}
                          </span>
                        </>
                      )}

                      {/* Schedule Time (if present) */}
                      {prog.start_at && (
                        <>
                          <span className="text-white/10">•</span>
                          <span className="flex items-center gap-1 font-mono text-slate-400">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {new Date(prog.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Footer */}
        <div className="pt-2 border-t border-white/[0.06] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
