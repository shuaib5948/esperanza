import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  CheckCheck,
  Users,
} from 'lucide-react';
import { THEME } from '../../theme/theme.js';

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
      success('All marked present');
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
    <div className="space-y-4">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-xs">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bento-title font-bold text-white tracking-tight leading-none">
              Stage Attendance
            </h1>
            <p className="text-xs text-amber-200/60 font-medium mt-1">
              Participant check-in & verification
            </p>
          </div>
        </div>

        {/* Programme Selector & Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <select
            value={selectedCompId}
            onChange={(e) => setSelectedCompId(parseInt(e.target.value, 10))}
            className="w-full sm:w-auto bg-[#0A0A0A] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs font-semibold text-amber-100 focus:outline-hidden focus:border-amber-400 cursor-pointer"
          >
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.programme_number} - {c.name}
              </option>
            ))}
          </select>

          {attendanceList.length > 0 && (
            <button
              disabled={bulkPresentMutation.isPending}
              onClick={() => bulkPresentMutation.mutate()}
              className="px-3 py-1.5 rounded-full bg-[#121212] hover:bg-white/10 text-amber-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Present</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Attendance Table Container */}
      <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl shadow-xl shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3 border-b border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#121212]">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-amber-200/60" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter by name or code..."
              className="w-full pl-7 pr-3 py-1 bg-[#0A0A0A] border border-white/[0.08] rounded-xl text-xs text-amber-100 placeholder-slate-400 focus:outline-hidden focus:border-amber-400 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold text-amber-200/60 shrink-0">
            <span>
              Checked In: <strong className="text-emerald-300">{presentCount}</strong> / {attendanceList.length}
            </span>
          </div>
        </div>

        {/* Mobile View: Attendance Cards (<md) */}
        <div className="md:hidden divide-y divide-white/[0.04]">
          {isLoading ? (
            <div className="py-8 text-center text-amber-200/60 text-xs">
              Loading attendance list...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-amber-200/60 space-y-1">
              <Users className="w-6 h-6 text-slate-300 mx-auto mb-1" />
              <p className="text-xs font-semibold">No contestants registered</p>
            </div>
          ) : (
            filtered.map((record) => {
              const isPresent = record.status === 'PRESENT';
              const isDiraya = record.team_name?.toUpperCase().includes('DIRAYA');

              return (
                <div key={record.id} className="p-3.5 space-y-2 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-amber-400 text-xs bg-amber-500/10 px-2 py-0.5 rounded-md border border-white/[0.08]">
                      Chest {record.participant_code}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isPresent
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-[#121212] text-amber-200/60 border border-white/[0.08]'
                      }`}
                    >
                      {record.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-sm">
                    {record.participant_name}
                  </h3>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isDiraya
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {record.team_name}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => markMutation.mutate({ registrationId: record.registration_id, status: 'PRESENT' })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isPresent
                            ? 'bg-emerald-500 text-slate-950 shadow-xs'
                            : 'bg-[#121212] text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15'
                        }`}
                      >
                        Present
                      </button>
                      <button
                        onClick={() => markMutation.mutate({ registrationId: record.registration_id, status: 'ABSENT' })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          !isPresent && record.status === 'ABSENT'
                            ? 'bg-rose-500 text-white shadow-xs'
                            : 'bg-[#121212] text-rose-400 border border-rose-500/30 hover:bg-rose-500/15'
                        }`}
                      >
                        Absent
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Table (>=md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[560px]">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] font-bento-title uppercase tracking-wider text-amber-200/60 bg-[#121212]">
                <th className="py-2.5 px-4 font-bold">Chest No</th>
                <th className="py-2.5 px-4 font-bold">Participant</th>
                <th className="py-2.5 px-4 font-bold">House Team</th>
                <th className="py-2.5 px-4 font-bold">Status</th>
                <th className="py-2.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-amber-200/60">
                    Loading attendance list...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-amber-200/60">
                    <Users className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                    <span className="text-xs font-semibold text-amber-200/60">No contestants registered</span>
                  </td>
                </tr>
              ) : (
                filtered.map((record) => {
                  const isPresent = record.status === 'PRESENT';
                  const isDiraya = record.team_name?.toUpperCase().includes('DIRAYA');

                  return (
                    <tr key={record.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-white">
                        {record.participant_code}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white">
                        {record.participant_name}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDiraya
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {record.team_name}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isPresent
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-[#121212] text-amber-200/60 border border-white/[0.08]'
                          }`}
                        >
                          {isPresent && <CheckCircle2 className="w-3 h-3 text-emerald-300" />}
                          <span>{record.status}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() =>
                              markMutation.mutate({
                                registrationId: record.registration_id,
                                status: 'PRESENT',
                              })
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              isPresent
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#121212] text-amber-200 hover:bg-emerald-500/15 hover:text-emerald-300'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() =>
                              markMutation.mutate({
                                registrationId: record.registration_id,
                                status: 'ABSENT',
                              })
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              record.status === 'ABSENT'
                                ? 'bg-rose-600 text-white'
                                : 'bg-[#121212] text-amber-200 hover:bg-rose-500/15 hover:text-rose-300'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
