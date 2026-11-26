import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildChallengeUrl, shareLevelChallenge, BASE_SHARE_URL } from '../src/utils/share';
import { generateBonusCustomLevel } from '../src/engine/campaignLevels';

describe('Share & Challenge System', () => {
  it('builds challenge URLs with level and challengeStars params', () => {
    const url = buildChallengeUrl(12, 3);
    expect(url).toBe('https://stonecallstudio.com/PuzzleTown/?level=12&challengeStars=3');
  });

  it('builds procedural Bonus Charter URLs with seed and size params and deterministically reconstructs the same board', () => {
    const senderLevel = generateBonusCustomLevel(6, 48291);
    expect(senderLevel.bonusSeed).toBe(48291);

    const url = buildChallengeUrl(
      senderLevel.id,
      3,
      senderLevel.bonusSeed,
      senderLevel.size
    );
    expect(url).toBe(
      'https://stonecallstudio.com/PuzzleTown/?seed=48291&size=6&challengeStars=3'
    );

    // Receiver reconstructs from parsed URL params
    const parsed = new URL(url);
    const seed = parseInt(parsed.searchParams.get('seed')!, 10);
    const size = parseInt(parsed.searchParams.get('size')!, 10) as 5 | 6 | 7;
    const receiverLevel = generateBonusCustomLevel(size, seed);

    expect(receiverLevel.initialGrid).toEqual(senderLevel.initialGrid);
    expect(receiverLevel.rowClues).toEqual(senderLevel.rowClues);
    expect(receiverLevel.colClues).toEqual(senderLevel.colClues);
    expect(receiverLevel.solution).toEqual(senderLevel.solution);
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
