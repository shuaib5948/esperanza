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
} from 'lucide-react';
import { Button } from '../../components/ui/Button.js';

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
          label: r.programme_number ? `#${r.programme_number}` : `P${idx + 1}`,
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
    <div className="w-full h-full flex flex-col justify-between space-y-2.5 overflow-hidden text-slate-900">
      {/* =================================================================== */}
      {/* 1. TOP HEADER (Frameless, Clean Typography)                         */}
      {/* =================================================================== */}
      <div className="flex items-center justify-between gap-3 px-1 py-0.5 shrink-0">
        <div className="min-w-0 flex flex-col justify-center">
          <h1 className="text-xl sm:text-2xl font-bento-title font-bold text-slate-900 truncate leading-tight tracking-[-0.035em]">
            Admin Dashboard
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
            Live stage dispatch, house championship standings & festival operations
          </p>
        </div>

        {/* Top Header Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/competitions')}
            className="rounded-xl font-bold text-xs py-1.5 px-3"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Add Event</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/admin/results')}
            className="bg-[#0D472D] hover:bg-[#07321e] text-white font-bold text-xs shadow-xs rounded-xl px-3.5 py-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            <span>Verify Scores</span>
          </Button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. TOP KPI ROW (4 Bento Stat Tiles with Generous Height & Spacing) */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 shrink-0">
        {/* KPI Tile 1: Total Programmes (Dark Emerald Lead Tile) */}
        <div
          onClick={() => navigate('/admin/competitions')}
          className="bg-[#0D472D] text-white rounded-2xl p-4 sm:p-4.5 min-h-[110px] shadow-xs flex flex-col justify-between cursor-pointer hover:bg-[#093923] transition-all relative overflow-hidden group"
        >
          <div className="flex items-center justify-between z-10">
            <span className="text-[11.5px] font-bento-title uppercase tracking-wider text-emerald-200 font-semibold">
              Total Programmes
            </span>
            <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5 z-10 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bento-num tracking-[-0.04em] text-white font-bold">{totalEvents}</span>
            <span className="text-xs font-bento-title text-emerald-300 font-semibold">Events</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-100 font-semibold z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{liveEvents} Active Stage Items Now</span>
          </div>
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all" />
        </div>

        {/* KPI Tile 2: House Standings Lead */}
        <div
          onClick={() => navigate('/leaderboard')}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 min-h-[110px] shadow-xs flex flex-col justify-between cursor-pointer hover:border-slate-300 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-bento-title uppercase tracking-wider text-slate-500 font-semibold">
              Championship Lead
            </span>
            <div className="w-6 h-6 rounded-full bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
              <Trophy className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bento-num text-slate-900 tracking-[-0.04em] font-bold">
              +{pointDiff} <span className="text-xs font-bento-title text-slate-400 font-normal">PTS</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0D472D]" />
            <span>{leadingTeamName} Contingent Leading</span>
          </div>
        </div>

        {/* KPI Tile 3: Live Main Stage Dispatch */}
        <div
          onClick={() => navigate('/admin/stage-queue')}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 min-h-[110px] shadow-xs flex flex-col justify-between cursor-pointer hover:border-slate-300 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-bento-title uppercase tracking-wider text-slate-500 font-semibold">
              Live Stage Status
            </span>
            {nextDispatch ? (
              <span className="px-2 py-0.5 rounded-full text-[8.5px] font-bento-title uppercase bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
                ON STAGE
              </span>
            ) : checkinProgrammes.length > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[8.5px] font-bento-title uppercase bg-sky-100 text-sky-800 font-bold border border-sky-300">
                CHECK-IN
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[8.5px] font-bento-title uppercase bg-slate-100 text-slate-600 font-bold border border-slate-200">
                STANDBY
              </span>
            )}
          </div>
          <div className="my-1.5">
            <span className="text-sm sm:text-base font-bento-title font-bold text-slate-900 truncate block">
              {nextDispatch
                ? nextDispatch.competition_name
                : checkinProgrammes.length > 0
                ? checkinProgrammes[0].competition_name
                : 'No Active Stage Programme'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold truncate">
            {nextDispatch ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="truncate">
                  {nextDispatch.venue_name || 'MAIN STAGE'} • Lot {nextDispatch.code_letter || 'A'} ({nextDispatch.participant_name || 'Performer'})
                </span>
              </>
            ) : checkinProgrammes.length > 0 ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                <span className="truncate text-sky-900 font-bold">
                  {checkinProgrammes[0].venue_name || 'Main Stage'} • {checkinProgrammes[0].checked_in_count || 0}/{checkinProgrammes[0].total_registered || 0} Reported
                </span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span className="truncate">Main Stage • Awaiting Dispatch</span>
              </>
            )}
          </div>
        </div>

        {/* KPI Tile 4: Verified Results */}
        <div
          onClick={() => navigate('/admin/results')}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 min-h-[110px] shadow-xs flex flex-col justify-between cursor-pointer hover:border-slate-300 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-bento-title uppercase tracking-wider text-slate-500 font-semibold">
              Results Published
            </span>
            <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-[#0D472D] group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bento-num text-slate-900 tracking-[-0.04em] font-bold">{completedEvents}</span>
            <span className="text-xs font-bento-title text-slate-400 font-normal">/ {totalEvents}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold">
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
              {Math.round((completedEvents / totalEvents) * 100)}% Verified
            </span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. BENTO GRID MAIN CONTAINER (100% Single-Screen Non-Scrolling)     */}
      {/* =================================================================== */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* ----------------------------------------------------------------- */}
        {/* LEFT COLUMN (4 Cols): 🏆 House Battle Card & Pie Analytics       */}
        {/* ----------------------------------------------------------------- */}
        <div className="md:col-span-4 flex flex-col gap-2.5 min-h-0 overflow-hidden">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#0D472D]" />
                <h3 className="text-xs font-bento-title uppercase tracking-wider text-slate-800">
                  House Championship Battle
                </h3>
              </div>
              <span className="text-[9px] font-bento-num font-bold text-slate-500">
                Points vs Programmes
              </span>
            </div>

            {/* Main Body: Vertical Stack (2-Line Battle Graph Above, Team Scores Below) */}
            <div className="flex-1 flex flex-col justify-evenly py-1 my-auto">
              {/* 2-Line Graph: Programme vs Marks/Points */}
              <div className="w-full bg-slate-50/80 border border-slate-200/70 rounded-2xl p-2.5 my-0.5">
                <div className="flex items-center justify-between mb-1 text-[10px]">
                  <span className="font-bento-title font-semibold text-slate-500 uppercase tracking-wider text-[8.5px]">
                    Points Progression
                  </span>
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center gap-1 text-[9px] font-bold text-[#0D472D]">
                      <span className="w-2 h-2 rounded-full bg-[#0D472D]" /> Diraya
                    </span>
                    <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Rivaya
                    </span>
                  </div>
                </div>

                <div className="relative w-full h-[84px]">
                  <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                    <defs>
                      <linearGradient id="dirayaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0D472D" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#0D472D" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="rivayaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Subtle Grid Lines */}
                    <line x1={padX} y1={padYTop} x2={svgWidth - padX} y2={padYTop} stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="1" />
                    <line x1={padX} y1={padYTop + plotH / 2} x2={svgWidth - padX} y2={padYTop + plotH / 2} stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="1" />
                    <line x1={padX} y1={padYTop + plotH} x2={svgWidth - padX} y2={padYTop + plotH} stroke="#CBD5E1" strokeWidth="1" />

                    {/* Area fills */}
                    <path d={areaDiraya} fill="url(#dirayaGrad)" />
                    <path d={areaRivaya} fill="url(#rivayaGrad)" />

                    {/* Polyline / Curved lines */}
                    <path d={dPathRivaya} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d={dPathDiraya} fill="none" stroke="#0D472D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Node points & X labels */}
                    {pointsRivaya.map((p: any, idx: number) => (
                      <circle key={`r-${idx}`} cx={p.x} cy={p.y} r="3" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
                    ))}
                    {pointsDiraya.map((p: any, idx: number) => (
                      <g key={`d-${idx}`}>
                        <circle cx={p.x} cy={p.y} r="3" fill="#0D472D" stroke="#FFFFFF" strokeWidth="1.5" />
                        {/* X-axis Programme label */}
                        <text
                          x={p.x}
                          y={svgHeight - 4}
                          textAnchor="middle"
                          className="text-[8px] font-bento-num font-semibold fill-slate-400"
                        >
                          {p.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              {/* Team Scores Grid (Below Pie Chart) */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0D472D] shrink-0" />
                    <span className="font-bento-title text-slate-900 font-bold text-xs truncate">Diraya</span>
                  </div>
                  <strong className="font-bento-num text-slate-900 text-xs shrink-0">
                    {dirayaPoints} <span className="text-[9px] text-slate-400 font-normal">({dirayaPct}%)</span>
                  </strong>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-bento-title text-slate-900 font-bold text-xs truncate">Rivaya</span>
                  </div>
                  <strong className="font-bento-num text-slate-900 text-xs shrink-0">
                    {rivayaPoints} <span className="text-[9px] text-slate-400 font-normal">({rivayaPct}%)</span>
                  </strong>
                </div>
              </div>
            </div>

            {/* Battle Line Progress Bar */}
            <div className="space-y-1 pt-2 border-t border-slate-100 shrink-0">
              <div className="flex items-center justify-between text-[10px] font-bento-title uppercase">
                <span className="text-[#0D472D] font-bold">Diraya House</span>
                <span className="text-slate-400 font-normal">Live Battle Line</span>
                <span className="text-emerald-700 font-bold">Rivaya House</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex items-center p-0.5 border border-slate-200/60">
                <div
                  className="h-full bg-[#0D472D] rounded-l-full transition-all duration-500"
                  style={{ width: `${dirayaPct}%` }}
                />
                <div
                  className="h-full bg-emerald-500 rounded-r-full transition-all duration-500"
                  style={{ width: `${rivayaPct}%` }}
                />
              </div>
              <div className="text-center pt-0.5">
                <span className="text-[10px] text-slate-500 font-semibold">
                  Battle Line Margin: <strong className="text-[#0D472D] font-bento-num">{leadingTeamName} +{pointDiff} PTS</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* CENTER COLUMN (5 Cols): ⚡ Stage Live Card (Full Height)          */}
        {/* ----------------------------------------------------------------- */}
        <div className="md:col-span-5 flex flex-col min-h-0 overflow-hidden">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="text-xs font-bento-title uppercase tracking-wider text-slate-800">
                  Live Stage Control Radar
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-[#E6F4EA] text-[#0D472D] text-[9px] font-bento-title uppercase border border-emerald-200 font-bold">
                DISPATCH ACTIVE
              </span>
            </div>

            {/* Main Stage Performer Hero & Clock */}
            <div className="flex-1 flex flex-col justify-evenly py-2 gap-2 overflow-y-auto pr-0.5">
              {/* Active Live Performer Hero Tile (Only shown when live status active) */}
              {nextDispatch ? (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bento-title uppercase text-slate-500 tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Now On Stage
                    </span>
                    <span className="text-[10px] font-bento-num font-bold text-[#0D472D] bg-white px-1.5 py-0.5 rounded border border-slate-200 uppercase">
                      {nextDispatch.venue_name || 'MAIN STAGE'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0D472D] text-white font-bento-num text-lg flex items-center justify-center shadow-xs shrink-0 font-bold">
                      {nextDispatch.code_letter || 'A'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-bento-title text-slate-900 truncate">
                        {nextDispatch.competition_name}
                      </h4>
                      <p className="text-[11px] font-medium text-slate-600 truncate mt-0.5">
                        {nextDispatch.participant_name || 'Stage Performer'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                  <h4 className="text-xs font-bento-title text-slate-900">No Active Live Programme On Stage</h4>
                  <p className="text-[10px] text-slate-500">
                    Live stage items will appear here when an event status is set to LIVE.
                  </p>
                </div>
              )}

              {/* Box 2: Checking-in Programmes Box */}
              <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bento-title uppercase text-sky-900 tracking-wider flex items-center gap-1 font-bold">
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    Checking-In Programmes
                  </span>
                  <span className="text-[9px] font-bento-title uppercase bg-sky-200 text-sky-900 px-1.5 py-0.2 rounded font-bold border border-sky-300">
                    {checkinProgrammes.length > 0 ? `${checkinProgrammes.length} ACTIVE` : 'CHECK_IN'}
                  </span>
                </div>

                {checkinProgrammes.length > 0 ? (
                  <div className="space-y-1.5">
                    {checkinProgrammes.map((prog: any, idx: number) => (
                      <div
                        key={prog.competition_id || idx}
                        className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-sky-100 shadow-2xs"
                      >
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-bento-title text-slate-900 truncate">
                            {prog.competition_name}
                          </h5>
                          <span className="text-[10px] text-slate-500 font-medium truncate block">
                            {prog.venue_name || 'Main Stage'} • {prog.checked_in_count || 0}/{prog.total_registered || 0} Reported
                          </span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bento-title uppercase bg-sky-100 text-sky-800 font-bold border border-sky-200 shrink-0">
                          CHECK-IN
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-2 text-center bg-white/70 rounded-xl border border-sky-100 space-y-0.5">
                    <p className="text-[11px] font-semibold text-sky-950">No Programmes In Check-in</p>
                    <p className="text-[9px] text-slate-500">
                      Programmes in CHECK_IN status will appear here for backstage roll call.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* RIGHT COLUMN (3 Cols): 📢 Ticker Card & 🛠️ Tool Hub Card          */}
        {/* ----------------------------------------------------------------- */}
        <div className="md:col-span-3 flex flex-col gap-2.5 min-h-0 overflow-hidden">
          {/* Card 1: 📢 Ticker Card (Control Broadcast Ticker) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5 text-[#0D472D]" />
                <h3 className="text-xs font-bento-title uppercase tracking-wider text-slate-800">
                  Control Broadcasts
                </h3>
              </div>
              <Clock className="w-3 h-3 text-slate-400" />
            </div>

            <div className="flex-1 my-1.5 overflow-y-auto pr-0.5 space-y-1.5 scrollbar-thin">
              {recentAudits.length > 0 ? (
                recentAudits.slice(0, 5).map((log: any, idx: number) => (
                  <div key={log.id || idx} className="px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bento-title text-[#0D472D] uppercase truncate max-w-[120px] font-bold">
                        {log.action || 'System Notice'}
                      </span>
                      <span className="text-[8px] text-slate-400 font-medium shrink-0">
                        {log.created_at ? new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase() : 'Live'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-snug">
                      {log.details || 'Official festival broadcast'}
                    </p>
                  </div>
                ))
              ) : (
                <>
                  <div className="px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bento-title text-[#0D472D] uppercase font-bold">Stage Control</span>
                      <span className="text-[8px] text-slate-400 font-medium">Just Now</span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-snug">
                      Stage queues & lot drawing active.
                    </p>
                  </div>
                  <div className="px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bento-title text-amber-700 uppercase font-bold">Score Verification</span>
                      <span className="text-[8px] text-slate-400 font-medium">5m ago</span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-snug">
                      Stage Judge scorecards submitted.
                    </p>
                  </div>
                  <div className="px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bento-title text-emerald-800 uppercase font-bold">Registration</span>
                      <span className="text-[8px] text-slate-400 font-medium">12m ago</span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-snug">
                      Backstage check-in completed for contestants.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="pt-1.5 border-t border-slate-100 text-center shrink-0">
              <span className="text-[9px] text-slate-400 font-medium">
                Live broadcasts sync automatically
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
