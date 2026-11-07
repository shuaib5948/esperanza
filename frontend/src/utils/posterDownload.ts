import { parsePosterCompetition, WinnerItem } from '../components/OfficialResultPosterCard.js';

export interface PosterData {
  competition_id?: number;
  competition_name?: string;
  programme_group?: string;
  programme_number?: number | string;
  participation_type?: string;
  winners?: WinnerItem[];
}

/**
 * Renders an official result poster onto an HTML5 Canvas and triggers a high-resolution PNG download.
 */
export async function downloadPosterImage(poster: PosterData): Promise<void> {
  const { category, cleanName } = parsePosterCompetition(
    poster.competition_name || 'MADH SONG',
    poster.programme_group
  );

  // 1. Split program name words for balanced multiline display matching sample
  const words = cleanName.split(/\s+/).filter(Boolean);
  let displayLines: string[] = [];

  if (words.length <= 1) {
    displayLines = [cleanName];
  } else if (words.length === 2) {
    displayLines = [words[0], words[1]];
  } else if (words.length === 3) {
    if (cleanName.length > 20) {
      displayLines = [words[0], words[1], words[2]];
    } else {
      displayLines = [`${words[0]} ${words[1]}`, words[2]];
    }
  } else {
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

  // 2. Dynamic font sizing ratio matching OfficialResultPosterCard
  const longestLineLen = Math.max(...displayLines.map((l) => l.length), 1);
  const totalLen = cleanName.length;

  let programFontSizeRatio = 0.086;
  if (totalLen > 28 || longestLineLen > 18 || displayLines.length >= 3) {
    programFontSizeRatio = 0.044;
  } else if (totalLen > 20 || longestLineLen > 14) {
    programFontSizeRatio = 0.052;
  } else if (totalLen > 14 || longestLineLen > 10) {
    programFontSizeRatio = 0.064;
  } else if (totalLen > 9 || longestLineLen > 6) {
    programFontSizeRatio = 0.076;
  } else {
    programFontSizeRatio = 0.086;
  }

  // 3. Filter & sort verified winners
  const allWinners = (poster.winners || [])
    .filter((w) => w && Number(w.position) > 0)
    .sort((a, b) => Number(a.position) - Number(b.position));

  const isGroup =
    (poster.participation_type || '').toUpperCase() === 'GROUP' ||
    (poster.participation_type || '').toUpperCase() === 'TEAM' ||
    allWinners.some((w) => Boolean(w.is_group));

  const rankCount = allWinners.length;

  // 4. Create high-resolution Canvas (2x scale of 866x1024 = 1732x2048)
  const W = 1732;
  const H = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // 5. Load poster template image
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = '/assets/poster-template.jpg';
  await new Promise<void>((resolve, reject) => {
    if (img.complete && img.naturalWidth !== 0) {
      resolve();
    } else {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load poster template image'));
    }
  });

  // 6. Draw background template
  ctx.drawImage(img, 0, 0, W, H);

  // 7. Ensure web fonts are rendered
  if (document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue even if font readiness probe fails
    }
  }

  // 8. Typography Inlay (Vector-calibrated geometry: left 23.4%, top 29.2%)
  const startX = 0.234 * W;
  let currentY = 0.292 * H;

  // 8a. Category Name (White Bold Sans-Serif)
  const categoryFontSize = Math.round(0.036 * W); // 3.6cqw
  ctx.font = `800 ${categoryFontSize}px "Plus Jakarta Sans", "Inter", sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'top';
  ctx.fillText(category.toUpperCase(), startX, currentY);

  const categoryMarginBottom = Math.round(0.012 * W); // 1.2cqw
  currentY += categoryFontSize + categoryMarginBottom;

  // 8b. Program Name (Warm Golden Yellow Slab Serif Typography)
  const programFontSize = Math.round(programFontSizeRatio * W);
  ctx.font = `900 ${programFontSize}px "Graduate", "Rockwell", "Cinzel", serif`;
  ctx.fillStyle = '#E8A317';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowOffsetY = Math.round(0.002 * W);
  ctx.shadowBlur = Math.round(0.004 * W);

  const lineHeight = Math.round(0.96 * programFontSize);
  for (const line of displayLines) {
    ctx.fillText(line.toUpperCase(), startX, currentY);
    currentY += lineHeight;
  }

  // Reset shadow for subsequent text
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const programMarginBottom = Math.round(0.042 * W); // 4.2cqw
  currentY += programMarginBottom;

  // 8c. Rankers List (1, 2, 3...)
  const rankFontSize = Math.round((rankCount >= 4 ? 0.029 : 0.033) * W);
  const rankGap = Math.round(0.016 * W); // 1.6cqw

  if (allWinners.length > 0) {
    for (const w of allWinners) {
      const pos = Number(w.position);
      const isRivaya = (w.team_name || w.team_code || '').toUpperCase().includes('RIVAYA');
      const teamDisplay = isRivaya ? 'Rivaya' : 'Diraya';

      const mainName = isGroup
        ? w.team_name || `House ${teamDisplay}`
        : w.participant_name || 'Participant';

      let subName = isGroup
        ? w.group_members && w.group_members !== w.team_name
          ? w.group_members
          : ''
        : w.team_name || teamDisplay;

      if (subName && mainName.toLowerCase().includes(subName.toLowerCase())) {
        subName = '';
      }

      // Draw Main Name: "1. Name"
      const mainText = `${pos}. ${mainName}`;
      ctx.font = `700 ${rankFontSize}px "Plus Jakarta Sans", "Inter", sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(mainText, startX, currentY);

      // Measure position for Subtitle
      if (subName) {
        const mainMetrics = ctx.measureText(mainText);
        const subFontSize = Math.round(rankFontSize * 0.84);
        const subGap = Math.round(0.014 * W);

        ctx.font = `300 ${subFontSize}px "Plus Jakarta Sans", "Inter", sans-serif`;
        ctx.fillStyle = 'rgba(226, 232, 240, 0.9)'; // slate-200/90
        ctx.fillText(subName, startX + mainMetrics.width + subGap, currentY + (rankFontSize - subFontSize) * 0.75);
      }

      currentY += rankFontSize + rankGap;
    }
  } else {
    ctx.font = `italic 400 ${Math.round(0.03 * W)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('Official rank list pending', startX, currentY);
  }

  // 9. Convert Canvas to Blob and trigger download
  return new Promise<void>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to generate image blob'));
          return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const sanitizedName = cleanName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
        a.download = `ESPERANZA_${category}_${sanitizedName}_Result.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => {
          URL.revokeObjectURL(url);
          resolve();
        }, 1500);
      },
      'image/png',
      1.0
    );
  });
}
