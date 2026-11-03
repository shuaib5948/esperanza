import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Calendar, MapPin, Search, Clock } from 'lucide-react';
import { ProgrammeStatusBadge } from '../components/ui/ProgrammeStatusBadge.js';

export const PublicSchedulePage: React.FC = () => {
  const [selectedVenue, setSelectedVenue] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // 1. Fetch schedules
  const { data: schedules = [], isLoading: _isLoading } = useQuery({
    queryKey: ['public-schedules-full'],
    queryFn: async () => {
      const res = await api.get<any[]>('/schedules');
      return res.data;
    },
  });

  // 2. Fetch venues
  const { data: venues = [] } = useQuery({
    queryKey: ['venues-list'],
    queryFn: async () => {
      const res = await api.get<any[]>('/venues');
      return res.data;
    },
  });

  const filtered = schedules.filter((s) => {
    const matchesVenue = selectedVenue === 'ALL' || String(s.venue_id) === selectedVenue;
    const matchesSearch =
      search === '' ||
      s.competition_name.toLowerCase().includes(search.toLowerCase()) ||
      String(s.programme_number).includes(search) ||
      s.venue_name.toLowerCase().includes(search.toLowerCase());
    return matchesVenue && matchesSearch;
  });

  return (
    <div className="space-y-8 py-3 max-w-6xl mx-auto font-bento text-slate-100">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-[2.25rem] p-8 sm:p-12 bg-gradient-to-br from-[#121212] via-[#0a0a0a] to-[#040404] border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.8)]">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-[450px] h-[450px] bg-gradient-to-br from-amber-500/15 via-yellow-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-white/[0.08] shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              OFFICIAL TIMETABLE
            </span>
            <span className="text-xs text-amber-200/60 font-medium">Synchronized Stage Schedules</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-black text-white tracking-tight">
            Festival Stage Schedule & Venues
          </h1>

          <p className="text-sm sm:text-base text-amber-100/70 font-normal">
            Browse live reporting slots, venue locations, and clash-prevented timetables across all 60 competitions.
          </p>
        </div>
      </div>

      {/* 2. Venue & Search Bar Controls (Model 1 & 2 Pill Bar) */}
      <div className="bg-[#0A0A0A] rounded-3xl border border-white/[0.08] shadow-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Venue Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setSelectedVenue('ALL')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedVenue === 'ALL'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-[#121212] text-amber-200/60 hover:text-white hover:bg-[#121212] border border-white/[0.08]'
            }`}
          >
            All Venues ({schedules.length})
          </button>
          {venues.map((v: any) => (
            <button
              key={v.id}
              onClick={() => setSelectedVenue(String(v.id))}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                selectedVenue === String(v.id)
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-[#121212] text-amber-200/60 hover:text-white hover:bg-[#121212] border border-white/[0.08]'
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-amber-400/60" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search event, prog no, or venue..."
            className="w-full pl-11 pr-4 py-2.5 bg-[#121212] border border-white/[0.08] rounded-full text-xs text-white placeholder-amber-200/40 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 shadow-inner transition-all"
          />
        </div>
      </div>

      {/* 3. Timetable Cards (Model 1 & 2 Inset Grouped Architecture) */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-[#0A0A0A] rounded-3xl border border-white/[0.08] shadow-xl text-center py-16 text-amber-200/60 text-sm font-medium">
            No scheduled events match your current filter criteria.
          </div>
        ) : (
          filtered.map((s: any) => (
            <div
              key={s.id}
              className="p-6 rounded-[2rem] bg-gradient-to-br from-[#121212] via-[#0a0a0a] to-[#040404] border border-white/[0.08] shadow-xl hover:border-amber-500/40 hover:shadow-2xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/15 px-3 py-1 rounded-full border border-white/[0.08]">
                    PROG {s.programme_number}
                  </span>
                  <ProgrammeStatusBadge schedule={s} />
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#121212] text-amber-200/60 border border-white/[0.08]">
                    {s.group_name || 'General Category'}
                  </span>
                </div>

                <h3 className="font-display font-black text-xl text-white">{s.competition_name}</h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-amber-200/60 pt-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-medium text-amber-100">{s.venue_name || 'Main Stage'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                      {new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-left md:text-right">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-200/60 block">
                    Venue Stage
                  </span>
                  <span className="font-display font-extrabold text-amber-200 text-sm">
                    {s.venue_name}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
