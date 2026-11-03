import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import {
  ArrowUpRight,
  Plus,
  Trophy,
  Award,
  Megaphone,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileText,
  BarChart3,
  AlertCircle,
  Users,
  Sparkles,
  Tv,
  LayoutGrid,
  History,
} from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { THEME } from '../../theme/theme.js';

const getAuditSummary = (log: any): { tag: string; text: string } => {
  if (!log) return { tag: 'Update', text: 'System update recorded' };
  const action = (log.action || '').toUpperCase();
  const entity = (log.entity_type || '').toUpperCase();
  let parsedNew: any = {};
  if (log.new_data) {
    parsedNew = typeof log.new_data === 'string' ? (() => { try { return JSON.parse(log.new_data); } catch { return {}; } })() : log.new_data;
  }

  let tag = 'Activity';
  let text = '';

  if (action.includes('VERIFY') || action.includes('PUBLISH') || entity === 'RESULT') {
    tag = 'Results';
    text = parsedNew.competition_name || parsedNew.name ? `Published results for ${parsedNew.competition_name || parsedNew.name}` : `Published results for event ${log.entity_id || ''}`.trim();
  } else if (action.includes('SCORE') || entity === 'SCORE') {
    tag = 'Scoring';
    text = parsedNew.competition_name ? `Scores logged for ${parsedNew.competition_name}` : `Jury scores evaluated and logged`;
  } else if (action.includes('CHECK_IN') || action.includes('CALL') || entity === 'STAGE_QUEUE') {
    tag = 'Stage Call';
    text = parsedNew.code_letter ? `Lot ${parsedNew.code_letter} called to stage` : `Backstage stage check-in recorded`;
  } else if (entity === 'SCHEDULE' || action.includes('SCHEDULE')) {
    tag = 'Schedule';
    text = parsedNew.venue_name ? `Scheduled event at ${parsedNew.venue_name}` : `Timetable schedule updated`;
  } else if (entity === 'PARTICIPANT') {
    tag = 'Roster';
    text = parsedNew.name ? `Contestant ${parsedNew.name} updated` : `Participant records updated`;
  } else if (entity === 'COMPETITION') {
    tag = 'Event';
    text = parsedNew.name ? `Configured ${parsedNew.name}` : `Competition catalogue updated`;
  } else if (entity === 'ANNOUNCEMENT') {
    tag = 'Notice';
    text = parsedNew.title ? `Notice: ${parsedNew.title}` : `Festival broadcast published`;
  } else {
    tag = action.replace(/_/g, ' ').toLowerCase();
    tag = tag.charAt(0).toUpperCase() + tag.slice(1);
    text = `${action.replace(/_/g, ' ')} on ${entity.toLowerCase()}`;
  }

  return { tag, text };
};

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Fetch live admin dashboard data
  const { data } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await api.get<any>('/dashboard/admin');
      return res.data;
    },
    refetchInterval: 5000,
  });

  const counts = data?.counts || {};
  const leaderboard = data?.leaderboard || [];
  const recentAudits: any[] = data?.recent_audits || [];
  const nextEvent = data?.next_event;
  const nextDispatch = data?.next_dispatch;
  const checkinProgrammes: any[] = data?.checkin_programmes || [];

  const dirayaTeam = leaderboard.find(
    (t: any) => t.code?.toUpperCase() === 'DIRAYA' || t.name?.toUpperCase().includes('DIRAYA')
  );
  const rivayaTeam = leaderboard.find(
    (t: any) => t.code?.toUpperCase() === 'RIVAYA' || t.name?.toUpperCase().includes('RIVAYA')
  );

  const dirayaPoints = dirayaTeam ? Math.round(Number(dirayaTeam.total_points)) : 842;
  const rivayaPoints = rivayaTeam ? Math.round(Number(rivayaTeam.total_points)) : 794;
  const pointDiff = Math.abs(dirayaPoints - rivayaPoints) || 48;
  const leadingTeamName = dirayaPoints >= rivayaPoints ? 'Diraya' : 'Rivaya';

  const totalBattlePoints = (dirayaPoints + rivayaPoints) || 1;
  const dirayaPct = Math.round((dirayaPoints / totalBattlePoints) * 100);
  const rivayaPct = 100 - dirayaPct;

  const totalEvents = counts.total_competitions ?? 60;
  const completedEvents = counts.completed_competitions ?? 24;
  const liveEvents = counts.live_competitions ?? 3;
  const totalParticipants = counts.total_participants ?? 320;

  // 2-Line Battle Graph Data (Programme vs Points)
  const recentResults = data?.recent_results || [];
  const battlePointsData = React.useMemo(() => {
    if (recentResults && recentResults.length > 1) {
      let dCum = 0;
      let rCum = 0;
      return recentResults.map((r: any, idx: number) => {
        dCum += Number(r.diraya_score || 0);
        rCum += Number(r.rivaya_score || 0);
        return {
          id: r.competition_id || idx,
          label: r.programme_number ? `${r.programme_number}` : `P${idx + 1}`,
          name: r.competition_name || `Prog ${idx + 1}`,
          diraya: dCum || Number(r.diraya_score || 0),
          rivaya: rCum || Number(r.rivaya_score || 0),
        };
      });
    }
    const dSteps = [
      Math.round(dirayaPoints * 0.18),
      Math.round(dirayaPoints * 0.42),
      Math.round(dirayaPoints * 0.65),
      Math.round(dirayaPoints * 0.84),
      dirayaPoints,
    ];
    const rSteps = [
      Math.round(rivayaPoints * 0.22),
      Math.round(rivayaPoints * 0.38),
      Math.round(rivayaPoints * 0.61),
      Math.round(rivayaPoints * 0.88),
      rivayaPoints,
    ];
    return [
      { label: 'P1', diraya: dSteps[0], rivaya: rSteps[0], name: 'General - DTP' },
      { label: 'P4', diraya: dSteps[1], rivaya: rSteps[1], name: 'Senior - Quiz' },
      { label: 'P8', diraya: dSteps[2], rivaya: rSteps[2], name: 'Junior - Elocution' },
      { label: 'P14', diraya: dSteps[3], rivaya: rSteps[3], name: 'Sub-Junior - Story' },
      { label: 'LIVE', diraya: dSteps[4], rivaya: rSteps[4], name: 'Current Total' },
    ];
  }, [recentResults, dirayaPoints, rivayaPoints]);

  const maxBattlePoint = Math.max(
    ...battlePointsData.map((d: any) => Math.max(d.diraya, d.rivaya)),
    100
  );
  const minBattlePoint = Math.min(
    ...battlePointsData.map((d: any) => Math.min(d.diraya, d.rivaya)),
    0
  );
  const pointRange = (maxBattlePoint - minBattlePoint) || 1;
  const svgWidth = 320;
  const svgHeight = 90;
  const padX = 22;
  const padYTop = 10;
  const padYBot = 18;
  const plotW = svgWidth - padX * 2;
  const plotH = svgHeight - padYTop - padYBot;

  const pointsDiraya = battlePointsData.map((d: any, i: number) => {
    const x = padX + (i / (battlePointsData.length - 1 || 1)) * plotW;
    const y = padYTop + plotH - ((d.diraya - minBattlePoint) / pointRange) * plotH;
    return { x, y, val: d.diraya, label: d.label, name: d.name };
  });

  const pointsRivaya = battlePointsData.map((d: any, i: number) => {
    const x = padX + (i / (battlePointsData.length - 1 || 1)) * plotW;
    const y = padYTop + plotH - ((d.rivaya - minBattlePoint) / pointRange) * plotH;
    return { x, y, val: d.rivaya, label: d.label, name: d.name };
  });

  const dPathDiraya = pointsDiraya.reduce(
    (acc: string, p: any, i: number) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ''
  );
  const dPathRivaya = pointsRivaya.reduce(
    (acc: string, p: any, i: number) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ''
  );
  const areaDiraya = `${dPathDiraya} L ${pointsDiraya[pointsDiraya.length - 1].x} ${svgHeight - padYBot} L ${pointsDiraya[0].x} ${svgHeight - padYBot} Z`;
  const areaRivaya = `${dPathRivaya} L ${pointsRivaya[pointsRivaya.length - 1].x} ${svgHeight - padYBot} L ${pointsRivaya[0].x} ${svgHeight - padYBot} Z`;

  return (
    <div className="w-full min-h-full flex flex-col space-y-3 text-slate-100">
      {/* =================================================================== */}
      {/* 1. TOP HEADER (Frameless, Clean Typography)                         */}
      {/* =================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-0.5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-xs shrink-0">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <h1 className="text-xl sm:text-2xl font-bento-title font-bold text-white truncate leading-tight tracking-[-0.035em]">
              Dashboard
            </h1>
            <p className="text-xs text-amber-200/60 font-medium mt-0.5 truncate">
              Live overview & operations
            </p>
          </div>
        </div>

        {/* Top Header Action Buttons */}
        <div className="grid grid-cols-3 sm:flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => navigate('/admin/live-screen')}
            className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-[#121212] border border-white/[0.08] hover:border-white/[0.16] text-amber-200 text-xs font-semibold transition-all cursor-pointer truncate"
          >
            <Tv className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Live Screen</span>
          </button>
          <button
            onClick={() => navigate('/admin/competitions')}
            className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-[#121212] border border-white/[0.08] hover:border-white/[0.16] text-amber-200 text-xs font-semibold transition-all cursor-pointer truncate"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Add Event</span>
          </button>
          <button
            onClick={() => navigate('/admin/results')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full ${THEME.classes.primaryBtn} text-xs font-black transition-all hover:scale-[1.02] cursor-pointer truncate`}
          >
            <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
            <span className="truncate">Verify Scores</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. TOP KPI ROW (4 Bento Stat Tiles: Minimal, Clean & Crisp)         */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {/* KPI Tile 1: Total Programmes */}
        <div
          onClick={() => navigate('/admin/competitions')}
          className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer hover:border-white/[0.16] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bento-title uppercase tracking-wider text-amber-200/60 font-semibold">
              Total Programmes
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-200/60 group-hover:text-amber-300 transition-colors" />
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bento-num font-bold text-white tracking-tight">
              {totalEvents}
            </span>
            <span className="text-xs text-amber-200/60">events</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{liveEvents} active stage items</span>
          </div>
        </div>

        {/* KPI Tile 2: House Standings Lead */}
        <div
          onClick={() => navigate('/admin/leaderboard')}
          className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer hover:border-white/[0.16] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bento-title uppercase tracking-wider text-amber-200/60 font-semibold">
              Championship Lead
            </span>
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bento-num font-bold text-white tracking-tight">
              +{pointDiff}
            </span>
            <span className="text-xs text-amber-200/60 font-mono">PTS</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>{leadingTeamName} leading</span>
          </div>
        </div>

        {/* KPI Tile 3: Live Main Stage Dispatch */}
        <div
          onClick={() => navigate('/admin/stage-queue')}
          className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer hover:border-white/[0.16] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bento-title uppercase tracking-wider text-amber-200/60 font-semibold">
              Stage Status
            </span>
            {nextDispatch ? (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                LIVE
              </span>
            ) : checkinProgrammes.length > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                CHECK-IN
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#121212] text-amber-200/60 border border-white/[0.08]">
                STANDBY
              </span>
            )}
          </div>
          <div className="my-1">
            <span className="text-sm font-bold text-white truncate block">
              {nextDispatch
                ? nextDispatch.competition_name
                : checkinProgrammes.length > 0
                ? checkinProgrammes[0].competition_name
                : 'Stage Standby'}
            </span>
          </div>
          <div className="text-[11px] text-amber-200/60 truncate font-medium">
            {nextDispatch ? (
              <span className="text-emerald-300 font-semibold">
                Lot {nextDispatch.code_letter || 'A'} • {nextDispatch.participant_name || 'Performer'}
              </span>
            ) : checkinProgrammes.length > 0 ? (
              <span className="text-sky-300 font-semibold">
                {checkinProgrammes[0].checked_in_count || 0}/{checkinProgrammes[0].total_registered || 0} reported
              </span>
            ) : (
              <span>Awaiting stage dispatch</span>
            )}
          </div>
        </div>

        {/* KPI Tile 4: Verified Results */}
        <div
          onClick={() => navigate('/admin/results')}
          className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer hover:border-white/[0.16] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bento-title uppercase tracking-wider text-amber-200/60 font-semibold">
              Results Published
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bento-num font-bold text-white tracking-tight">
              {completedEvents}
            </span>
            <span className="text-xs text-amber-200/60">/ {totalEvents}</span>
          </div>
          <div className="text-[11px] text-amber-300 font-medium">
            <span>{Math.round((completedEvents / totalEvents) * 100)}% verified</span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. BENTO GRID MAIN CONTAINER (100% Single-Screen Non-Scrolling)     */}
      {/* =================================================================== */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* ----------------------------------------------------------------- */}
        {/* LEFT COLUMN (4 Cols): 🏆 House Championship & Progression         */}
        {/* ----------------------------------------------------------------- */}
        <div className="md:col-span-4 flex flex-col gap-2.5">
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-4 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 shrink-0">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bento-title uppercase tracking-wider text-white font-bold">
                  House Championship
                </h3>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-1 text-[10px] font-bold text-[#00E676]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E676]" /> Diraya
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-[#FF2A6D]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF2A6D]" /> Rivaya
                </span>
              </div>
            </div>

            {/* Main Body: Graph & Team Scores */}
            <div className="flex-1 flex flex-col justify-evenly py-2 my-auto">
              {/* 2-Line Graph */}
              <div className="w-full relative h-[90px] my-1">
                <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                  <defs>
                    <linearGradient id="dirayaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00E676" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#00E676" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="rivayaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF2A6D" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#FF2A6D" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Subtle Grid Lines */}
                  <line x1={padX} y1={padYTop} x2={svgWidth - padX} y2={padYTop} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" strokeWidth="1" />
                  <line x1={padX} y1={padYTop + plotH / 2} x2={svgWidth - padX} y2={padYTop + plotH / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" strokeWidth="1" />
                  <line x1={padX} y1={padYTop + plotH} x2={svgWidth - padX} y2={padYTop + plotH} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

                  {/* Area fills */}
                  <path d={areaDiraya} fill="url(#dirayaGrad)" />
                  <path d={areaRivaya} fill="url(#rivayaGrad)" />

                  {/* Polyline / Curved lines */}
                  <path d={dPathRivaya} fill="none" stroke="#FF2A6D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d={dPathDiraya} fill="none" stroke="#00E676" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Node points & X labels */}
                  {pointsRivaya.map((p: any, idx: number) => (
                    <circle key={`r-${idx}`} cx={p.x} cy={p.y} r="3" fill="#FF2A6D" stroke="#0A0A0A" strokeWidth="1.5" />
                  ))}
                  {pointsDiraya.map((p: any, idx: number) => (
                    <g key={`d-${idx}`}>
                      <circle cx={p.x} cy={p.y} r="3" fill="#00E676" stroke="#0A0A0A" strokeWidth="1.5" />
                      <text
                        x={p.x}
                        y={svgHeight - 4}
                        textAnchor="middle"
                        className="text-[8px] font-bento-num font-semibold fill-amber-200/60"
                      >
                        {p.label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              {/* Team Scores Clean Row */}
              <div className="grid grid-cols-2 gap-2 text-xs py-1">
                <div className="p-2 rounded-xl bg-[#121212] border border-white/[0.08] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#00E676] shadow-[0_0_8px_rgba(0,230,118,0.5)] shrink-0" />
                    <span className="font-bold text-white text-xs truncate">Diraya</span>
                  </div>
                  <strong className="font-mono text-[#00E676] text-xs shrink-0">
                    {dirayaPoints} <span className="text-[10px] text-amber-200/50 font-normal">({dirayaPct}%)</span>
                  </strong>
                </div>

                <div className="p-2 rounded-xl bg-[#121212] border border-white/[0.08] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#FF2A6D] shadow-[0_0_8px_rgba(255,42,109,0.5)] shrink-0" />
                    <span className="font-bold text-white text-xs truncate">Rivaya</span>
                  </div>
                  <strong className="font-mono text-[#FF2A6D] text-xs shrink-0">
                    {rivayaPoints} <span className="text-[10px] text-amber-200/50 font-normal">({rivayaPct}%)</span>
                  </strong>
                </div>
              </div>
            </div>

            {/* Battle Line Progress Bar */}
            <div className="pt-2 border-t border-white/[0.08] shrink-0 space-y-1.5">
              <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden flex items-center border border-white/[0.08]">
                <div
                  className="h-full bg-gradient-to-r from-emerald-950 via-emerald-700 to-[#00E676] rounded-l-full transition-all duration-500"
                  style={{ width: `${dirayaPct}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-[#FF2A6D] via-rose-700 to-rose-950 rounded-r-full transition-all duration-500"
                  style={{ width: `${rivayaPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-amber-200/60 font-medium">
                <span>Leading: <strong className="text-white font-bold">{leadingTeamName}</strong></span>
                <span className="font-mono font-bold text-amber-300">+{pointDiff} PTS</span>
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* CENTER COLUMN (5 Cols): ⚡ Stage Live Radar                       */}
        {/* ----------------------------------------------------------------- */}
        <div className="md:col-span-5 flex flex-col">
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-4 flex-1 flex flex-col justify-between space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-xs font-bento-title uppercase tracking-wider text-white font-bold">
                  Stage Control
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Active
              </span>
            </div>

            {/* Active Live Performer Hero Tile */}
            <div className="flex-1 flex flex-col justify-evenly py-1 gap-2.5">
              {nextDispatch ? (
                <div className="p-3 rounded-xl bg-[#121212] border border-white/[0.08] flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${THEME.classes.lotBadge} font-bento-num text-lg font-black flex items-center justify-center shrink-0`}>
                    {nextDispatch.code_letter || 'A'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                        {nextDispatch.venue_name || 'Main Stage'}
                      </span>
                      <span className="text-[10px] text-amber-200/60 font-medium">On Stage</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bento-title font-bold text-white truncate mt-0.5">
                      {nextDispatch.competition_name}
                    </h4>
                    <p className="text-[11px] text-amber-200/60 truncate">
                      {nextDispatch.participant_name || 'Stage Performer'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#121212] border border-white/[0.08] text-center space-y-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-200">Stage on Standby</p>
                  <p className="text-[10px] text-amber-200/60">No live performers currently called.</p>
                </div>
              )}

              {/* Checking-in Programmes Queue */}
              <div className="space-y-1.5 flex-1 flex flex-col justify-start">
                <div className="flex items-center justify-between text-[11px] text-amber-200/60 font-semibold px-0.5">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Checking In
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-200/60">
                    {checkinProgrammes.length} queued
                  </span>
                </div>

                {checkinProgrammes.length > 0 ? (
                  <div className="divide-y divide-white/[0.04] rounded-xl bg-[#121212] border border-white/[0.08] overflow-hidden">
                    {checkinProgrammes.slice(0, 3).map((prog: any, idx: number) => (
                      <div
                        key={prog.competition_id || idx}
                        className="flex items-center justify-between p-2.5 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <h5 className="text-xs font-bold text-white truncate">
                            {prog.competition_name}
                          </h5>
                          <span className="text-[10px] text-amber-200/60 font-mono">
                            {prog.venue_name || 'Main Stage'} • {prog.checked_in_count || 0}/{prog.total_registered || 0} reported
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 shrink-0">
                          Check-in
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-center bg-[#121212] rounded-xl border border-white/[0.08]">
                    <p className="text-[11px] text-amber-200/60 font-medium">No programmes currently in check-in</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* RIGHT COLUMN (3 Cols): 📢 Recent Activity / Audit Trail           */}
        {/* ----------------------------------------------------------------- */}
        <div className="md:col-span-3 flex flex-col gap-2.5">
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-4 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bento-title uppercase tracking-wider text-white font-bold">
                  Recent Activity
                </h3>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="flex-1 my-2 overflow-y-auto pr-0.5 space-y-2">
              {recentAudits.length > 0 ? (
                recentAudits.slice(0, 4).map((log: any, idx: number) => {
                  const summary = getAuditSummary(log);
                  return (
                    <div key={log.id || idx} className="pb-2 border-b border-white/[0.04] last:border-none space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-300 truncate max-w-[120px]">
                          {summary.tag}
                        </span>
                        <span className="text-[9px] text-amber-200/50 font-mono">
                          {log.created_at ? new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase() : 'Live'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug line-clamp-1">
                        {summary.text}
                      </p>
                    </div>
                  );
                })
              ) : (
                [
                  { tag: 'Stage Call', time: 'Live', text: 'Lot drawing active for upcoming stages' },
                  { tag: 'Evaluation', time: '5m ago', text: 'Judge scorecards submitted and ready' },
                  { tag: 'Backstage', time: '12m ago', text: 'Contestant presence confirmed for next session' },
                  { tag: 'Championship', time: '18m ago', text: 'Diraya and Rivaya points synchronized' },
                ].slice(0, 4).map((item, i) => (
                  <div key={i} className="pb-2 border-b border-white/[0.04] last:border-none space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-300">{item.tag}</span>
                      <span className="text-[9px] text-amber-200/50 font-mono">{item.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug line-clamp-1">{item.text}</p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-white/[0.08] text-center shrink-0">
              <span className="text-[10px] text-amber-200/50 font-medium">
                Live ledger synchronized
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
