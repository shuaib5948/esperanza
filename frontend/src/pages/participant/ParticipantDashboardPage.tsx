import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { User, Calendar, MapPin, Sparkles, Trophy, Award, UploadCloud } from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';

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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Mobile-First Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 glass-panel border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-xl"
              style={{ backgroundColor: participant?.team_color || '#4f46e5' }}
            >
              {participant?.participant_code?.substring(0, 3) || 'ESP'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-indigo-400">
                  {participant?.participant_code}
                </span>
                <Badge variant="primary" size="sm">
                  {participant?.category_name}
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mt-0.5">
                {participant?.user_name}
              </h1>
              <p className="text-xs text-slate-400 font-semibold">{participant?.team_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/participant/submissions">
              <Button variant="secondary" size="sm">
                <UploadCloud className="w-4 h-4 mr-1.5" />
                <span>Upload Work</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Events Timeline */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-400" />
          <span>My Registered Events ({registrations.length})</span>
        </h3>

        {registrations.length === 0 ? (
          <Card className="text-center py-12 text-slate-500 text-sm">
            You are not currently registered for any festival competitions.
          </Card>
        ) : (
          <div className="space-y-3">
            {registrations.map((reg: any) => {
              const isOnStage = reg.stage_status === 'ON_STAGE';
              const isCalled = reg.stage_status === 'CALLED';

              return (
                <Card
                  key={reg.registration_id}
                  className={`border transition-all ${
                    isOnStage
                      ? 'border-indigo-500 bg-indigo-950/30'
                      : isCalled
                      ? 'border-amber-500 bg-amber-950/20'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-400">
                          PROG {reg.programme_number}
                        </span>
                        <Badge variant="neutral" size="sm">
                          {reg.group_name}
                        </Badge>
                        <Badge
                          variant={reg.competition_type === 'STAGE' ? 'primary' : 'info'}
                          size="sm"
                        >
                          {reg.competition_type}
                        </Badge>
                      </div>
                      <h4 className="text-lg font-bold text-white">{reg.competition_name}</h4>
                      {reg.venue_name && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span>Venue: {reg.venue_name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                      {reg.position ? (
                        <Badge variant="warning" size="md">
                          <Trophy className="w-3.5 h-3.5 mr-1 text-amber-400" />
                          <span>Position {reg.position}</span>
                        </Badge>
                      ) : reg.stage_status ? (
                        <Badge
                          variant={
                            isOnStage
                              ? 'primary'
                              : isCalled
                              ? 'warning'
                              : reg.stage_status === 'COMPLETED'
                              ? 'success'
                              : 'neutral'
                          }
                          size="md"
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1" />
                          <span>Queue: {reg.stage_status}</span>
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="md">
                          {reg.registration_status}
                        </Badge>
                      )}

                      {reg.attendance_status && (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Attendance: {reg.attendance_status}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Issued Certificates */}
      {certificates.length > 0 && (
        <div className="space-y-4 pt-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span>My Issued Certificates ({certificates.length})</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {certificates.map((cert: any) => (
              <Card key={cert.id} className="border-emerald-500/30 bg-emerald-950/10 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="success" size="sm">
                    Verified Award
                  </Badge>
                  <span className="text-xs font-mono text-slate-400">{cert.verification_code}</span>
                </div>
                <h4 className="text-base font-bold text-white">{cert.competition_name}</h4>
                <p className="text-xs text-amber-300 font-bold">
                  {cert.position ? `Position ${cert.position} Place` : 'Certificate of Participation'}
                </p>
                <div className="pt-2 border-t border-slate-800">
                  <Link
                    to={`/verify?code=${cert.verification_code}`}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    View Authentic Credential →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
