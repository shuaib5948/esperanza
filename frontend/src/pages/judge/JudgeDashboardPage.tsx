import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { Gavel, CheckCircle2, ChevronRight, Award, Clock, Radio } from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { THEME } from '../../theme/theme.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';

export const JudgeDashboardPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['judge-dashboard'],
    queryFn: async () => {
      const res = await api.get<any>('/dashboard/judge');
      return res.data;
    },
    refetchInterval: 3000,
  });

  const judge = data?.judge;
  const assignments = data?.assignments || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Gavel className="w-5 h-5" />
            </span>
            <h1 className="text-3xl font-black text-white">Judge Scoring Portal</h1>
          </div>
          <p className="text-sm text-amber-200/60 mt-1">
            Official Evaluation Panel • Code: <strong className="text-slate-200">{judge?.judge_code || 'JUDGE-01'}</strong>
          </p>
        </div>
      </div>

      {/* Assigned Competitions List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span>Competitions Evaluation Queue ({assignments.length})</span>
        </h3>

        {assignments.length === 0 ? (
          <Card className="text-center py-12 text-amber-200/60">
            No competitions currently scheduled or assigned.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map((comp: any) => {
              const isLive = comp.schedule_status === 'LIVE';
              const isPublished =
                Number(comp.published_results_count ?? 0) > 0 ||
                (comp.competition_status || '').toUpperCase() === 'PUBLISHED';
              const isSubmitted =
                !isPublished &&
                !isLive &&
                (comp.total_registered > 0 && comp.total_submitted >= comp.total_registered);

              return (
                <Card
                  key={comp.competition_id}
                  className={`transition-all space-y-4 ${
                    isLive
                      ? 'border-amber-500/60 bg-amber-950/20 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/30'
                      : 'hover:border-amber-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-amber-300">
                          PROGRAMME {comp.programme_number}
                        </span>
                        {isLive && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                            <Radio className="w-3 h-3 text-amber-400" />
                            LIVE ON STAGE
                          </span>
                        )}
                      </div>
                      <h4 className="text-xl font-bold text-white mt-0.5">
                        {comp.competition_name}
                      </h4>
                    </div>
                    <Badge
                      variant={isPublished ? 'success' : isSubmitted ? 'success' : isLive ? 'primary' : 'warning'}
                      size="sm"
                    >
                      {isPublished ? 'Published' : isSubmitted ? 'Submitted' : isLive ? 'Live Now' : 'In Queue'}
                    </Badge>
                  </div>

                  <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Evaluated: <strong className="text-white">{comp.total_submitted}</strong> /{' '}
                      {comp.total_registered} Performers
                    </span>

                    <Link to={`/judge/scoring?competitionId=${comp.competition_id}`}>
                      <Button
                        variant={isLive ? 'primary' : 'secondary'}
                        size="sm"
                        className={isLive ? `${THEME.classes.primaryBtn} text-xs font-bold` : 'text-xs font-bold'}
                      >
                        <span>{isLive ? 'Score Live Stage' : 'Open Scoresheet'}</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
