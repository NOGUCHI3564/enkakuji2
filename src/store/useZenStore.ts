// Zustand アプリ状態管理ストア (spec.md 第8章・第9章に準拠)
// 直近5〜10往復の対話記憶の保持、3フェーズ進行、覚悟の石の永続化を一元管理する。

import { create } from "zustand";
import {
  SessionViewMode,
  EmotionAssessment,
  DialogueMessage,
  SavedResolutionStone,
  ActiveSession,
  AppSettings,
  LightMood,
  SoundType,
} from "../types/zen";
import {
  loadStonesFromDevice,
  saveStoneToDevice,
  deleteStoneFromDevice,
  clearAllDeviceData,
  loadActiveSessionFromDevice,
  saveActiveSessionToDevice,
  loadSettingsFromDevice,
  saveSettingsToDevice,
} from "../services/localDb";
import { requestZenDialogue } from "../services/zenAiService";
import { soundEngine } from "../services/soundEngine";

interface ZenGardenStore {
  viewMode: SessionViewMode;
  stones: SavedResolutionStone[];
  selectedStone: SavedResolutionStone | null;
  activeSession: ActiveSession | null;
  settings: AppSettings;
  isLoadingAI: boolean;
  ambientSound: SoundType;
  meditationSecondsLeft: number;
  meditationTotalSeconds: number;
  isMeditationPlaying: boolean;
  NewlyManifestedStone: SavedResolutionStone | null;
  rippleTrigger: number; // 光の波紋エフェクトを発生させるカウンタ

  // Actions
  initializeApp: () => Promise<void>;
  setViewMode: (mode: SessionViewMode) => void;
  selectStone: (stone: SavedResolutionStone | null) => void;
  startNewAssessment: () => void;
  beginInquirySession: (assessment: EmotionAssessment) => Promise<void>;
  sendUserReply: (text: string) => Promise<void>;
  requestConclusionStone: () => Promise<void>;
  startMeditation: (sound: SoundType, minutes: number) => void;
  tickMeditation: () => void;
  finishMeditation: () => void;
  dismissPraxisOfferAndContinue: () => void;
  completeStoneManifestation: () => void;
  removeStone: (id: string) => Promise<void>;
  resetAllLocalData: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => void;
  triggerRipple: () => void;
}

// 庭の中で石が重ならない美しい配置座標を計算する
function calculateStoneGardenPosition(index: number): { x: number; y: number } {
  const goldenAngle = 2.399963229728653; // 黄金角
  const radius = Math.min(0.32, 0.11 + Math.sqrt(index) * 0.068);
  const angle = index * goldenAngle + 0.6;
  const x = 0.5 + Math.cos(angle) * radius * 1.15;
  const y = 0.58 + Math.sin(angle) * radius * 0.58; // 庭の中央〜下部の水辺・苔庭エリア
  return {
    x: Math.max(0.16, Math.min(0.84, x)),
    y: Math.max(0.36, Math.min(0.78, y)),
  };
}

