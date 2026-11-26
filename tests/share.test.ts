import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildChallengeUrl, shareLevelChallenge, BASE_SHARE_URL } from '../src/utils/share';

describe('Share & Challenge System', () => {
  it('builds challenge URLs with level and challengeStars params', () => {
    const url = buildChallengeUrl(12, 3);
    expect(url).toBe('https://stonecallstudio.com/PuzzleTown/?level=12&challengeStars=3');
  });

  it('clamps stars correctly between 1 and 3 in the challenge URL', () => {
    const url = buildChallengeUrl(4, 5);
    expect(url).toBe('https://stonecallstudio.com/PuzzleTown/?level=4&challengeStars=5');
  });

  it('falls back to navigator.clipboard if neither native nor navigator.share is available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: { writeText }
    });

    const result = await shareLevelChallenge({
      levelId: 7,
      levelTitle: 'Forest Path',
      stars: 3
    });

    expect(result.success).toBe(true);
    expect(result.method).toBe('clipboard');
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('https://stonecallstudio.com/PuzzleTown/?level=7&challengeStars=3');
    expect(writeText.mock.calls[0][0]).toContain('⭐⭐⭐');

    vi.unstubAllGlobals();
  });

  it('uses navigator.share when available in browser', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      share: shareMock
    });

    const result = await shareLevelChallenge({
      levelId: 5,
      levelTitle: 'Village Square',
      stars: 2
    });

    expect(result.success).toBe(true);
    expect(result.method).toBe('web');
    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'PuzzleTown Challenge — Level 5',
        url: 'https://stonecallstudio.com/PuzzleTown/?level=5&challengeStars=2'
      })
    );

    vi.unstubAllGlobals();
  });
});
