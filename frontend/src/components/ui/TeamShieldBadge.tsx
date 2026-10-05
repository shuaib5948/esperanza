import React from 'react';

interface TeamShieldBadgeProps {
  team: 'DIRAYA' | 'RIVAYA' | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const TeamShieldBadge: React.FC<TeamShieldBadgeProps> = ({
  team,
  className = '',
  size = 'md',
}) => {
  const isDiraya = team?.toUpperCase().includes('DIRAYA');

  const dimensions = {
    sm: 'w-10 h-12',
    md: 'w-16 h-20',
    lg: 'w-20 h-24',
  }[size];

  if (isDiraya) {
    // Team Diraya: Green Shield with Lion Emblem
    return (
      <div className={`relative flex items-center justify-center shrink-0 ${dimensions} ${className}`}>
        <svg
          viewBox="0 0 80 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md"
        >
          {/* Outer Shield Border */}
          <path
            d="M40 2L76 14V46C76 70 40 92 40 92C40 92 4 70 4 46V14L40 2Z"
            fill="#065F46"
            stroke="#10B981"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Inner Shield Glow */}
          <path
            d="M40 7L71 17.5V45.5C71 66.5 40 86 40 86C40 86 9 66.5 9 45.5V17.5L40 7Z"
            fill="url(#dirayaGradient)"
          />
          {/* Lion Motif Silhouette */}
          <g transform="translate(18, 20) scale(0.9)" fill="#FFFFFF">
            {/* Mane & Head */}
            <path d="M24 4C20 4 17 6 15 8C13 7 10 7 8 9C5 12 5 16 6 19C4 21 3 24 4 27C5 31 8 33 11 34C10 36 10 39 12 41C14 43 17 44 20 44C23 44 26 43 28 41C30 39 30 36 29 34C32 33 35 31 36 27C37 24 36 21 34 19C35 16 35 12 32 9C30 7 27 7 25 8C23 6 20 4 24 4Z" opacity="0.95" />
            {/* Facial details */}
            <path d="M19 18C18 18 17 19 17 20C17 21 18 22 19 22C20 22 21 21 21 20C21 19 20 18 19 18Z" fill="#065F46" />
            <path d="M29 18C28 18 27 19 27 20C27 21 28 22 29 22C30 22 31 21 31 20C31 19 30 18 29 18Z" fill="#065F46" />
            <path d="M24 24L21 28H27L24 24Z" fill="#065F46" />
            <path d="M21 30C23 32 25 32 27 30" stroke="#065F46" strokeWidth="1.5" strokeLinecap="round" />
            {/* Crown / Royal tuft */}
            <path d="M24 2L21 7L24 6L27 7L24 2Z" fill="#FCD34D" />
          </g>
          <defs>
            <linearGradient id="dirayaGradient" x1="40" y1="7" x2="40" y2="86" gradientUnits="userSpaceOnUse">
              <stop stopColor="#047857" />
              <stop offset="1" stopColor="#064E3B" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  // Team Rivaya: Royal Blue Shield with Phoenix/Eagle Emblem
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${dimensions} ${className}`}>
      <svg
        viewBox="0 0 80 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        {/* Outer Shield Border */}
        <path
          d="M40 2L76 14V46C76 70 40 92 40 92C40 92 4 70 4 46V14L40 2Z"
          fill="#1D4ED8"
          stroke="#60A5FA"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Inner Shield Glow */}
        <path
          d="M40 7L71 17.5V45.5C71 66.5 40 86 40 86C40 86 9 66.5 9 45.5V17.5L40 7Z"
          fill="url(#rivayaGradient)"
        />
        {/* Soaring Falcon / Phoenix Silhouette */}
        <g transform="translate(16, 20) scale(0.95)" fill="#FFFFFF">
          {/* Wings Spread */}
          <path
            d="M25 6C23 8 20 11 18 15C15 12 11 10 6 9C3 8 1 9 1 11C2 14 5 18 9 21C6 22 3 24 1 26C0 27 1 29 3 29C7 29 12 28 16 26C15 29 14 33 13 37C17 35 21 32 23 27C24 30 25 35 25 40C25 35 26 30 27 27C29 32 33 35 37 37C36 33 35 29 34 26C38 28 43 29 47 29C49 29 50 27 49 26C47 24 44 22 41 21C45 18 48 14 49 11C49 9 47 8 44 9C39 10 35 12 32 15C30 11 27 8 25 6Z"
            opacity="0.95"
          />
          {/* Falcon Head & Beak */}
          <path d="M25 4C23.5 4 22 5.5 22 7C22 8 23 9 24 9.5L25 12L26 9.5C27 9 28 8 28 7C28 5.5 26.5 4 25 4Z" fill="#FCD34D" />
        </g>
        <defs>
          <linearGradient id="rivayaGradient" x1="40" y1="7" x2="40" y2="86" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2563EB" />
            <stop offset="1" stopColor="#1E3A8A" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};
