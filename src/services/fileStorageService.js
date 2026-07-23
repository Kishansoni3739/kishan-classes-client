import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";

// In-memory web blob store for offline web previewing
const webBlobStore = new Map();

/**
 * Check if app is running as a native Android or iOS Capacitor app
 */
export const isNativePlatform = () => Capacitor.isNativePlatform();

/**
 * Convert Blob to Base64 string for Capacitor Filesystem API
 */
const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const result = reader.result;
      const base64 = typeof result === "string" ? result.split(",")[1] : "";
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });

/**
 * Generate incremented filename if file exists (e.g., "notes (1).pdf")
 */
export const generateNextFilename = (filename, existingFilenames = []) => {
  if (!existingFilenames.includes(filename)) return filename;

  const dotIndex = filename.lastIndexOf(".");
  const name = dotIndex !== -1 ? filename.substring(0, dotIndex) : filename;
  const ext = dotIndex !== -1 ? filename.substring(dotIndex) : "";

  let count = 1;
  let newName = `${name} (${count})${ext}`;

  while (existingFilenames.includes(newName)) {
    count++;
    newName = `${name} (${count})${ext}`;
  }

  return newName;
};

/**
 * Save file locally to Native Device Documents / Downloads folder or Web Blob Store
 */
export const saveFile = async ({ filename, blob, mimeType }) => {
  if (isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(blob);
      const folder = "Kishan Classes";
      const fullPath = `${folder}/${filename}`;

      // Ensure directory exists
      try {
        await Filesystem.mkdir({
          path: folder,
          directory: Directory.Documents,
          recursive: true,
        });
      } catch (e) {
        // Directory may already exist
      }

      const result = await Filesystem.writeFile({
        path: fullPath,
        data: base64Data,
        directory: Directory.Documents,
      });

      return {
        localPath: result.uri || fullPath,
        relativePath: fullPath,
        filename,
        isNative: true,
      };
    } catch (err) {
      console.error("[FILE STORAGE SERVICE] Native writeFile error:", err);
      // Fallback to Directory.Data if Documents fails
      const base64Data = await blobToBase64(blob);
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Data,
      });

      return {
        localPath: result.uri || filename,
        relativePath: filename,
        filename,
        isNative: true,
      };
    }
  } else {
    // Web platform browser blob storage
    const objectUrl = URL.createObjectURL(blob);
    webBlobStore.set(filename, { blob, objectUrl, mimeType });

    // Also trigger standard browser file download
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    return {
      localPath: objectUrl,
      filename,
      isNative: false,
    };
  }
};

/**
 * Check if local file exists
 */
export const fileExists = async (localPath, filename) => {
  if (isNativePlatform()) {
    try {
      await Filesystem.stat({
        path: localPath,
      });
      return true;
    } catch (err) {
      try {
        await Filesystem.stat({
          path: `Kishan Classes/${filename}`,
          directory: Directory.Documents,
        });
        return true;
      } catch (e) {
        return false;
      }
    }
  } else {
    return webBlobStore.has(filename) || Boolean(localPath);
  }
};

/**
 * Delete local copy of file
 */
export const deleteFile = async (localPath, filename) => {
  if (isNativePlatform()) {
    try {
      if (localPath.startsWith("file://") || localPath.includes("/")) {
        await Filesystem.deleteFile({
          path: localPath,
        });
      } else {
        await Filesystem.deleteFile({
          path: `Kishan Classes/${filename}`,
          directory: Directory.Documents,
        });
      }
    } catch (err) {
      console.warn("[FILE STORAGE SERVICE] File delete error:", err);
    }
  } else {
    if (webBlobStore.has(filename)) {
      const data = webBlobStore.get(filename);
      if (data?.objectUrl) {
        URL.revokeObjectURL(data.objectUrl);
      }
      webBlobStore.delete(filename);
    }
  }
};

/**
 * Retrieve Web Blob URL if stored
 */
export const getWebBlobUrl = (filename) => {
  const stored = webBlobStore.get(filename);
  return stored ? stored.objectUrl : null;
};

export const fileStorageService = {
  isNativePlatform,
  saveFile,
  fileExists,
  deleteFile,
  generateNextFilename,
  getWebBlobUrl,
};
