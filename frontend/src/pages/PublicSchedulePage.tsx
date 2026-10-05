import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Calendar, MapPin, Search, Clock, Award, Layers, Sparkles, Filter } from 'lucide-react';
import { Badge } from '../components/ui/Badge.js';
import { ProgrammeStatusBadge } from '../components/ui/ProgrammeStatusBadge.js';

export const PublicSchedulePage: React.FC = () => {
  const [selectedVenue, setSelectedVenue] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // 1. Fetch schedules
  const { data: schedules = [], isLoading } = useQuery({
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
    <div className="space-y-8 py-3 max-w-6xl mx-auto">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-[2.25rem] p-8 sm:p-12 bg-white border border-slate-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.03)]">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-[450px] h-[450px] bg-gradient-to-br from-blue-100/60 via-indigo-50/40 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              OFFICIAL TIMETABLE
            </span>
            <span className="text-xs text-slate-400 font-medium">Synchronized Stage Schedules</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Festival Stage Schedule & Venues
          </h1>

          <p className="text-sm sm:text-base text-slate-500 font-normal">
            Browse live reporting slots, venue locations, and clash-prevented timetables across all 60 competitions.
          </p>
        </div>
      </div>

      {/* 2. Venue & Search Bar Controls (Model 1 & 2 Pill Bar) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Venue Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setSelectedVenue('ALL')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedVenue === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
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
                  ? 'bg-[#007AFF] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search event, prog no, or venue..."
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007AFF] shadow-xs transition-all"
          />
        </div>
      </div>

      {/* 3. Timetable Cards (Model 1 & 2 Inset Grouped Architecture) */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs text-center py-16 text-slate-400 text-sm font-medium">
            No scheduled events match your current filter criteria.
          </div>
        ) : (
          filtered.map((s: any) => (
            <div
              key={s.id}
              className="p-6 rounded-[2rem] bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    PROG {s.programme_number}
                  </span>
                  <ProgrammeStatusBadge schedule={s} />
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {s.group_name || 'General Category'}
                  </span>
                </div>

                <h3 className="font-display font-black text-xl text-slate-900">{s.competition_name}</h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#007AFF]" />
                    <span className="font-medium text-slate-700">{s.venue_name || 'Main Stage'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-500" />
                    <span>
                      {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                      {new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-left md:text-right">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Venue Stage
                  </span>
                  <span className="font-display font-extrabold text-slate-900 text-sm">
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
