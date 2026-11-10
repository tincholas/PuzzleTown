// Analytics and Level Feedback Dispatcher for PuzzleTown
// Supports Google Analytics 4 (GA4) and optional webhook (e.g. Google Sheets / Apps Script)

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

// Measurement ID configured for Google Analytics 4
const GA_MEASUREMENT_ID: string =
  (import.meta.env.VITE_GA_MEASUREMENT_ID as string) || 'G-48BBTYYXFV';

const FEEDBACK_WEBHOOK_URL: string =
  (import.meta.env.VITE_FEEDBACK_WEBHOOK_URL as string) || '';

const STORAGE_KEY_FEEDBACK = 'puzzletown_feedback_v1';

export type FeedbackRating = 'like' | 'dislike';

export interface LevelFeedbackRecord {
  levelId: number;
  levelTitle: string;
  chapter: number;
  rating: FeedbackRating;
  stars: number;
  hintsUsed: number;
  mistakesMade: number;
  timestamp: string;
}

let isInitialized = false;

/** Initialize Google Analytics 4 tag dynamically if Measurement ID is provided */
export function initAnalytics(overrideId?: string) {
  const measurementId = overrideId || GA_MEASUREMENT_ID;
  if (!measurementId || isInitialized || typeof window === 'undefined') return;

  try {
    // 1. Inject gtag.js script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);

    // 2. Initialize dataLayer and gtag function
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      send_page_view: true,
      app_name: 'PuzzleTown'
    });

    isInitialized = true;
    console.log(`[PuzzleTown Analytics] GA4 initialized with ID: ${measurementId}`);
  } catch (err) {
    console.warn('[PuzzleTown Analytics] Failed to initialize GA4:', err);
  }
}

/** Generic custom event tracker */
export function trackEvent(
  eventName: string,
  params: Record<string, string | number | boolean> = {}
) {
  if (typeof window === 'undefined') return;

  // Log in development for easy verification
  if (import.meta.env.DEV) {
    console.log(`[Analytics Event] "${eventName}":`, params);
  }

  // 1. Send to GA4 if initialized
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
}

/** Track player level start */
export function trackLevelStart(levelId: number, levelTitle: string, chapter: number) {
  trackEvent('level_start', {
    level_id: levelId,
    level_title: levelTitle,
    chapter
  });
}

/** Track player level completion */
export function trackLevelComplete(
  levelId: number,
  levelTitle: string,
  chapter: number,
  stars: number,
  hintsUsed: number,
  mistakesMade: number
) {
  trackEvent('level_complete', {
    level_id: levelId,
    level_title: levelTitle,
    chapter,
    stars,
    hints_used: hintsUsed,
    mistakes_made: mistakesMade
  });
}

/**
 * Submit thumbs up / down feedback on a completed level.
 * Dispatches to GA4, optional webhook, and saves to localStorage.
 */
export async function trackLevelFeedback(record: {
  levelId: number;
  levelTitle: string;
  chapter: number;
  rating: FeedbackRating;
  stars: number;
  hintsUsed: number;
  mistakesMade: number;
}): Promise<void> {
  const payload: LevelFeedbackRecord = {
    ...record,
    timestamp: new Date().toISOString()
  };

  // 1. Persist in localStorage so player's vote is remembered
  saveFeedbackToStorage(record.levelId, record.rating);

  // 2. Send structured event to Google Analytics 4
  trackEvent('level_feedback', {
    level_id: record.levelId,
    level_title: record.levelTitle,
    chapter: record.chapter,
    rating: record.rating,
    stars: record.stars,
    hints_used: record.hintsUsed,
    mistakes_made: record.mistakesMade
  });

  // Also send separate convenient events for easy segmenting in GA4
  trackEvent(record.rating === 'like' ? 'level_liked' : 'level_disliked', {
    level_id: record.levelId,
    level_title: record.levelTitle,
    chapter: record.chapter,
    stars: record.stars
  });

  // 3. Optional: Forward to custom webhook / Google Apps Script if URL is provided
  if (FEEDBACK_WEBHOOK_URL) {
    try {
      await fetch(FEEDBACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors' // Allows submitting to Google Forms / Apps Script without CORS blocks
      });
    } catch (err) {
      console.warn('[PuzzleTown Analytics] Webhook delivery failed:', err);
    }
  }
}

/** Retrieve all local feedback from localStorage */
export function getSavedFeedback(): Record<number, FeedbackRating> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FEEDBACK);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore storage error
  }
  return {};
}

/** Save level feedback to localStorage */
export function saveFeedbackToStorage(levelId: number, rating: FeedbackRating) {
  try {
    const current = getSavedFeedback();
    current[levelId] = rating;
    localStorage.setItem(STORAGE_KEY_FEEDBACK, JSON.stringify(current));
  } catch {
    // ignore storage error
  }
}
