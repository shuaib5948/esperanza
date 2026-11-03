import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react';
import { THEME } from '../../theme/theme.js';

export const OffStageSubmissionPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const [competitionId, setCompetitionId] = useState<number>(1);
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [notes, setNotes] = useState('');

  // 1. Fetch participant registrations
  const { data: dashboardData } = useQuery({
    queryKey: ['participant-dashboard'],
    queryFn: async () => {
      const res = await api.get<any>('/dashboard/participant');
      return res.data;
    },
  });

  const participant = dashboardData?.participant;
  const registrations = dashboardData?.registrations || [];

  const offStageEvents = registrations.filter(
    (r: any) => r.competition_type === 'OFF_STAGE' || r.competition_type === 'GENERAL'
  );

  // 2. Submission mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!participant) return;
      return api.post(`/submissions/${competitionId}`, {
        participant_id: participant.id,
        file_url: fileUrl,
        file_name: fileName,
        file_type: 'PDF',
      });
    },
    onSuccess: () => {
      success('Off-stage work submitted for evaluation!');
      setFileUrl('');
      setFileName('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['participant-dashboard'] });
    },
    onError: (err: any) => {
      error(err.message || 'Submission failed');
    },
  });

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* 1. Header Bar */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-xs">
          <UploadCloud className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bento-title font-bold text-white tracking-tight leading-none">
            Off-Stage Submission
          </h1>
          <p className="text-xs text-amber-200/60 font-medium mt-1">
            Submit written or visual works for jury evaluation
          </p>
        </div>
      </div>

      {/* 2. Bento Submission Card */}
      <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl shadow-xl p-5 shadow-xs space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitMutation.mutate();
          }}
          className="space-y-3.5"
        >
          <div>
            <label className="block text-xs font-bold text-amber-200 mb-1">
              Select Off-Stage Programme
            </label>
            <select
              value={competitionId}
              onChange={(e) => setCompetitionId(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-2 bg-[#121212] border border-white/[0.08] rounded-xl text-xs font-medium text-amber-100 focus:outline-hidden focus:border-amber-400 cursor-pointer"
            >
              {offStageEvents.length === 0 ? (
                <option value="1">No off-stage programmes enrolled</option>
              ) : (
                offStageEvents.map((r: any) => (
                  <option key={r.competition_id} value={r.competition_id}>
                    {r.programme_number} - {r.competition_name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-amber-200 mb-1">
              File or Work Title
            </label>
            <input
              type="text"
              required
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g. Essay_Topic_Diraya_P12.pdf"
              className="w-full px-3.5 py-2 bg-[#121212] border border-white/[0.08] rounded-xl text-xs font-medium text-amber-100 placeholder-slate-400 focus:outline-hidden focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-amber-200 mb-1">
              Document or Asset Link
            </label>
            <input
              type="url"
              required
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://drive.google.com/... or cloud link"
              className="w-full px-3.5 py-2 bg-[#121212] border border-white/[0.08] rounded-xl text-xs font-medium text-amber-100 placeholder-slate-400 focus:outline-hidden focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-amber-200 mb-1">
              Additional Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specifics for the judges..."
              className="w-full px-3.5 py-2 bg-[#121212] border border-white/[0.08] rounded-xl text-xs font-medium text-amber-100 placeholder-slate-400 focus:outline-hidden focus:border-amber-400"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitMutation.isPending || offStageEvents.length === 0}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full ${THEME.classes.primaryBtn} text-xs font-black transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50`}
            >
              {submitMutation.isPending && (
                <span className="w-3 h-3 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
              )}
              <UploadCloud className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Submit Work</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
