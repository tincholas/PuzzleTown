import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Tactile Haptic Vibration Feedback for Mobile
// Uses @capacitor/haptics on iOS & Android native apps, and Web Vibration API on browsers/PWA

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

  // 1. Native Capacitor Haptics (iOS Taptic Engine & Android Native)
  if (Capacitor.isNativePlatform()) {
    try {
      switch (type) {
        case 'light':
          Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
          break;
        case 'medium':
          Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
          break;
        case 'success':
          Haptics.notification({ type: NotificationType.Success }).catch(() => {});
          break;
        case 'error':
          Haptics.notification({ type: NotificationType.Error }).catch(() => {});
          break;
      }
      return;
    } catch {
      // Fall through to web vibration if Capacitor call fails
    }
  }

  // 2. Standard navigator.vibrate (Android PWA, Chrome, mobile web)
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
}

