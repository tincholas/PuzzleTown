// Tactile Haptic Vibration Feedback for Mobile
// Works via Web Vibration API on Android/browsers and bridges to Capacitor on iOS/Android

const STORAGE_KEY_VIBRATION = 'puzzletown_vibration_enabled';

let vibrationEnabled: boolean = (() => {
  if (typeof window === 'undefined') return true;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_VIBRATION);
    return saved !== null ? saved === 'true' : true;
  } catch {
    return true;
  }
})();

export function isVibrationEnabled(): boolean {
  return vibrationEnabled;
}

export function setVibrationEnabled(enabled: boolean) {
  vibrationEnabled = enabled;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_VIBRATION, String(enabled));
    } catch {
      // Ignore quota errors
    }
  }
}

export type HapticType = 'light' | 'medium' | 'success' | 'error';

/**
 * Triggers a subtle tactile haptic vibration.
 * Safe to call on any platform (gracefully no-ops if unsupported).
 */
export function hapticTap(type: HapticType = 'light') {
  if (!vibrationEnabled || typeof window === 'undefined') return;

  // 1. Check for standard navigator.vibrate (Android PWA, Chrome, mobile web)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      switch (type) {
        case 'light':
          // Subtle 12ms tick for roads, empty marks, tray selection
          navigator.vibrate(12);
          break;
        case 'medium':
          // Crisp 22ms tap for placing a building
          navigator.vibrate(22);
          break;
        case 'success':
          // Joyful celebratory double-pulse on village completion
          navigator.vibrate([25, 45, 35]);
          break;
        case 'error':
          // Subtle double rumble on invalid move
          navigator.vibrate([30, 40, 45]);
          break;
      }
    } catch {
      // Ignore security or restriction errors
    }
  }

  // 2. Future-proof Capacitor Haptics bridge if window.Capacitor is present
  const cap = (window as unknown as { Capacitor?: { Plugins?: { Haptics?: { impact?: (opts: { style: string }) => void; notification?: (opts: { type: string }) => void } } } }).Capacitor;
  if (cap?.Plugins?.Haptics) {
    try {
      if (type === 'light') {
        cap.Plugins.Haptics.impact?.({ style: 'LIGHT' });
      } else if (type === 'medium') {
        cap.Plugins.Haptics.impact?.({ style: 'MEDIUM' });
      } else if (type === 'success') {
        cap.Plugins.Haptics.notification?.({ type: 'SUCCESS' });
      } else if (type === 'error') {
        cap.Plugins.Haptics.notification?.({ type: 'ERROR' });
      }
    } catch {
      // Ignore
    }
  }
}
