// Haptics service using expo-haptics when available, otherwise no-op.
// This keeps behavior subtle and future-compatible.

let ExpoHaptics: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ExpoHaptics = require('expo-haptics');
} catch {}

const withExpo = !!ExpoHaptics;

export const haptics = {
  async light() {
    if (withExpo) {
      try {
        await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
  },
  async selection() {
    if (withExpo) {
      try {
        await ExpoHaptics.selectionAsync();
      } catch {}
    }
  },
  async success() {
    if (withExpo) {
      try {
        await ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success);
      } catch {}
    }
  },
  async warning() {
    if (withExpo) {
      try {
        await ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning);
      } catch {}
    }
  },
};

export default haptics;
