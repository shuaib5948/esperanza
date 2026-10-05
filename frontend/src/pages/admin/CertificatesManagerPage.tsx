import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import { FileCheck2, Sparkles, ShieldX, Search, ShieldCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';

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
      success('Certificates generated successfully for published winners!');
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Certificates Engine</h1>
          <p className="text-sm text-slate-400 mt-1">
            Generate verifiable digital credentials for published competition winners.
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
            variant="primary"
            size="md"
            isLoading={generateMutation.isPending}
            onClick={() => generateMutation.mutate()}
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            <span>Generate for Event</span>
          </Button>
        </div>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code or name..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            {filtered.length} Issued Certificates
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-bold uppercase text-slate-400">
                <th className="py-3 px-4">Verification Code</th>
                <th className="py-3 px-4">Participant</th>
                <th className="py-3 px-4">Competition</th>
                <th className="py-3 px-4">Position</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((cert) => (
                <tr key={cert.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                    {cert.verification_code}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white">
                    {cert.participant_name}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {cert.programme_number} - {cert.competition_name}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-amber-300">
                    {cert.position ? `Position ${cert.position}` : 'Participant'}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={cert.status === 'ISSUED' ? 'success' : 'danger'} size="sm">
                      {cert.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {cert.status === 'ISSUED' && (
                      <Button
                        variant="danger"
                        size="sm"
                        isLoading={revokeMutation.isPending}
                        onClick={() => revokeMutation.mutate(cert.id)}
                      >
                        <ShieldX className="w-3.5 h-3.5 mr-1" />
                        <span>Revoke</span>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
