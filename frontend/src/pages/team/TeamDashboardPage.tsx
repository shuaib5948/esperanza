import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import {
  Trophy,
  Users,
  Award,
  ClipboardList,
  Sparkles,
  Megaphone,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  FileText,
  BarChart3,
  Flame,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button.js';

export const TeamDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['team-dashboard'],
    queryFn: async () => {
      const res = await api.get<any>('/dashboard/team');
      return res.data;
    },
    refetchInterval: 3000,
  });

  const team = data?.team;
  const registrations = data?.registrations || {};
  const positions = data?.positions || [];
  const totalPoints = Number(data?.total_points || 0);
  const teamRank = data?.rank || 1;
  const nextDispatch = data?.next_dispatch;
  const unreportedStudent = data?.unreported_student;
  const unreportedStudents: any[] = data?.unreported_students || (data?.unreported_student ? [data.unreported_student] : []);
  const broadcasts: any[] = data?.broadcasts || [];

  const firstPlaces = positions.find((p: any) => Number(p.position) === 1)?.count || 0;
  const secondPlaces = positions.find((p: any) => Number(p.position) === 2)?.count || 0;
  const thirdPlaces = positions.find((p: any) => Number(p.position) === 3)?.count || 0;
  const totalPodiums = firstPlaces + secondPlaces + thirdPlaces;

  // Donut chart calculations
  const totalMedalsForChart = totalPodiums || 1;
  const goldPct = Math.round((firstPlaces / totalMedalsForChart) * 100);
  const silverPct = Math.round((secondPlaces / totalMedalsForChart) * 100);
  const bronzePct = Math.round((thirdPlaces / totalMedalsForChart) * 100);

  const individualRegs = registrations.individual_count || 0;
  const groupRegs = registrations.group_count || 0;

  return (
    <div className="w-full h-full flex flex-col justify-between space-y-3 overflow-hidden text-slate-900">
      {/* =================================================================== */}
      {/* 1. COMPACT TOP HEADER BAR                                           */}
      {/* =================================================================== */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200/80 px-4 py-2.5 rounded-2xl shadow-xs shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-2xs shrink-0 border border-white font-bento-num"
            style={{ backgroundColor: team?.color || '#0D472D' }}
          >
            {team?.code?.substring(0, 2) || 'TM'}
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bento-title text-slate-900 truncate leading-tight tracking-[-0.035em]">
                {team?.name || 'Loading Team...'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#E6F4EA] text-[#0D472D] border border-emerald-200 shrink-0 font-bento-title">
                {team?.code || 'HOUSE TEAM'}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">
              Official House Contingent Command Center
            </p>
          </div>
        </div>

        {/* Action Navigation Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/team/roster')}
            className="rounded-xl font-bold text-xs"
          >
            <Users className="w-3.5 h-3.5 mr-1" />
            <span>Roster</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/team/registrations')}
            className="bg-[#0D472D] hover:bg-[#07321e] text-white font-bold text-xs shadow-xs rounded-xl px-4 py-2 cursor-pointer"
          >
            <ClipboardList className="w-3.5 h-3.5 mr-1" />
            <span>+ Register Entries</span>
          </Button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. BENTO GRID MAIN CONTAINER (100% Single-Screen Non-Scrolling)     */}
      {/* =================================================================== */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3.5 min-h-0 overflow-hidden">
        {/* ----------------------------------------------------------------- */}
        {/* LEFT COLUMN (4 Cols): Hero KPI & Podium Analytics Donut Chart     */}
        {/* ----------------------------------------------------------------- */}
        <div className="md:col-span-4 flex flex-col gap-3 min-h-0 overflow-hidden">
          {/* Hero KPI Tile: Dark Emerald Accent */}
          <div
            onClick={() => navigate('/leaderboard')}
            className="bg-[#0D472D] text-white rounded-2xl p-4 shadow-xs flex flex-col justify-between shrink-0 cursor-pointer hover:bg-[#093923] transition-all relative overflow-hidden group"
          >
            <div className="flex items-center justify-between z-10">
              <span className="text-xs font-bento-title uppercase tracking-wider text-emerald-200">
                Live Standings Score
              </span>
              <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="my-3 z-10">
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl xl:text-5xl font-bento-num tracking-[-0.04em] text-white">
                  {totalPoints.toFixed(0)}
                </span>
                <span className="text-sm font-bento-title text-emerald-300">PTS</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/15 text-xs text-emerald-100 z-10">
              <div className="flex items-center gap-1.5 font-bold">
                <Trophy className="w-4 h-4 text-amber-300" />
                <span>Leaderboard Standing</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-white font-bento-num text-xs">
                Rank #{teamRank}
              </span>
            </div>

            {/* Background Glow */}
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/30 transition-all" />
          </div>

          {/* Podium Donut Analytics Chart Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#0D472D]" />
                <h3 className="text-xs font-bento-title uppercase tracking-wider text-slate-800">
                  Podium Breakdown
                </h3>
              </div>
              <span className="text-[11px] font-bento-num text-slate-500">
                {totalPodiums} Total Medals
              </span>
            </div>

            {/* Donut Chart Visual */}
            <div className="flex items-center justify-center gap-6 py-2 my-auto">
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Gold Segment */}
                  <path
                    className="text-amber-400"
                    strokeDasharray={`${goldPct}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-bento-num text-slate-900 leading-none">
                    {totalPodiums}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Medals</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-2 text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-amber-400 shrink-0" />
                  <span className="text-slate-600">🥇 1st Place:</span>
                  <strong className="text-slate-900 font-bento-num">{firstPlaces}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-slate-300 shrink-0" />
                  <span className="text-slate-600">🥈 2nd Place:</span>
                  <strong className="text-slate-900 font-bento-num">{secondPlaces}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-amber-600/80 shrink-0" />
                  <span className="text-slate-600">🥉 3rd Place:</span>
                  <strong className="text-slate-900 font-bento-num">{thirdPlaces}</strong>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Points Contribution</span>
              <strong className="text-[#0D472D] font-bento-num">100% Calculated</strong>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* CENTER COLUMN (5 Cols): Live Dispatch Radar & Cap Monitor        */}
        {/* ----------------------------------------------------------------- */}
        <div className="md:col-span-5 flex flex-col min-h-0 overflow-hidden">
          {/* Card 3: Live Stage Dispatch Radar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="text-xs font-bento-title uppercase tracking-wider text-slate-800">
                  Live Stage Radar
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-[#E6F4EA] text-[#0D472D] text-[10px] font-bento-title uppercase border border-emerald-200">
                STAGE ITEMS ONLY
              </span>
            </div>

            {/* Main Content Area - Fully Organized Vertical Stack */}
            <div className="flex-1 flex flex-col justify-evenly py-3 gap-3 overflow-y-auto pr-0.5">
              {/* Point 1: Next Performer in Live Programme (Hero Card) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bento-title uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    Next Team Performer
                  </span>
                  <span className="text-xs font-bento-num font-bold text-[#0D472D] bg-white px-2 py-0.5 rounded-md border border-slate-200 uppercase">
                    {nextDispatch?.venue_name || 'MAIN STAGE'}
                  </span>
                </div>

                {nextDispatch ? (
                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-11 h-11 rounded-xl bg-[#0D472D] text-white font-bento-num text-lg flex items-center justify-center shadow-xs shrink-0 font-bold">
                      {nextDispatch.code_letter || 'A'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bento-num font-bold text-slate-900">
                          {nextDispatch.participant_code}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bento-title uppercase rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold">
                          LOT {nextDispatch.code_letter || 'A'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bento-title text-slate-900 truncate mt-0.5">
                        {nextDispatch.competition_name}
                      </h4>
                      <p className="text-xs text-slate-500 truncate">
                        {nextDispatch.participant_name || 'Team Contestant'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 text-center bg-white rounded-xl border border-slate-200/60 space-y-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                    <h4 className="text-xs font-bento-title text-slate-900 font-bold">No Active Live Programme On Stage</h4>
                    <p className="text-[10px] text-slate-500">
                      Your team's live stage performer will appear here when an event is set to LIVE.
                    </p>
                  </div>
                )}
              </div>

              {/* Point 2: Unreported / Absent Participant Alert (Alert Box) */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bento-title uppercase text-amber-900 tracking-wider flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Unreported Check-in Alert
                  </span>
                  {unreportedStudents.length > 0 && (
                    <span className="text-[10px] font-bento-title uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md font-bold border border-amber-300">
                      {unreportedStudents.length > 1
                        ? `${unreportedStudents.length} NOT REPORTED`
                        : unreportedStudents[0]?.stage_status === 'ABSENT' || unreportedStudents[0]?.check_in_status === 'ABSENT'
                        ? 'ABSENT'
                        : 'NOT REPORTED'}
                    </span>
                  )}
                </div>

                {unreportedStudents.length > 0 ? (
                  <div className="pt-0.5 space-y-1.5 max-h-28 overflow-y-auto pr-0.5">
                    {Array.from(new Set(unreportedStudents.map((s: any) => s.competition_name))).map((compName: any) => {
                      const studentsInComp = unreportedStudents.filter((s: any) => s.competition_name === compName);
                      const venue = studentsInComp[0]?.venue_name;
                      return (
                        <div key={compName} className="space-y-0.5">
                          <h4 className="text-xs sm:text-sm font-bento-title font-bold text-slate-900 truncate">
                            {compName || 'General - DTP'}
                          </h4>
                          <p className="text-xs font-semibold text-amber-900 truncate">
                            {studentsInComp.map((s: any) => s.participant_name).filter(Boolean).join(', ')}
                          </p>
                          {venue && (
                            <p className="text-[10px] text-slate-500 font-medium truncate">
                              Backstage: {venue}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-0.5 text-emerald-800 text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>All team members reported on time for check-in</span>
                  </div>
                )}
              </div>
            </div>

            {/* Point 3: Live Programme Participant Count Footer Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-center text-xs pt-3 border-t border-slate-100 shrink-0">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-center">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Checked In Contestants</span>
                <strong className="text-base text-slate-900 font-bento-num mt-0.5">{registrations.approved ?? 0} Students</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-center">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Live Stage Pending</span>
                <strong className="text-base text-[#0D472D] font-bento-num mt-0.5">{registrations.pending ?? 0} Entries</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* RIGHT COLUMN (3 Cols): Admin Feed & Quick Tools Hub               */}
        {/* ----------------------------------------------------------------- */}
        <div className="md:col-span-3 flex flex-col gap-3 min-h-0 overflow-hidden">
          {/* Card 5: Live Admin Announcements Ticker */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#0D472D]" />
                <h3 className="text-xs font-bento-title uppercase tracking-wider text-slate-800">
                  Control Broadcasts
                </h3>
              </div>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </div>

            <div className="flex-1 my-2 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
              {broadcasts.length > 0 ? (
                broadcasts.map((log: any, idx: number) => (
                  <div key={log.id || idx} className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bento-title text-[#0D472D] uppercase truncate max-w-[120px] font-bold">
                        {log.action || 'System Notice'}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium shrink-0">
                        {log.created_at ? new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase() : 'Live'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-snug truncate">
                      {log.details || 'Official festival broadcast'}
                    </p>
                  </div>
                ))
              ) : (
                <>
                  <div className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bento-title text-[#0D472D] uppercase font-bold">Stage Control</span>
                      <span className="text-[9px] text-slate-400 font-medium">Just Now</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-snug">
                      Stage queues & lot drawing active.
                    </p>
                  </div>
                  <div className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bento-title text-amber-700 uppercase font-bold">Off-Stage Update</span>
                      <span className="text-[9px] text-slate-400 font-medium">10m ago</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-snug">
                      Evaluation portal active for submissions.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 text-center shrink-0">
              <span className="text-[10px] text-slate-400 font-medium">
                Live alerts sync automatically
              </span>
            </div>
          </div>

          {/* Card 6: Quick Tools Hub */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs space-y-2 shrink-0">
            <span className="text-[10px] font-bento-title uppercase tracking-wider text-slate-400 block mb-1">
              Quick Tools Hub
            </span>

            <button
              onClick={() => navigate('/team/roster')}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[#0D472D]" />
                <span>Export Team Roster</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={() => navigate('/leaderboard')}
              className="w-full px-3 py-2 rounded-xl bg-[#E6F4EA] hover:bg-emerald-100 border border-emerald-200 text-[#0D472D] text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-[#0D472D]" />
                <span>Festival Standings</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#0D472D]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
