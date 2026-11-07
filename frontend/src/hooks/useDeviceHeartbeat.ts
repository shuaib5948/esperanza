import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';

// Device identity helper
export const getDeviceId = (): string => {
  let id = localStorage.getItem('esperanza_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem('esperanza_device_id', id);
  }
  return id;
};

// Device name detector
export const getDeviceName = (): string => {
  const ua = navigator.userAgent || '';
  if (/iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'Apple iPad';
  }
  if (/iPhone/i.test(ua)) {
    return 'Apple iPhone';
  }
  if (/Android/i.test(ua)) {
    return /Mobile/i.test(ua) ? 'Android Mobile' : 'Android Tablet';
  }
  if (/Windows/i.test(ua)) {
    return 'Windows PC';
  }
  if (/Macintosh|Mac OS X/i.test(ua)) {
    return 'MacBook / macOS';
  }
  if (/Linux/i.test(ua)) {
    return 'Linux Machine';
  }
  return 'Web Device';
};

// Browser detector
export const getBrowserName = (): string => {
  const ua = navigator.userAgent || '';
  if (/Edg\//i.test(ua)) return 'Microsoft Edge';
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'Google Chrome';
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Apple Safari';
  if (/Firefox\//i.test(ua)) return 'Mozilla Firefox';
  return 'Web Browser';
};

// Portal detector based on URL path
export const getPortalName = (pathname: string): string => {
  if (pathname.startsWith('/judge')) return 'Judge Portal';
  if (pathname.startsWith('/admin')) return 'Admin Portal';
  if (pathname.startsWith('/live')) return 'Live Stage Screen';
  if (pathname.startsWith('/team')) return 'Team Leader Portal';
  if (pathname.startsWith('/participant')) return 'Participant Portal';
  if (pathname.startsWith('/leaderboard')) return 'Public Leaderboard';
  if (pathname.startsWith('/schedule')) return 'Public Schedule';
  return 'Public Web';
};

export const useDeviceHeartbeat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const deviceId = getDeviceId();
    const deviceName = getDeviceName();
    const browser = getBrowserName();

    const sendHeartbeat = async () => {
      try {
        const portal = getPortalName(location.pathname);
        const res = await api.post<{ terminated?: boolean }>('/devices/heartbeat', {
          device_id: deviceId,
          device_name: deviceName,
          browser,
          portal,
          current_path: location.pathname,
        });

        if (res.data?.terminated) {
          logout();
          alert('This device session has been disconnected by an administrator.');
          navigate('/login');
        }
      } catch (e) {
        // Silent heartbeat fail tolerance
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 25000);

    return () => clearInterval(interval);
  }, [location.pathname, logout, navigate]);
};
