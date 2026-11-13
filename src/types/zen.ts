// spec.md Version 2.1（人生の記憶・喜怒哀楽エピソード群対応）に準拠した型定義

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

export type SoundType = "rain" | "waves" | "forest" | "stream" | "bell" | "silence";

export type EmotionCategory = "ki" | "do" | "ai" | "raku"; // 喜・怒・哀・楽

export type SessionViewMode =
  | "GARDEN_HOME"
  | "INITIAL_ASSESSMENT"
  | "INQUIRY"
  | "PRAXIS_MEDITATION"
  | "STONE_MANIFESTATION";

// ユーザーが5個でも10個でも蓄積できる「喜・怒・哀・楽の記憶」1件分のデータ
export interface LifeMemoryItem {
  id: string;
  emotion: EmotionCategory; // 喜(ki) / 怒(do) / 哀(ai) / 楽(raku)
  period?: string;          // 時期・年齢の目安（任意：例「20代の頃」「昨年」「子供の頃」）
  content: string;          // 具体的な経験・エピソード内容
  createdAt: string;
}

// スマートフォン内に永続保存されるユーザーの「プロフィール・価値観・人生の記憶」
export interface UserLifeProfile {
  birthDate?: string;       // 生年月日または年代（任意）
  gender?: string;          // 性別（任意）
  lifeContext?: string;     // 現在の立場・役割（任意）
  currentResponsibilities?: string; // 抱えている責任や向き合っていること（任意自由記述）
  pastExperiences?: string; // 心に残る経験や転機（任意自由記述）
  coreValues: string[];     // 選択された2つの価値観（18枚から直感で2つ選択）
  memories: LifeMemoryItem[]; // 喜怒哀楽の記憶リスト（複数可）
  updatedAt: string;
}

// 各禅問答セッション開始時の入力情報（後方互換フィールドを含む）
export interface EmotionAssessment {
  initialConcern?: string;  // 今回の禅問答で見つめたいこと・今の悩み
  lifeProfileSnapshot?: UserLifeProfile; // セッション時点の人生の記憶スナップショット
  // 後方互換用（過去の石データ表示用）
  ki?: number;
  do?: number;
  ai?: number;
  raku?: number;
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

export type DialogueMode = "coaching" | "zen_shift" | "closing";

export interface ZenAIResponse {
  response_type: "question" | "praxis_offer" | "resolution_stone";
  analysis: {
    dialogue_mode?: DialogueMode;
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
    position: { x: number; y: number };
  };
  dialogue_digest: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface ActiveSession {
  sessionId: string;
  startedAt: string;
  assessment: EmotionAssessment;
  messages: DialogueMessage[];
  currentPhase: 1 | 2 | 3;
  dialogueMode?: DialogueMode;
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
