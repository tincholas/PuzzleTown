import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export interface ShareChallengeOptions {
  levelId: number;
  levelTitle: string;
  stars: number;
}

export type ShareResult =
  | { success: true; method: 'native' | 'web' }
  | { success: true; method: 'clipboard' }
  | { success: false; method: 'cancelled' | 'error'; error?: string };

export const BASE_SHARE_URL = 'https://stonecallstudio.com/PuzzleTown/';

export function buildChallengeUrl(levelId: number, stars: number): string {
  const url = new URL(BASE_SHARE_URL);
  url.searchParams.set('level', String(levelId));
  url.searchParams.set('challengeStars', String(stars));
  return url.toString();
}

export async function shareLevelChallenge({
  levelId,
  levelTitle,
  stars
}: ShareChallengeOptions): Promise<ShareResult> {
  const starIcons = '⭐'.repeat(Math.max(1, Math.min(3, stars)));
  const shareUrl = buildChallengeUrl(levelId, stars);
  const title = `PuzzleTown Challenge — Level ${levelId}`;
  const text = `I just earned ${starIcons} on Level ${levelId} ("${levelTitle}") in PuzzleTown! Can you beat my score? 🏘️`;

  // 1. Native Capacitor Share (iOS & Android)
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({
        title,
        text: `${text}\n${shareUrl}`,
        url: shareUrl,
        dialogTitle: 'Challenge a Friend'
      });
      return { success: true, method: 'native' };
    } catch (err: unknown) {
      const msg = (err as Error)?.message?.toLowerCase() || '';
      if (msg.includes('cancel') || msg.includes('dismiss') || msg.includes('abort')) {
        return { success: false, method: 'cancelled' };
      }
      // If native share fails unexpectedly, fall back to clipboard
    }
  }

  // 2. Web Share API (Safari, Mobile Chrome, etc.)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title,
        text,
        url: shareUrl
      });
      return { success: true, method: 'web' };
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        return { success: false, method: 'cancelled' };
      }
      // If Web Share throws another error, proceed to clipboard fallback
    }
  }

  // 3. Clipboard Fallback (Desktop web, older browsers)
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
      return { success: true, method: 'clipboard' };
    } catch (err: unknown) {
      return {
        success: false,
        method: 'error',
        error: (err as Error)?.message || 'Failed to copy to clipboard'
      };
    }
  }

  return { success: false, method: 'error', error: 'Sharing not supported on this browser' };
}
