import { Filesystem } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";

/**
 * Check and request Android storage permissions if running on native app
 */
export const checkAndRequestPermissions = async () => {
  if (!Capacitor.isNativePlatform()) return true;

  try {
    const status = await Filesystem.checkPermissions();
    if (status.publicStorage === "granted") {
      return true;
    }

    const req = await Filesystem.requestPermissions();
    return req.publicStorage === "granted" || req.publicStorage === "limited";
  } catch (err) {
    console.warn("[PERMISSION SERVICE] Permission check warning:", err);
    // Return true as fallback for newer Android versions (Android 10+) using scoped storage
    return true;
  }
};

export const permissionService = {
  checkAndRequestPermissions,
};
