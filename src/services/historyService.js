import { Preferences } from "@capacitor/preferences";

const HISTORY_STORAGE_KEY = "kc_download_history";

/**
 * Helper key generation for materialId + fileId/filename
 */
const makeKey = (materialId, fileId) => `${materialId}_${fileId}`;

/**
 * Fetch complete local download history records array from Capacitor Preferences
 */
export const getHistory = async () => {
  try {
    const { value } = await Preferences.get({ key: HISTORY_STORAGE_KEY });
    if (!value) return [];
    const history = JSON.parse(value);
    return Array.isArray(history) ? history : [];
  } catch (err) {
    console.error("[HISTORY SERVICE] Error loading history:", err);
    return [];
  }
};

/**
 * Save record to local download history
 */
export const addRecord = async (record) => {
  try {
    const current = await getHistory();
    const key = makeKey(record.materialId, record.fileId || record.filename);

    const updated = current.filter(
      (item) => makeKey(item.materialId, item.fileId || item.filename) !== key
    );

    updated.unshift({
      ...record,
      downloadedAt: new Date().toISOString(),
    });

    await Preferences.set({
      key: HISTORY_STORAGE_KEY,
      value: JSON.stringify(updated),
    });
    return updated;
  } catch (err) {
    console.error("[HISTORY SERVICE] Error adding history record:", err);
    return [];
  }
};

/**
 * Remove record from local download history
 */
export const removeRecord = async (materialId, fileId) => {
  try {
    const current = await getHistory();
    const targetKey = makeKey(materialId, fileId);

    const updated = current.filter(
      (item) => makeKey(item.materialId, item.fileId || item.filename) !== targetKey
    );

    await Preferences.set({
      key: HISTORY_STORAGE_KEY,
      value: JSON.stringify(updated),
    });
    return updated;
  } catch (err) {
    console.error("[HISTORY SERVICE] Error removing history record:", err);
    return [];
  }
};

/**
 * Check if a file is already downloaded locally
 */
export const isDownloaded = async (materialId, fileId) => {
  try {
    const history = await getHistory();
    const targetKey = makeKey(materialId, fileId);
    return history.some(
      (item) => makeKey(item.materialId, item.fileId || item.filename) === targetKey
    );
  } catch (err) {
    return false;
  }
};

/**
 * Retrieve specific downloaded file record
 */
export const getRecord = async (materialId, fileId) => {
  try {
    const history = await getHistory();
    const targetKey = makeKey(materialId, fileId);
    return (
      history.find(
        (item) => makeKey(item.materialId, item.fileId || item.filename) === targetKey
      ) || null
    );
  } catch (err) {
    return null;
  }
};

/**
 * Clear all download history records
 */
export const clearHistory = async () => {
  try {
    await Preferences.remove({ key: HISTORY_STORAGE_KEY });
  } catch (err) {
    console.error("[HISTORY SERVICE] Error clearing history:", err);
  }
};

export const historyService = {
  getHistory,
  addRecord,
  removeRecord,
  isDownloaded,
  getRecord,
  clearHistory,
};
