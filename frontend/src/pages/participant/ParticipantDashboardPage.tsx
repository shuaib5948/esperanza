import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import {
  Calendar,
  Sparkles,
  Trophy,
  Award,
  UploadCloud,
  CheckCircle2,
  Clock,
  Radio,
} from 'lucide-react';
import { THEME } from '../../theme/theme.js';

export const ParticipantDashboardPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['participant-dashboard'],
    queryFn: async () => {
      const res = await api.get<any>('/dashboard/participant');
      return res.data;
    },
    refetchInterval: 10000,
  });

  const participant = data?.participant;
  const registrations = data?.registrations || [];
  const certificates = data?.certificates || [];

  const isDiraya = (participant?.team_name || '').toUpperCase().includes('DIRAYA');

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* 1. Contestant Hero Profile Card */}
      <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl shadow-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black text-white shadow-xs ${
              isDiraya ? 'bg-[#0D472D]' : 'bg-[#881337]'
            }`}
          >
            {participant?.participant_code?.substring(0, 3) || 'ESP'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-300">
                {participant?.participant_code}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#121212] text-amber-200">
                {participant?.category_name}
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bento-title font-bold text-white mt-0.5">
              {participant?.user_name}
            </h1>
            <span
              className={`inline-block text-[11px] font-bold ${
                isDiraya ? 'text-emerald-300' : 'text-[#881337]'
              }`}
            >
              {participant?.team_name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link to="/participant/submissions">
            <button className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full ${THEME.classes.primaryBtn} text-xs font-black transition-all hover:scale-[1.02] cursor-pointer shadow-2xs`}>
              <UploadCloud className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Submit Work</span>
            </button>
          </Link>
        </div>
      </div>

      {/* 2. Registered Events Bento List */}
      <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl shadow-xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-700" />
            <h3 className="text-xs font-bento-title uppercase tracking-wider text-amber-100 font-bold">
              My Registered Programmes ({registrations.length})
            </h3>
          </div>
        </div>

        {registrations.length === 0 ? (
          <div className="p-8 text-center text-xs text-amber-200/60">
            You are not enrolled in any competitions yet.
          </div>
        ) : (
          <div className="space-y-2">
            {registrations.map((reg: any) => {
              const isOnStage = reg.stage_status === 'ON_STAGE';
              const isCalled = reg.stage_status === 'CALLED';

              return (
                <div
                  key={reg.id || reg.competition_id}
                  className="p-3 rounded-xl border border-amber-500/15 bg-[#121212] hover:bg-[#121212] flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-amber-300">
                        {reg.programme_number}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#121212] text-amber-200">
                        {reg.competition_type || 'STAGE'}
                      </span>
                      {isOnStage && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 animate-pulse">
                          <Radio className="w-2.5 h-2.5" />
                          <span>NOW ON STAGE</span>
                        </span>
                      )}
                      {isCalled && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-300 border border-white/[0.08] animate-pulse">
                          <span>STAGE CALL</span>
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bento-title font-bold text-white">
                      {reg.competition_name}
                    </h4>
                  </div>

                  <div className="text-right text-[11px] text-amber-200/60 font-medium">
                    {reg.stage_name ? (
                      <span className="font-bold text-amber-200 block">{reg.stage_name}</span>
                    ) : (
                      <span>Time TBD</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
