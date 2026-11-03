import React, { useState } from 'react';
import { api } from '../api/client.js';
import { ShieldCheck, XCircle, Search, Award, CheckCircle2, Trophy } from 'lucide-react';
import { THEME } from '../theme/theme.js';

interface CertificateResult {
  certificate_number: string;
  verification_code: string;
  status: 'ISSUED' | 'REVOKED';
  issued_at: string;
  position: number | null;
  participant: {
    name: string;
    code: string;
    team: string;
  };
  competition: {
    programme_number: number;
    name: string;
    group: string;
  };
  festival: string;
  is_valid: boolean;
}

export const CertificateVerifyPage: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CertificateResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    try {
      setLoading(true);
      setErrorMsg(null);
      setResult(null);
      const res = await api.get<CertificateResult>(`/certificates/verify/${encodeURIComponent(code.trim())}`);
      setResult(res.data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Certificate verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-8 font-bento text-slate-100">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex p-3.5 rounded-3xl bg-amber-500/15 border border-white/[0.08] text-amber-400 shadow-lg shadow-amber-950/30">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-black text-white tracking-tight">
          Certificate Verification
        </h1>
        <p className="text-sm sm:text-base text-amber-100/70 max-w-xl mx-auto font-normal">
          Instant cryptographic validation for official achievement and participation credentials issued for Esperanza 2026–27.
        </p>
      </div>

      {/* Code Search Card */}
      <div className="bg-[#0A0A0A] rounded-[2rem] border border-white/[0.08] shadow-xl p-6 sm:p-8">
        <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-4 w-4 h-4 text-amber-400/60" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter Verification Code (e.g. V-E839FA1...)"
              className="w-full pl-11 pr-4 py-3.5 bg-[#121212] border border-white/[0.08] rounded-full text-xs sm:text-sm text-white placeholder-amber-200/40 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 shadow-inner transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className={`px-8 py-3.5 ${THEME.classes.primaryBtn} text-slate-950 font-bold text-xs sm:text-sm rounded-full shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]`}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
            ) : (
              'Verify Authenticity'
            )}
          </button>
        </form>
      </div>

      {/* Verification Error */}
      {errorMsg && (
        <div className="p-6 rounded-3xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-3.5 text-rose-300">
          <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <h4 className="font-extrabold text-sm text-white">Credential Verification Failed</h4>
            <p className="text-xs text-rose-300/80 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Verification Success (Luxury Credential Pass Style) */}
      {result && (
        <div className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-[#121212] via-[#0a0a0a] to-[#040404] border border-white/[0.08] shadow-2xl p-8 sm:p-10 space-y-6">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Validated Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  Official Record Verified
                </span>
                <h3 className="font-display font-black text-2xl text-white">
                  Valid Certificate
                </h3>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs font-bold text-amber-200/60 block uppercase tracking-wider">Cert ID</span>
              <span className="font-mono font-bold text-amber-200 text-sm">{result.certificate_number}</span>
            </div>
          </div>

          {/* Participant & Award Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
            <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] space-y-1">
              <span className="text-xs font-bold uppercase text-amber-200/60">Awarded To</span>
              <h4 className="font-display font-extrabold text-lg text-white">{result.participant.name}</h4>
              <p className="text-xs text-amber-200/60 font-medium">
                Participant Code: <span className="font-mono font-bold text-white">{result.participant.code}</span>
              </p>
              <p className="text-xs text-amber-400 font-bold">House: {result.participant.team}</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] space-y-1">
              <span className="text-xs font-bold uppercase text-amber-200/60">Competition Programme</span>
              <h4 className="font-display font-extrabold text-lg text-white">{result.competition.name}</h4>
              <p className="text-xs text-amber-200/60 font-medium">
                Prog {result.competition.programme_number} • Category: {result.competition.group}
              </p>
              <div className="pt-1">
                {result.position ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-white/[0.08]">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    Rank {result.position} Winner
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    <Award className="w-3.5 h-3.5 text-sky-400" />
                    Certificate of Participation
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between text-xs text-amber-200/60 relative z-10">
            <span>Issued under authority of Esperanza 2026–27 Council</span>
            <span className="font-mono">Date: {new Date(result.issued_at).toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
