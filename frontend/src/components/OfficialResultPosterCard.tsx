import React from 'react';

export interface WinnerItem {
  position: number;
  participant_name?: string;
  team_name?: string;
  team_code?: string;
  group_members?: string;
  is_group?: boolean;
}

export interface OfficialResultPosterCardProps {
  poster: {
    competition_id?: number;
    competition_name?: string;
    programme_group?: string;
    programme_number?: number | string;
    participation_type?: string;
    winners?: WinnerItem[];
  };
  className?: string;
  onClick?: () => void;
}

// Compiled regexes (arranged so Tailwind's arbitrary class scanner won't parse bracketed colons as CSS)
const RE_CATEGORY_WORDS = new RegExp('^(junior|senior|general|sub-junior|sub junior)\\s*[-.–—:]?\\s*', 'i');
const RE_CODE_PREFIX = new RegExp('^[a-z]{1,3}[-_]?\\d+\\s*[-.–—:]?\\s*', 'i');
const RE_NUMERIC_PREFIX = new RegExp('^\\d+\\s*[-.–—:]\\s*');
const RE_LEADING_PUNCT = new RegExp('^[-.–—:]+\\s*');
const RE_UNDERSCORES = new RegExp('_', 'g');

/**
 * Parses raw competition strings like "j1-booktest", "Junior - Madh Song", "S2-Elocution"
 * into a clean Category ("JUNIOR") and clean Program Name ("BOOKTEST").
 */
export function parsePosterCompetition(rawName?: string, rawGroup?: string): {
  category: string;
  cleanName: string;
} {
  const originalName = (rawName || '').trim();
  let group = (rawGroup || '').toUpperCase().trim();

  // If group not provided or empty, infer from prefix
  if (!group) {
    const fullMatch = originalName.match(/^(junior|senior|general|sub-junior|sub junior)/i);
    if (fullMatch) {
      group = fullMatch[1].toUpperCase();
    } else {
      const codeMatch = originalName.match(/^([a-z]{1,3})[-_]?\d+/i);
      if (codeMatch) {
        const p = codeMatch[1].toUpperCase();
        if (p === 'J' || p === 'JUN') group = 'JUNIOR';
        else if (p === 'S' || p === 'SEN') group = 'SENIOR';
        else if (p === 'G' || p === 'GEN') group = 'GENERAL';
        else if (p === 'SJ' || p === 'SUB') group = 'SUB-JUNIOR';
      }
    }
  }
  if (!group) group = 'GENERAL';

  // Clean the competition name:
  // 1. Remove category word prefixes, e.g. "Junior - ", "Senior: ", "GENERAL "
  let cleaned = originalName.replace(RE_CATEGORY_WORDS, '');

  // 2. Remove code prefixes like "j1-", "j01-", "j-1-", "s2-", "g03: ", "sj1-", "p1 - ", "j1 "
  cleaned = cleaned.replace(RE_CODE_PREFIX, '');

  // 3. Remove standalone numeric prefixes like "1 - ", "01: "
  cleaned = cleaned.replace(RE_NUMERIC_PREFIX, '');

  // 4. Clean any remaining leading punctuation/dashes
  cleaned = cleaned.replace(RE_LEADING_PUNCT, '').trim();

  // 5. Replace underscores with spaces (e.g. "book_test" -> "book test")
  cleaned = cleaned.replace(RE_UNDERSCORES, ' ').trim();

  // If after cleaning it's empty, fallback to original name
  if (!cleaned) cleaned = originalName;

  return {
    category: group,
    cleanName: cleaned.toUpperCase(),
  };
}

