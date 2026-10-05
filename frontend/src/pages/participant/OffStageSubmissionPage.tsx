import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import { UploadCloud, CheckCircle2, FileText, Link as LinkIcon } from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';

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

  // Filter to off-stage or general events
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
      success('Off-stage work submitted successfully for evaluation!');
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
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-white">Off-Stage Event Submission</h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload file artifacts for Story writing, Essay writing, Calligraphy, Painting, etc.
        </p>
      </div>

      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Select Competition
            </label>
            <select
              value={competitionId}
              onChange={(e) => setCompetitionId(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {offStageEvents.length > 0 ? (
                offStageEvents.map((r: any) => (
                  <option key={r.competition_id} value={r.competition_id}>
                    {r.programme_number} - {r.competition_name} ({r.competition_type})
                  </option>
                ))
              ) : (
                <option value="1">1 - Story writing (General / Off-Stage)</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              File Title / Name
            </label>
            <input
              type="text"
              required
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g. Story_Writing_Submission.pdf"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              File / Cloud Storage URL
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="url"
                required
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://drive.google.com/... or https://storage.esperanza.edu/..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Participant Remarks (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any details for the evaluators..."
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={submitMutation.isPending}
            >
              <UploadCloud className="w-4 h-4 mr-1.5" />
              <span>Submit for Judging</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
