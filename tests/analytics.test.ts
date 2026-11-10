import { beforeEach, describe, expect, it, vi } from 'vitest';

// Polyfill window & localStorage for Node test runner
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const k of Object.keys(store)) delete store[k];
  }
};

(globalThis as unknown as { localStorage: typeof mockLocalStorage }).localStorage =
  mockLocalStorage;
(globalThis as unknown as { window: { gtag?: unknown; dataLayer?: unknown[] } }).window = {
  dataLayer: []
};

import {
  getSavedFeedback,
  saveFeedbackToStorage,
  trackEvent,
  trackLevelFeedback
} from '../src/utils/analytics';

describe('Level Feedback & Analytics', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    (globalThis as unknown as { window: { gtag?: unknown } }).window.gtag = vi.fn();
  });

  it('saves and retrieves level feedback from localStorage', () => {
    expect(getSavedFeedback()).toEqual({});

    saveFeedbackToStorage(1, 'like');
    saveFeedbackToStorage(2, 'dislike');

    const feedback = getSavedFeedback();
    expect(feedback[1]).toBe('like');
    expect(feedback[2]).toBe('dislike');
  });

  it('dispatches structured events to gtag when level feedback is submitted', async () => {
    await trackLevelFeedback({
      levelId: 20,
      levelTitle: 'Homestead Valley',
      chapter: 2,
      rating: 'like',
      stars: 3,
      hintsUsed: 0,
      mistakesMade: 0
    });

    // Stored locally
    expect(getSavedFeedback()[20]).toBe('like');

    // Sent to gtag
    const gtagMock = (globalThis as unknown as { window: { gtag: ReturnType<typeof vi.fn> } }).window.gtag;
    expect(gtagMock).toHaveBeenCalledWith(
      'event',
      'level_feedback',
      expect.objectContaining({
        level_id: 20,
        level_title: 'Homestead Valley',
        chapter: 2,
        rating: 'like',
        stars: 3
      })
    );

    expect(gtagMock).toHaveBeenCalledWith(
      'event',
      'level_liked',
      expect.objectContaining({
        level_id: 20,
        stars: 3
      })
    );
  });
});