export const useZenStore = create<ZenGardenStore>((set, get) => ({
  viewMode: "GARDEN_HOME",
  stones: [],
  selectedStone: null,
  activeSession: null,
  settings: loadSettingsFromDevice(),
  isLoadingAI: false,
  ambientSound: "silence",
  meditationSecondsLeft: 180,
  meditationTotalSeconds: 180,
  isMeditationPlaying: false,
  NewlyManifestedStone: null,
  rippleTrigger: 0,

  initializeApp: async () => {
    const [savedStones, savedSession] = await Promise.all([
      loadStonesFromDevice(),
      loadActiveSessionFromDevice(),
    ]);
    const settings = loadSettingsFromDevice();
    soundEngine.setVolume(settings.soundVolume);

    set({
      stones: savedStones,
      activeSession: savedSession,
      settings,
    });
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  selectStone: (stone) => {
    if (stone) {
      soundEngine.playWaterDrop(1.25);
    }
    set({ selectedStone: stone });
  },

  triggerRipple: () => set((s) => ({ rippleTrigger: s.rippleTrigger + 1 })),

  startNewAssessment: () => {
    soundEngine.playWaterDrop(1.0);
    set({
      viewMode: "INITIAL_ASSESSMENT",
      selectedStone: null,
      NewlyManifestedStone: null,
    });
  },

  beginInquirySession: async (assessment) => {
    const { settings } = get();
    soundEngine.playWaterDrop(1.1);

    const newSession: ActiveSession = {
      sessionId: `zen_${Date.now()}`,
      startedAt: new Date().toISOString(),
      assessment,
      messages: [],
      currentPhase: 1,
      currentLightMood: "amber_calm",
      estimatedSufferingId: "Suf_Anxiety",
      targetWisdomId: "Wis_UnbornMind",
      activePraxisOffer: null,
      pendingStone: null,
    };

    // 初期の自由記述がある場合は最初のユーザー発言として履歴に記録
    if (assessment.initialConcern && assessment.initialConcern.trim().length > 0) {
      newSession.messages.push({
        id: `msg_${Date.now()}_u0`,
        role: "user",
        content: assessment.initialConcern.trim(),
        timestamp: new Date().toISOString(),
        phase: 1,
      });
    }

    set({
      activeSession: newSession,
      viewMode: "INQUIRY",
      isLoadingAI: true,
      rippleTrigger: get().rippleTrigger + 1,
    });

    const aiRes = await requestZenDialogue(assessment, newSession.messages, false, settings);

    const assistantMsg: DialogueMessage = {
      id: `msg_${Date.now()}_a1`,
      role: "assistant",
      content: aiRes.message,
      timestamp: new Date().toISOString(),
      phase: aiRes.analysis.current_phase,
      light_mood: aiRes.analysis.light_mood,
      target_wisdom_id: aiRes.analysis.target_wisdom_id,
    };

    const updatedSession: ActiveSession = {
      ...newSession,
      messages: [...newSession.messages, assistantMsg],
      currentPhase: aiRes.analysis.current_phase,
      currentLightMood: aiRes.analysis.light_mood,
      estimatedSufferingId: aiRes.analysis.estimated_suffering_id,
      targetWisdomId: aiRes.analysis.target_wisdom_id,
    };

    await saveActiveSessionToDevice(updatedSession);
    soundEngine.playWaterDrop(0.95);

    set({
      activeSession: updatedSession,
      isLoadingAI: false,
      rippleTrigger: get().rippleTrigger + 1,
    });
  },

  sendUserReply: async (text) => {
    const { activeSession, settings, stones } = get();
    if (!activeSession || !text.trim()) return;

    soundEngine.playWaterDrop(1.05);

    const userMsg: DialogueMessage = {
      id: `msg_${Date.now()}_u`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
      phase: activeSession.currentPhase,
    };

    const nextMessages = [...activeSession.messages, userMsg];
    const interimSession: ActiveSession = {
      ...activeSession,
      messages: nextMessages,
      activePraxisOffer: null,
    };

    set({
      activeSession: interimSession,
      isLoadingAI: true,
      rippleTrigger: get().rippleTrigger + 1,
    });

    const aiRes = await requestZenDialogue(
      activeSession.assessment,
      nextMessages,
      false,
      settings
    );

    const assistantMsg: DialogueMessage = {
      id: `msg_${Date.now()}_a`,
      role: "assistant",
      content: aiRes.message,
      timestamp: new Date().toISOString(),
      phase: aiRes.analysis.current_phase,
      light_mood: aiRes.analysis.light_mood,
      target_wisdom_id: aiRes.analysis.target_wisdom_id,
    };

    const updatedMessages = [...nextMessages, assistantMsg];

    // もし Gemini が「覚悟の石 (resolution_stone)」を返した場合、石を生成してクライマックス画面へ移行
    if (aiRes.response_type === "resolution_stone" && aiRes.resolution_stone) {
      const stoneData = aiRes.resolution_stone;
      const newStone: SavedResolutionStone = {
        id: `stone_${Date.now()}`,
        createdAt: new Date().toISOString(),
        stone_title: stoneData.stone_title,
        user_conclusion: stoneData.user_conclusion,
        initial_concern: activeSession.assessment.initialConcern || "静かな自己省察",
        assessment: activeSession.assessment,
        wisdom_id: stoneData.wisdom_id,
        wisdom_name: stoneData.wisdom_name,
        discourse_id: stoneData.discourse.discourse_id,
        quote: stoneData.discourse.quote,
        master_name: stoneData.discourse.master_name,
        source_title: stoneData.discourse.source_title,
        source_url: stoneData.discourse.source_url,
        visual: {
          color_theme: stoneData.stone_visual.color_theme,
          shape_type: stoneData.stone_visual.shape_type,
          glow_intensity: stoneData.stone_visual.glow_intensity || 0.95,
          position: calculateStoneGardenPosition(stones.length),
        },
        dialogue_digest: updatedMessages.slice(-20).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };

      await saveStoneToDevice(newStone);
      await saveActiveSessionToDevice(null);
      soundEngine.playStoneManifestationBell();

      set({
        stones: [...stones, newStone],
        NewlyManifestedStone: newStone,
        activeSession: null,
        isLoadingAI: false,
        viewMode: "STONE_MANIFESTATION",
        rippleTrigger: get().rippleTrigger + 1,
      });
      return;
    }

    const updatedSession: ActiveSession = {
      ...interimSession,
      messages: updatedMessages,
      currentPhase: aiRes.analysis.current_phase,
      currentLightMood: aiRes.analysis.light_mood,
      estimatedSufferingId: aiRes.analysis.estimated_suffering_id,
      targetWisdomId: aiRes.analysis.target_wisdom_id,
      activePraxisOffer: aiRes.response_type === "praxis_offer" ? aiRes.praxis_offer || null : null,
    };

    await saveActiveSessionToDevice(updatedSession);
    soundEngine.playWaterDrop(0.92);

    set({
      activeSession: updatedSession,
      isLoadingAI: false,
      rippleTrigger: get().rippleTrigger + 1,
    });
  },

  requestConclusionStone: async () => {
    const { activeSession, settings, stones } = get();
    if (!activeSession) return;

    set({ isLoadingAI: true, rippleTrigger: get().rippleTrigger + 1 });

    const aiRes = await requestZenDialogue(
      activeSession.assessment,
      activeSession.messages,
      true,
      settings
    );

    const stoneData = aiRes.resolution_stone || {
      stone_title: "不生の仏心・覚悟の石",
      user_conclusion:
        "迷いや葛藤の中にあっても、作為を手放し、今この足元の一歩から自らの道を歩む覚悟が結ばれました。",
      wisdom_id: "Wis_RealJoyInPain",
      wisdom_name: "苦中の真楽・道は吾である（主体的覚悟）",
      discourse: {
        discourse_id: "Dis_Asahina_Kakugo",
        master_name: "朝比奈宗源",
        quote:
          "静中の静は真静に非ず、苦中の楽こそ真の楽。道は吾である。どのような逆境にあっても環境を呪わず、自らが人生の責任を引き受けて立ち上がるのだ。",
        source_title: "『覚悟はよいか』『朝比奈宗源老師の獅子吼』",
        source_url: "https://www.engakuji.or.jp/blog/39003/",
      },
      stone_visual: {
        color_theme: "golden_resolve" as const,
        glow_intensity: 0.96,
        shape_type: "crystal_zen" as const,
      },
    };

    const newStone: SavedResolutionStone = {
      id: `stone_${Date.now()}`,
      createdAt: new Date().toISOString(),
      stone_title: stoneData.stone_title,
      user_conclusion: stoneData.user_conclusion,
      initial_concern: activeSession.assessment.initialConcern || "静かな自己省察",
      assessment: activeSession.assessment,
      wisdom_id: stoneData.wisdom_id,
      wisdom_name: stoneData.wisdom_name,
      discourse_id: stoneData.discourse.discourse_id,
      quote: stoneData.discourse.quote,
      master_name: stoneData.discourse.master_name,
      source_title: stoneData.discourse.source_title,
      source_url: stoneData.discourse.source_url,
      visual: {
        color_theme: stoneData.stone_visual.color_theme,
        shape_type: stoneData.stone_visual.shape_type,
        glow_intensity: stoneData.stone_visual.glow_intensity || 0.95,
        position: calculateStoneGardenPosition(stones.length),
      },
      dialogue_digest: activeSession.messages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    await saveStoneToDevice(newStone);
    await saveActiveSessionToDevice(null);
    soundEngine.playStoneManifestationBell();

    set({
      stones: [...stones, newStone],
      NewlyManifestedStone: newStone,
      activeSession: null,
      isLoadingAI: false,
      viewMode: "STONE_MANIFESTATION",
      rippleTrigger: get().rippleTrigger + 1,
    });
  },

  startMeditation: (sound, minutes) => {
    const totalSec = minutes * 60;
    soundEngine.startAmbientSound(sound);
    set({
      viewMode: "PRAXIS_MEDITATION",
      ambientSound: sound,
      meditationSecondsLeft: totalSec,
      meditationTotalSeconds: totalSec,
      isMeditationPlaying: true,
    });
  },

  tickMeditation: () => {
    const { meditationSecondsLeft, isMeditationPlaying } = get();
    if (!isMeditationPlaying) return;
    if (meditationSecondsLeft <= 1) {
      soundEngine.stopAmbientSound();
      soundEngine.playStoneManifestationBell();
      set({
        meditationSecondsLeft: 0,
        isMeditationPlaying: false,
      });
    } else {
      set({ meditationSecondsLeft: meditationSecondsLeft - 1 });
    }
  },

  finishMeditation: () => {
    soundEngine.stopAmbientSound();
    const { activeSession } = get();
    if (activeSession) {
      const updated: ActiveSession = {
        ...activeSession,
        activePraxisOffer: null,
      };
      saveActiveSessionToDevice(updated);
      set({
        activeSession: updated,
        isMeditationPlaying: false,
        ambientSound: "silence",
        viewMode: "INQUIRY",
      });
    } else {
      set({
        isMeditationPlaying: false,
        ambientSound: "silence",
        viewMode: "GARDEN_HOME",
      });
    }
  },

  dismissPraxisOfferAndContinue: () => {
    const { activeSession } = get();
    if (!activeSession) return;
    const updated: ActiveSession = {
      ...activeSession,
      activePraxisOffer: null,
    };
    saveActiveSessionToDevice(updated);
    set({ activeSession: updated });
  },

  completeStoneManifestation: () => {
    soundEngine.playWaterDrop(1.15);
    set({
      viewMode: "GARDEN_HOME",
      NewlyManifestedStone: null,
    });
  },

  removeStone: async (id) => {
    await deleteStoneFromDevice(id);
    set((s) => ({
      stones: s.stones.filter((st) => st.id !== id),
      selectedStone: s.selectedStone?.id === id ? null : s.selectedStone,
    }));
  },

  resetAllLocalData: async () => {
    await clearAllDeviceData();
    set({
      stones: [],
      selectedStone: null,
      activeSession: null,
      NewlyManifestedStone: null,
      viewMode: "GARDEN_HOME",
    });
  },

  updateSettings: (partial) => {
    const next = { ...get().settings, ...partial };
    saveSettingsToDevice(next);
    soundEngine.setVolume(next.soundVolume);
    set({ settings: next });
  },
}));
