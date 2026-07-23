import { Capacitor } from "@capacitor/core";
import { getWebBlobUrl } from "./fileStorageService.js";

/**
 * Open local file offline without making network calls to ImageKit
 */
export const openLocalFile = async ({ localPath, filename, mimeType }) => {
  try {
    if (Capacitor.isNativePlatform()) {
      let webViewUrl = localPath;
      if (localPath.startsWith("file://") || localPath.startsWith("/")) {
        webViewUrl = Capacitor.convertFileSrc(localPath);
      }
      window.open(webViewUrl, "_blank");
      return true;
    } else {
      // Web platform: open blob URL
      let targetUrl = localPath;
      if (!targetUrl || !targetUrl.startsWith("blob:")) {
        const storedUrl = getWebBlobUrl(filename);
        if (storedUrl) targetUrl = storedUrl;
      }

      if (targetUrl) {
        window.open(targetUrl, "_blank");
        return true;
      } else {
        throw new Error("Local web copy unavailable. Please redownload.");
      }
    }
  } catch (err) {
    console.error("[FILE OPENER SERVICE] Error opening file:", err);
    throw err;
  }
};

/**
 * Native Share local file
 */
export const shareLocalFile = async ({ localPath, filename, title }) => {
  try {
    if (navigator.share) {
      await navigator.share({
        title: title || filename,
        text: `Shared Study Material: ${title || filename}`,
        url: localPath.startsWith("blob:") ? undefined : localPath,
      });
      return true;
    } else {
      // Fallback copy link to clipboard
      await navigator.clipboard.writeText(localPath);
      return true;
    }
  } catch (err) {
    console.warn("[FILE OPENER SERVICE] Share warning:", err);
    return false;
  }
};

export const fileOpenerService = {
  openLocalFile,
  shareLocalFile,
};
