// spec.md 第6章・第7章に準拠した型定義

export type LightMood =
  | "amber_calm"
  | "moon_accept"
  | "ocean_deep"
  | "gold_resolute"
  | "sakura_compassion";

export type StoneColorTheme =
  | "emerald_glow"
  | "sapphire_zen"
  | "golden_resolve"
  | "lotus_warm";

export type StoneShapeType =
  | "round_pebble"
  | "standing_monolith"
  | "crystal_zen"
  | "moss_jewel";

export type SoundType = "rain" | "waves" | "forest" | "stream" | "silence";

export type SessionViewMode =
  | "GARDEN_HOME"
  | "INITIAL_ASSESSMENT"
  | "INQUIRY"
  | "PRAXIS_MEDITATION"
  | "STONE_MANIFESTATION";

export interface EmotionAssessment {
  ki: number;   // 喜 (0-10)
  do: number;   // 怒 (0-10)
  ai: number;   // 哀 (0-10)
  raku: number; // 楽 (0-10)
  initialConcern?: string;
}

export interface DialogueMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  phase?: 1 | 2 | 3;
  light_mood?: LightMood;
  target_wisdom_id?: string;
}

export interface PraxisOffer {
  praxis_id: string;
  praxis_name: string;
  guide_text: string;
  recommended_sound: SoundType;
  duration_min: number;
}

export interface ResolutionStoneData {
  stone_title: string;
  user_conclusion: string;
  wisdom_id: string;
  wisdom_name: string;
  discourse: {
    discourse_id: string;
    master_name: string;
    quote: string;
    source_title: string;
    source_url: string;
  };
  stone_visual: {
    color_theme: StoneColorTheme;
    glow_intensity: number;
    shape_type: StoneShapeType;
  };
}

export interface ZenAIResponse {
  response_type: "question" | "praxis_offer" | "resolution_stone";
  analysis: {
    estimated_suffering_id: string;
    current_phase: 1 | 2 | 3;
    target_wisdom_id: string;
    light_mood: LightMood;
  };
  message: string;
  praxis_offer?: PraxisOffer;
  resolution_stone?: ResolutionStoneData;
}

export interface SavedResolutionStone {
  id: string;
  createdAt: string;
  stone_title: string;
  user_conclusion: string;
  initial_concern: string;
  assessment: EmotionAssessment;
  wisdom_id: string;
  wisdom_name: string;
  discourse_id: string;
  quote: string;
  master_name: string;
  source_title: string;
  source_url: string;
  visual: {
    color_theme: StoneColorTheme;
    shape_type: StoneShapeType;
    glow_intensity: number;
    position: { x: number; y: number }; // 0.15 ~ 0.85 正規化座標
  };
  dialogue_digest: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface ActiveSession {
  sessionId: string;
  startedAt: string;
  assessment: EmotionAssessment;
  messages: DialogueMessage[];
  currentPhase: 1 | 2 | 3;
  currentLightMood: LightMood;
  estimatedSufferingId: string;
  targetWisdomId: string;
  activePraxisOffer?: PraxisOffer | null;
  pendingStone?: ResolutionStoneData | null;
}

export interface AppSettings {
  soundVolume: number;
  defaultMeditationMinutes: 3 | 5 | 10;
  hapticFeedback: boolean;
}