export const OfficialResultPosterCard: React.FC<OfficialResultPosterCardProps> = ({
  poster,
  className = '',
  onClick,
}) => {
  // Extract category and clean program name
  const { category, cleanName } = parsePosterCompetition(
    poster.competition_name || 'MADH SONG',
    poster.programme_group
  );

  // Split program name words for balanced multiline display matching sample
  const words = cleanName.split(/\s+/).filter(Boolean);
  let displayLines: string[] = [];

  if (words.length <= 1) {
    displayLines = [cleanName];
  } else if (words.length === 2) {
    // E.g. "MADH", "SONG" or "BOOK", "TEST"
    displayLines = [words[0], words[1]];
  } else if (words.length === 3) {
    if (cleanName.length > 20) {
      displayLines = [words[0], words[1], words[2]];
    } else {
      displayLines = [`${words[0]} ${words[1]}`, words[2]];
    }
  } else {
    // 4+ words: balance across 2 or 3 lines
    if (cleanName.length > 28) {
      const third = Math.ceil(words.length / 3);
      displayLines = [
        words.slice(0, third).join(' '),
        words.slice(third, third * 2).join(' '),
        words.slice(third * 2).join(' '),
      ].filter(Boolean);
    } else {
      const mid = Math.ceil(words.length / 2);
      displayLines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
    }
  }

  // Calculate dynamic font size based on length so large names scale down smoothly
  const longestLineLen = Math.max(...displayLines.map((l) => l.length), 1);
  const totalLen = cleanName.length;

  let programFontSize = '8.6cqw';
  if (totalLen > 28 || longestLineLen > 18 || displayLines.length >= 3) {
    programFontSize = '4.4cqw';
  } else if (totalLen > 20 || longestLineLen > 14) {
    programFontSize = '5.2cqw';
  } else if (totalLen > 14 || longestLineLen > 10) {
    programFontSize = '6.4cqw';
  } else if (totalLen > 9 || longestLineLen > 6) {
    programFontSize = '7.6cqw';
  } else {
    programFontSize = '8.6cqw';
  }

  // Sort and filter verified winners (1, 2, 3, 4)
  const allWinners = (poster.winners || [])
    .filter((w) => w && Number(w.position) > 0)
    .sort((a, b) => Number(a.position) - Number(b.position));

  const isGroup =
    (poster.participation_type || '').toUpperCase() === 'GROUP' ||
    (poster.participation_type || '').toUpperCase() === 'TEAM' ||
    allWinners.some((w) => Boolean(w.is_group));

  const rankCount = allWinners.length;

  return (
    <div
      onClick={onClick}
      style={{ containerType: 'inline-size' }}
      className={`relative w-full aspect-[866/1024] max-w-full rounded-2xl overflow-hidden shadow-2xl select-none ${className}`}
    >
      {/* 1. Exact Poster Background Template */}
      <img
        src="/assets/poster-template.jpg"
        alt="Esperanza Result Poster"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        loading="lazy"
      />

      {/* 2. Vector-Calibrated Green Folder Typography Inlay (Moved slightly downward per request) */}
      <div
        className="absolute flex flex-col"
        style={{
          left: '23.4%',
          top: '29.2%',
          width: '60.5%',
        }}
      >
        {/* Category Name (White Bold Sans-Serif) */}
        <span
          className="font-sans font-extrabold uppercase text-white tracking-wider leading-none"
          style={{ fontSize: '3.6cqw', marginBottom: '1.2cqw' }}
        >
          {category}
        </span>

        {/* Program Name (Warm Golden Yellow Slab Serif Typography) */}
        <div
          className="font-graduate font-black uppercase text-[#E8A317] tracking-tight leading-[0.96] drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
          style={{
            fontSize: programFontSize,
            marginBottom: '4.2cqw', // Increased gap after program name
          }}
        >
          {displayLines.map((line, idx) => (
            <div key={idx} className="whitespace-normal leading-[0.96]">
              {line}
            </div>
          ))}
        </div>

        {/* Rankers List (1, 2, 3...) - Just below Program Name with comfortable gap */}
        <div className="flex flex-col space-y-[1.6cqw]">
          {allWinners.length > 0 ? (
            allWinners.map((w, idx) => {
              const pos = Number(w.position);
              const isRivaya = (w.team_name || w.team_code || '').toUpperCase().includes('RIVAYA');
              const teamDisplay = isRivaya ? 'Rivaya' : 'Diraya';

              const mainName = isGroup
                ? w.team_name || `House ${teamDisplay}`
                : w.participant_name || 'Participant';

              let subName = isGroup
                ? (w.group_members && w.group_members !== w.team_name ? w.group_members : '')
                : (w.team_name || teamDisplay);

              // Don't repeat if mainName already contains team name
              if (subName && mainName.toLowerCase().includes(subName.toLowerCase())) {
                subName = '';
              }

              return (
                <div
                  key={`${pos}-${idx}`}
                  className="flex items-baseline gap-[1.4cqw] leading-tight overflow-hidden"
                  style={{ fontSize: rankCount >= 4 ? '2.9cqw' : '3.3cqw' }}
                >
                  {/* Position number and name in White Bold */}
                  <span className="font-sans font-bold text-white tracking-tight shrink-0">
                    {pos}. {mainName}
                  </span>

                  {/* Team / Subtitle in elegant lighter sans */}
                  {subName && (
                    <span
                      className="font-sans font-light text-slate-200/90 tracking-normal truncate"
                      style={{ fontSize: '0.84em' }}
                    >
                      {subName}
                    </span>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-white/60 font-sans italic text-[3cqw]">
              Official rank list pending
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
