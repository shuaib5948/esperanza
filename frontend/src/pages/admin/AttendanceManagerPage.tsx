import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import { CheckCircle2, XCircle, Clock, FileCheck2, Search, CheckCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';

interface AttendanceRecord {
  id: number;
  registration_id: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  checked_in_at: string | null;
  notes: string | null;
  participant_id: number;
  participant_code: string;
  participant_name: string;
  team_name: string;
}

export const AttendanceManagerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const [selectedCompId, setSelectedCompId] = useState<number>(1);
  const [filterText, setFilterText] = useState('');

  // 1. Fetch competitions
  const { data: competitions = [] } = useQuery({
    queryKey: ['competitions-list'],
    queryFn: async () => {
      const res = await api.get<any[]>('/competitions');
      return res.data;
    },
  });

  // 2. Fetch attendance for competition
  const { data: attendanceList = [], isLoading } = useQuery({
    queryKey: ['attendance', selectedCompId],
    queryFn: async () => {
      if (!selectedCompId) return [];
      const res = await api.get<AttendanceRecord[]>(`/attendance/competitions/${selectedCompId}`);
      return res.data;
    },
    enabled: !!selectedCompId,
  });

  // 3. Mark individual attendance
  const markMutation = useMutation({
    mutationFn: async ({ registrationId, status }: { registrationId: number; status: string }) => {
      return api.patch(`/attendance/${registrationId}`, { status });
    },
    onSuccess: () => {
      success('Attendance updated');
      queryClient.invalidateQueries({ queryKey: ['attendance', selectedCompId] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to update attendance');
    },
  });

  // 4. Mark all present
  const bulkPresentMutation = useMutation({
    mutationFn: async () => {
      const updates = attendanceList.map((a) => ({
        registration_id: a.registration_id,
        status: 'PRESENT',
      }));
      return api.post('/attendance/bulk', { attendance: updates });
    },
    onSuccess: () => {
      success('All participants marked present');
      queryClient.invalidateQueries({ queryKey: ['attendance', selectedCompId] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to mark bulk attendance');
    },
  });

  const filtered = attendanceList.filter((a) => {
    return (
      a.participant_name.toLowerCase().includes(filterText.toLowerCase()) ||
      a.participant_code.toLowerCase().includes(filterText.toLowerCase()) ||
      a.team_name.toLowerCase().includes(filterText.toLowerCase())
    );
  });

  const presentCount = attendanceList.filter((a) => a.status === 'PRESENT').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Attendance Roll Call</h1>
          <p className="text-sm text-slate-400 mt-1">
            Participant verification, check-in timestamps, and presence audit.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedCompId}
            onChange={(e) => setSelectedCompId(parseInt(e.target.value, 10))}
            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.programme_number} - {c.name} ({c.group_name})
              </option>
            ))}
          </select>

          <Button
            variant="secondary"
            size="md"
            isLoading={bulkPresentMutation.isPending}
            onClick={() => bulkPresentMutation.mutate()}
          >
            <CheckCheck className="w-4 h-4 mr-1.5" />
            <span>Mark All Present</span>
          </Button>
        </div>
      </div>

      {/* Roster & Stats */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-white">
              Roll Summary: {presentCount} / {attendanceList.length} Present
            </span>
            <Badge variant={presentCount === attendanceList.length && attendanceList.length > 0 ? 'success' : 'neutral'} size="sm">
              {attendanceList.length > 0 ? `${Math.round((presentCount / attendanceList.length) * 100)}%` : '0%'}
            </Badge>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search roster..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {attendanceList.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No approved registrations found for this competition.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-bold uppercase text-slate-400">
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Quick Mark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((record) => (
                  <tr key={record.registration_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-white block">{record.participant_name}</span>
                      <span className="text-xs text-slate-400 font-mono">{record.participant_code}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-200">{record.team_name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          record.status === 'PRESENT'
                            ? 'success'
                            : record.status === 'LATE'
                            ? 'warning'
                            : record.status === 'EXCUSED'
                            ? 'info'
                            : 'danger'
                        }
                        size="sm"
                      >
                        {record.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() =>
                          markMutation.mutate({
                            registrationId: record.registration_id,
                            status: 'PRESENT',
                          })
                        }
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          record.status === 'PRESENT'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-emerald-400'
                        }`}
                        title="Mark Present"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          markMutation.mutate({
                            registrationId: record.registration_id,
                            status: 'ABSENT',
                          })
                        }
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          record.status === 'ABSENT'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-rose-400'
                        }`}
                        title="Mark Absent"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
