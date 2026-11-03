import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import {
  Sparkles,
  ShieldX,
  Search,
  Award,
  ShieldCheck,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { THEME } from '../../theme/theme.js';

export const CertificatesManagerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const [selectedCompId, setSelectedCompId] = useState<number>(1);
  const [search, setSearch] = useState('');

  // 1. Fetch competitions
  const { data: competitions = [] } = useQuery({
    queryKey: ['competitions-list'],
    queryFn: async () => {
      const res = await api.get<any[]>('/competitions');
      return res.data;
    },
  });

  // 2. Fetch certificates
  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ['admin-certificates'],
    queryFn: async () => {
      const res = await api.get<any[]>('/certificates');
      return res.data;
    },
  });

  // 3. Generate certificates mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      return api.post('/certificates/generate', { competition_id: selectedCompId });
    },
    onSuccess: () => {
      success('Certificates generated for published winners!');
      queryClient.invalidateQueries({ queryKey: ['admin-certificates'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to generate certificates');
    },
  });

  // 4. Revoke mutation
  const revokeMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.post(`/certificates/${id}/revoke`);
    },
    onSuccess: () => {
      success('Certificate revoked');
      queryClient.invalidateQueries({ queryKey: ['admin-certificates'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to revoke certificate');
    },
  });

  const filtered = certificates.filter(
    (c) =>
      c.participant_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.verification_code?.toLowerCase().includes(search.toLowerCase()) ||
      c.competition_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-xs">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bento-title font-bold text-white tracking-tight leading-none">
              Certificates
            </h1>
            <p className="text-xs text-amber-200/60 font-medium mt-1">
              Winner credentials & verification
            </p>
          </div>
        </div>

        {/* Generate Selector Action */}
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

          <button
            disabled={generateMutation.isPending}
            onClick={() => generateMutation.mutate()}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full ${THEME.classes.primaryBtn} text-xs font-black transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50 shrink-0 shadow-2xs`}
          >
            {generateMutation.isPending ? (
              <span className="w-3 h-3 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
            <span>Generate</span>
          </button>
        </div>
      </div>

      {/* 2. Main Certificates Table Container */}
      <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl shadow-xl shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3 border-b border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#121212]">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-amber-200/60" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code or contestant..."
              className="w-full pl-7 pr-3 py-1 bg-[#0A0A0A] border border-white/[0.08] rounded-xl text-xs text-amber-100 placeholder-slate-400 focus:outline-hidden focus:border-amber-400 font-medium"
            />
          </div>

          <span className="text-[11px] font-bold text-amber-200/60 shrink-0">
            {filtered.length} Issued
          </span>
        </div>

        {/* Mobile View: Certificate Cards (<md) */}
        <div className="md:hidden divide-y divide-white/[0.04]">
          {isLoading ? (
            <div className="py-8 text-center text-amber-200/60 text-xs">
              Loading credentials...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-amber-200/60 space-y-1">
              <Award className="w-6 h-6 text-slate-300 mx-auto mb-1" />
              <p className="text-xs font-semibold">No certificates issued yet</p>
            </div>
          ) : (
            filtered.map((cert) => (
              <div key={cert.id} className="p-3.5 space-y-2 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-amber-300 text-xs bg-amber-500/10 px-2 py-0.5 rounded-md border border-white/[0.08]">
                    {cert.verification_code}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      cert.status === 'ISSUED'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {cert.status}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-bold text-white text-sm">
                    {cert.participant_name}
                  </h3>
                  <span className="text-xs font-bold shrink-0">
                    {cert.position === 1 ? (
                      <span className="text-amber-400">🥇 1st Place</span>
                    ) : cert.position === 2 ? (
                      <span className="text-slate-300">🥈 2nd Place</span>
                    ) : cert.position === 3 ? (
                      <span className="text-amber-600">🥉 3rd Place</span>
                    ) : (
                      <span className="text-amber-200/60">Participant</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-amber-200/60 pt-0.5">
                  <span className="truncate max-w-[200px]">
                    {cert.programme_number} - {cert.competition_name}
                  </span>

                  {cert.status === 'ISSUED' && (
                    <button
                      onClick={() => revokeMutation.mutate(cert.id)}
                      className="text-rose-400 hover:text-rose-300 text-xs font-semibold px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 cursor-pointer"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Full Table (>=md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[560px]">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] font-bento-title uppercase tracking-wider text-amber-200/60 bg-[#121212]">
                <th className="py-2.5 px-4 font-bold">Verification Code</th>
                <th className="py-2.5 px-4 font-bold">Participant</th>
                <th className="py-2.5 px-4 font-bold">Programme</th>
                <th className="py-2.5 px-4 font-bold">Rank</th>
                <th className="py-2.5 px-4 font-bold">Status</th>
                <th className="py-2.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-amber-200/60">
                    Loading credentials...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-amber-200/60">
                    <Award className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                    <span className="text-xs font-semibold text-amber-200/60">No certificates issued yet</span>
                  </td>
                </tr>
              ) : (
                filtered.map((cert) => (
                  <tr key={cert.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-amber-300">
                      {cert.verification_code}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-white">
                      {cert.participant_name}
                    </td>
                    <td className="py-2.5 px-4 text-amber-200/60">
                      {cert.programme_number} - {cert.competition_name}
                    </td>
                    <td className="py-2.5 px-4 font-bold">
                      {cert.position === 1 ? (
                        <span className="text-amber-600">🥇 1st Place</span>
                      ) : cert.position === 2 ? (
                        <span className="text-amber-200/60">🥈 2nd Place</span>
                      ) : cert.position === 3 ? (
                        <span className="text-amber-300">🥉 3rd Place</span>
                      ) : (
                        <span className="text-amber-200/60">Participant</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          cert.status === 'ISSUED'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {cert.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {cert.status === 'ISSUED' && (
                        <button
                          disabled={revokeMutation.isPending}
                          onClick={() => {
                            if (window.confirm('Revoke this certificate?')) {
                              revokeMutation.mutate(cert.id);
                            }
                          }}
                          className="px-2 py-1 rounded-lg text-rose-300 hover:bg-rose-500/15 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
