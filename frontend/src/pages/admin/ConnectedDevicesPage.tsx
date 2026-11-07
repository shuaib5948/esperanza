import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import { THEME } from '../../theme/theme.js';
import { getDeviceId } from '../../hooks/useDeviceHeartbeat.js';
import {
  Smartphone,
  Laptop,
  Monitor,
  Tablet,
  LogOut,
  RefreshCw,
  Shield,
  Gavel,
  Tv,
  Globe,
  Radio,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
} from 'lucide-react';

interface ConnectedDevice {
  id: number;
  device_id: string;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  user_role: string | null;
  device_name: string;
  browser: string | null;
  portal: string;
  current_path: string | null;
  ip_address: string | null;
  status: 'ACTIVE' | 'TERMINATED';
  connection_state: 'ONLINE' | 'IDLE' | 'DISCONNECTED';
  seconds_ago: number;
  last_active_at: string;
  created_at: string;
}

export const ConnectedDevicesPage: React.FC = () => {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const currentDeviceId = getDeviceId();
  const [filterPortal, setFilterPortal] = useState<string>('ALL');

  // Fetch connected devices with 10s auto-refresh
  const { data: devices = [], isLoading, isFetching, refetch } = useQuery<ConnectedDevice[]>({
    queryKey: ['admin-connected-devices'],
    queryFn: async () => {
      const res = await api.get<ConnectedDevice[]>('/devices');
      return res.data;
    },
    refetchInterval: 10000,
  });

  // Disconnect single device mutation
  const disconnectMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      return api.post(`/devices/${deviceId}/disconnect`);
    },
    onSuccess: () => {
      success('Device session disconnected and logged out successfully.');
      queryClient.invalidateQueries({ queryKey: ['admin-connected-devices'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to disconnect device');
    },
  });

  // Disconnect all other devices mutation
  const disconnectAllMutation = useMutation({
    mutationFn: async () => {
      return api.post('/devices/disconnect-all', {
        current_device_id: currentDeviceId,
      });
    },
    onSuccess: (res: any) => {
      success(res?.data?.message || 'All other devices have been disconnected.');
      queryClient.invalidateQueries({ queryKey: ['admin-connected-devices'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to disconnect all devices');
    },
  });

  // Metrics
  const onlineDevices = devices.filter((d) => d.connection_state === 'ONLINE');
  const judgeTablets = devices.filter((d) => d.portal.toLowerCase().includes('judge') && d.connection_state === 'ONLINE');
  const stageScreens = devices.filter((d) => d.portal.toLowerCase().includes('screen') && d.connection_state === 'ONLINE');
  const adminDevices = devices.filter((d) => d.portal.toLowerCase().includes('admin') && d.connection_state === 'ONLINE');

  const filteredDevices = devices.filter((d) => {
    if (filterPortal === 'ALL') return true;
    return d.portal.toLowerCase().includes(filterPortal.toLowerCase());
  });

  const getDeviceIcon = (deviceName: string) => {
    const name = (deviceName || '').toLowerCase();
    if (name.includes('ipad') || name.includes('tablet')) {
      return <Tablet className="w-5 h-5 text-amber-400" />;
    }
    if (name.includes('iphone') || name.includes('phone') || name.includes('mobile')) {
      return <Smartphone className="w-5 h-5 text-purple-400" />;
    }
    if (name.includes('screen') || name.includes('tv') || name.includes('display')) {
      return <Tv className="w-5 h-5 text-sky-400" />;
    }
    if (name.includes('pc') || name.includes('windows') || name.includes('mac') || name.includes('laptop')) {
      return <Laptop className="w-5 h-5 text-emerald-400" />;
    }
    return <Monitor className="w-5 h-5 text-slate-300" />;
  };

  const getPortalBadge = (portal: string) => {
    const p = (portal || '').toLowerCase();
    if (p.includes('judge')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
          <Gavel className="w-3.5 h-3.5" />
          <span>Judge Portal</span>
        </span>
      );
    }
    if (p.includes('admin')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <Shield className="w-3.5 h-3.5" />
          <span>Admin Portal</span>
        </span>
      );
    }
    if (p.includes('screen') || p.includes('live')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
          <Tv className="w-3.5 h-3.5" />
          <span>Stage Screen</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#121212] text-amber-200 border border-white/[0.08]">
        <Globe className="w-3.5 h-3.5 text-amber-200/60" />
        <span>{portal}</span>
      </span>
    );
  };

  const formatLastSeen = (seconds: number) => {
    if (seconds <= 20) return 'Active just now';
    if (seconds < 60) return `Active ${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `Active ${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-xs shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bento-title font-bold text-white tracking-tight leading-none">
              Connected Devices
            </h1>
            <p className="text-xs text-amber-200/60 font-medium mt-1">
              Live monitoring of connected tablets, laptops, and portals with 1-click remote logout
            </p>
          </div>
        </div>

        {/* Master Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#0A0A0A] hover:bg-[#121212] text-amber-100 text-xs font-semibold border border-white/[0.08] hover:border-amber-400 transition-all cursor-pointer"
            title="Refresh device statuses"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-amber-400' : 'text-amber-200/60'}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to log out all other devices? This will instantly disconnect all judge tablets and operators except your current device.')) {
                disconnectAllMutation.mutate();
              }
            }}
            disabled={disconnectAllMutation.isPending || devices.length <= 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold border border-rose-500/30 transition-all cursor-pointer disabled:opacity-40"
            title="Disconnect all other connected tablets and computers"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{disconnectAllMutation.isPending ? 'Disconnecting...' : 'Disconnect All Other Devices'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-200/60 font-bold uppercase tracking-wider">Online Now</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-bento-num text-white">{onlineDevices.length}</span>
            <span className="text-xs text-amber-200/60 font-medium">systems</span>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-purple-300/80 font-bold uppercase tracking-wider">Judge Tablets</span>
            <Gavel className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-bento-num text-white">{judgeTablets.length}</span>
            <span className="text-xs text-purple-300/60 font-medium">scoring live</span>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-sky-300/80 font-bold uppercase tracking-wider">Stage Screens</span>
            <Tv className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-bento-num text-white">{stageScreens.length}</span>
            <span className="text-xs text-sky-300/60 font-medium">displays active</span>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-300/80 font-bold uppercase tracking-wider">Admin & Control</span>
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-bento-num text-white">{adminDevices.length}</span>
            <span className="text-xs text-amber-300/60 font-medium">control desks</span>
          </div>
        </div>
      </div>

      {/* Portal Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {['ALL', 'Judge', 'Admin', 'Screen', 'Public'].map((p) => (
          <button
            key={p}
            onClick={() => setFilterPortal(p)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filterPortal === p
                ? `${THEME.classes.primaryBtn} shadow-xs`
                : 'bg-[#0A0A0A] text-amber-200/60 hover:text-white border border-white/[0.08]'
            }`}
          >
            {p === 'ALL' ? 'All Portals' : `${p} Portals`}
          </button>
        ))}
      </div>

      {/* Main Devices Table / Cards */}
      <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-16 text-center text-amber-200/60 text-xs font-medium">
            Loading active device connections...
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Radio className="w-8 h-8 text-amber-200/40 mx-auto" />
            <p className="text-sm font-bold text-white">No Connected Devices Found</p>
            <p className="text-xs text-amber-200/60 max-w-sm mx-auto">
              Devices will appear here as judges, controllers, and screens open their portals.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filteredDevices.map((dev) => {
              const isCurrent = dev.device_id === currentDeviceId;
              const isTerminated = dev.status === 'TERMINATED';
              const isOnline = dev.connection_state === 'ONLINE';
              const isIdle = dev.connection_state === 'IDLE';

              return (
                <div
                  key={dev.id}
                  className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                    isTerminated ? 'opacity-50 bg-rose-950/10' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Left: Device & Portal Info */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#121212] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                      {getDeviceIcon(dev.device_name)}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white truncate">
                          {dev.device_name}
                        </h3>

                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                            THIS DEVICE
                          </span>
                        )}

                        {/* Status Dot */}
                        {isTerminated ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            Disconnected
                          </span>
                        ) : isOnline ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
                            Online
                          </span>
                        ) : isIdle ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            Idle
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-slate-500" />
                            Offline
                          </span>
                        )}
                      </div>

                      {/* Portal & Path */}
                      <div className="flex items-center gap-2 flex-wrap pt-0.5">
                        {getPortalBadge(dev.portal)}
                        {dev.current_path && (
                          <span className="font-mono text-xs text-amber-200/60 truncate max-w-[220px]">
                            {dev.current_path}
                          </span>
                        )}
                        {dev.browser && (
                          <span className="text-xs text-amber-200/50">
                            • {dev.browser}
                          </span>
                        )}
                      </div>

                      {/* Logged in User & IP */}
                      <div className="flex items-center gap-3 text-xs text-amber-200/60 pt-1 flex-wrap">
                        {dev.user_name ? (
                          <span className="flex items-center gap-1 text-slate-200 font-medium">
                            <User className="w-3.5 h-3.5 text-amber-400" />
                            <span>{dev.user_name}</span>
                            <span className="text-[10px] text-amber-300/80 font-bold px-1.5 py-0.2 rounded-md bg-amber-500/10 border border-amber-400/20">
                              {dev.user_role}
                            </span>
                          </span>
                        ) : (
                          <span className="text-amber-200/40 italic">
                            Unauthenticated / Screen Display
                          </span>
                        )}

                        {dev.ip_address && (
                          <span className="font-mono text-[11px] text-amber-200/50">
                            IP: {dev.ip_address}
                          </span>
                        )}

                        <span className="flex items-center gap-1 text-amber-200/60 text-[11px]">
                          <Clock className="w-3 h-3" />
                          <span>{formatLastSeen(dev.seconds_ago)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Disconnect Action */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {isTerminated ? (
                      <span className="text-xs text-rose-400 font-bold px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                        Session Terminated
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          const confirmMsg = isCurrent
                            ? 'Warning: This is your current device! Disconnecting will log you out immediately. Proceed?'
                            : `Disconnect ${dev.device_name} (${dev.portal})? The device will be logged out immediately.`;
                          if (window.confirm(confirmMsg)) {
                            disconnectMutation.mutate(dev.device_id);
                          }
                        }}
                        disabled={disconnectMutation.isPending}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold border border-rose-500/30 transition-all hover:scale-[1.02] cursor-pointer"
                        title="Disconnect this device and force logout"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Disconnect & Logout</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
