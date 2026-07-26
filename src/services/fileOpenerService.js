import { Capacitor, registerPlugin } from "@capacitor/core";
import { getWebBlobUrl } from "./fileStorageService.js";

const NativeFileOpener = registerPlugin("NativeFileOpener");

const getMimeType = (filename, defaultType) => {
  if (defaultType && defaultType !== "application/octet-stream" && defaultType !== "undefined") {
    return defaultType;
  }
  const ext = (filename || "").split(".").pop().toLowerCase();
  switch (ext) {
    case "pdf": return "application/pdf";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "webp": return "image/webp";
    case "mp4": return "video/mp4";
    case "mp3": return "audio/mpeg";
    case "doc":
    case "docx": return "application/msword";
    case "xls":
    case "xlsx": return "application/vnd.ms-excel";
    case "txt": return "text/plain";
    default: return defaultType || "*/*";
  }
};

/**
 * Open local file offline without making network calls to ImageKit
 */
export const openLocalFile = async ({ localPath, filename, mimeType }) => {
  try {
    if (Capacitor.isNativePlatform()) {
      try {
        const contentType = getMimeType(filename, mimeType);
        await NativeFileOpener.open({
          filePath: localPath,
          contentType: contentType,
        });
        return true;
      } catch (nativeErr) {
        console.warn("[FILE OPENER SERVICE] Native plugin warning, falling back to convertFileSrc:", nativeErr);
        let webViewUrl = localPath;
        if (localPath.startsWith("file://") || localPath.startsWith("/")) {
          webViewUrl = Capacitor.convertFileSrc(localPath);
        }
        window.open(webViewUrl, "_blank");
        return true;
      }
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

/**
 * Print Document (Native Android PrintManager adapter or browser window.print)
 */
export const printDocument = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      try {
        await NativeFileOpener.print();
        return true;
      } catch (e) {
        window.print();
        return true;
      }
    } else {
      window.print();
      return true;
    }
  } catch (err) {
    console.error("[FILE OPENER SERVICE] Print error:", err);
    window.print();
  }
};

export const fileOpenerService = {
  openLocalFile,
  shareLocalFile,
  printDocument,
};
