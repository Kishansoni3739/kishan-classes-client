import axios from "axios";
import { API_URL } from "../api/http.js";
import { historyService } from "./historyService.js";
import { fileStorageService } from "./fileStorageService.js";
import { permissionService } from "./permissionService.js";

/**
 * Execute native background streaming download of a material file with progress tracking (0-100%)
 */
export const downloadMaterialFile = async ({
  materialId,
  fileId,
  title,
  fileUrl,
  originalFilename,
  mimeType,
  onProgress,
}) => {
  // Check permission on Android
  const hasPerm = await permissionService.checkAndRequestPermissions();
  if (!hasPerm) {
    throw new Error("Storage permission denied. Please grant storage access.");
  }

  // Determine token
  const token = localStorage.getItem("kc_token") || "";
  const downloadApiUrl = `${API_URL}/study-materials/${materialId}/download?fileUrl=${encodeURIComponent(
    fileUrl
  )}&token=${token}`;

  try {
    // Axios request with blob response & progress listener
    const response = await axios.get(downloadApiUrl, {
      responseType: "blob",
      onDownloadProgress: (progressEvent) => {
        if (progressEvent.total && progressEvent.total > 0) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          if (onProgress) onProgress(percentCompleted);
        } else if (progressEvent.loaded) {
          // Estimated progress if content-length header is absent
          if (onProgress) onProgress(Math.min(95, Math.round(progressEvent.loaded / 1024 / 50)));
        }
      },
    });

    const blob = response.data;
    const fileSize = blob.size || 0;
    const finalFilename = originalFilename || `material_${fileId || Date.now()}.pdf`;

    // Save file locally via fileStorageService
    const savedInfo = await fileStorageService.saveFile({
      filename: finalFilename,
      blob,
      mimeType: mimeType || blob.type,
    });

    // Save entry to local Preferences history
    const record = {
      materialId,
      fileId: fileId || finalFilename,
      title: title || finalFilename,
      filename: savedInfo.filename,
      localPath: savedInfo.localPath,
      fileSize,
      mimeType: mimeType || blob.type,
    };

    await historyService.addRecord(record);

    if (onProgress) onProgress(100);

    return {
      success: true,
      record,
      savedInfo,
    };
  } catch (err) {
    console.error("[DOWNLOAD SERVICE] Download error:", err);
    if (typeof window !== "undefined" && !window.navigator.onLine) {
      throw new Error("No internet connection. Please check your network.");
    }
    if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
      throw new Error("Download timed out. Please try again.");
    }
    throw new Error(err.response?.data?.message || err.message || "Failed to download study material.");
  }
};

/**
 * Delete local copy of downloaded material
 */
export const deleteLocalMaterial = async (materialId, fileId, filename, localPath) => {
  try {
    await fileStorageService.deleteFile(localPath, filename);
    await historyService.removeRecord(materialId, fileId || filename);
    return true;
  } catch (err) {
    console.error("[DOWNLOAD SERVICE] Error deleting local material:", err);
    return false;
  }
};

export const downloadService = {
  downloadMaterialFile,
  deleteLocalMaterial,
};
