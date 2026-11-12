// スマートフォン内専用ストレージ管理 (IndexedDB + LocalStorage フォールバック)
// ユーザーに関するあらゆるデータ（人生の記憶［生年月日・性別・複数の喜怒哀楽エピソード］、対話履歴、覚悟の石コレクション）は
// 外部サーバーには一切保存せず、端末内だけで永続化する。

import {
  SavedResolutionStone,
  ActiveSession,
  AppSettings,
  UserLifeProfile,
} from "../types/zen";

const DB_NAME = "EnkakujiZenGardenDB";
const DB_VERSION = 1;
const STORE_STONES = "stones";
const STORE_STATE = "app_state";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not supported"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_STONES)) {
        db.createObjectStore(STORE_STONES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_STATE)) {
        db.createObjectStore(STORE_STATE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadStonesFromDevice(): Promise<SavedResolutionStone[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_STONES, "readonly");
      const store = tx.objectStore(STORE_STONES);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result as SavedResolutionStone[]) || [];
        list.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    const raw = localStorage.getItem("enkakuji_stones");
    return raw ? JSON.parse(raw) : [];
  }
}

export async function saveStoneToDevice(
  stone: SavedResolutionStone
): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_STONES, "readwrite");
      tx.objectStore(STORE_STONES).put(stone);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const current = await loadStonesFromDevice();
    const updated = [...current.filter((s) => s.id !== stone.id), stone];
    localStorage.setItem("enkakuji_stones", JSON.stringify(updated));
  }
}

export async function deleteStoneFromDevice(stoneId: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_STONES, "readwrite");
      tx.objectStore(STORE_STONES).delete(stoneId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const current = await loadStonesFromDevice();
    localStorage.setItem(
      "enkakuji_stones",
      JSON.stringify(current.filter((s) => s.id !== stoneId))
    );
  }
}

// ユーザーの「プロフィール・価値観・人生の記憶」の読み込み
export async function loadLifeProfileFromDevice(): Promise<UserLifeProfile> {
  const defaultProfile: UserLifeProfile = {
    birthDate: "",
    gender: "",
    lifeContext: "",
    currentResponsibilities: "",
    pastExperiences: "",
    coreValues: [],
    memories: [],
    updatedAt: new Date().toISOString(),
  };
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_STATE, "readonly");
      const req = tx.objectStore(STORE_STATE).get("lifeProfile");
      req.onsuccess = () => {
        if (req.result) {
          const loaded = req.result;
          resolve({
            ...defaultProfile,
            ...loaded,
            coreValues: Array.isArray(loaded.coreValues) ? loaded.coreValues : [],
          });
        } else {
          const raw = localStorage.getItem("enkakuji_life_profile");
          if (raw) {
            const parsed = JSON.parse(raw);
            resolve({
              ...defaultProfile,
              ...parsed,
              coreValues: Array.isArray(parsed.coreValues) ? parsed.coreValues : [],
            });
          } else {
            resolve(defaultProfile);
          }
        }
      };
      req.onerror = () => resolve(defaultProfile);
    });
  } catch {
    const raw = localStorage.getItem("enkakuji_life_profile");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaultProfile,
        ...parsed,
        coreValues: Array.isArray(parsed.coreValues) ? parsed.coreValues : [],
      };
    }
    return defaultProfile;
  }
}

// ユーザーの「人生の記憶」の保存
export async function saveLifeProfileToDevice(
  profile: UserLifeProfile
): Promise<void> {
  const updated: UserLifeProfile = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem("enkakuji_life_profile", JSON.stringify(updated));
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_STATE, "readwrite");
      tx.objectStore(STORE_STATE).put(updated, "lifeProfile");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // localStorage 側で保存済み
  }
}

export async function clearAllDeviceData(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_STONES, STORE_STATE], "readwrite");
      tx.objectStore(STORE_STONES).clear();
      tx.objectStore(STORE_STATE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
  localStorage.removeItem("enkakuji_stones");
  localStorage.removeItem("enkakuji_active_session");
  localStorage.removeItem("enkakuji_life_profile");
}

export async function saveActiveSessionToDevice(
  session: ActiveSession | null
): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_STATE, "readwrite");
      if (session) {
        tx.objectStore(STORE_STATE).put(session, "activeSession");
      } else {
        tx.objectStore(STORE_STATE).delete("activeSession");
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    if (session) {
      localStorage.setItem("enkakuji_active_session", JSON.stringify(session));
    } else {
      localStorage.removeItem("enkakuji_active_session");
    }
  }
}

export async function loadActiveSessionFromDevice(): Promise<ActiveSession | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_STATE, "readonly");
      const req = tx.objectStore(STORE_STATE).get("activeSession");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    const raw = localStorage.getItem("enkakuji_active_session");
    return raw ? JSON.parse(raw) : null;
  }
}

export function loadSettingsFromDevice(): AppSettings {
  const defaultSettings: AppSettings = {
    soundVolume: 0.85,
    defaultMeditationMinutes: 3,
    hapticFeedback: true,
  };
  try {
    const raw = localStorage.getItem("enkakuji_settings");
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw);
    return {
      soundVolume:
        typeof parsed.soundVolume === "number"
          ? parsed.soundVolume
          : defaultSettings.soundVolume,
      defaultMeditationMinutes:
        parsed.defaultMeditationMinutes === 3 ||
        parsed.defaultMeditationMinutes === 5 ||
        parsed.defaultMeditationMinutes === 10
          ? parsed.defaultMeditationMinutes
          : defaultSettings.defaultMeditationMinutes,
      hapticFeedback:
        typeof parsed.hapticFeedback === "boolean"
          ? parsed.hapticFeedback
          : defaultSettings.hapticFeedback,
    };
  } catch {
    return defaultSettings;
  }
}

export function saveSettingsToDevice(settings: AppSettings): void {
  localStorage.setItem("enkakuji_settings", JSON.stringify(settings));
}
