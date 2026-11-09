// 「人生の記憶（Life Memories）」対話型入力モーダルコンポーネント
// アンケート用紙のような機械的入力ではなく、禅僧との対話のように自由な文章（またはスマホ標準キーボードの音声入力）で
// これまでの人生の歩み（生年月日・性別・立場や、喜・怒・哀・楽の出来事）を語ると、
// Supabase Edge Function (Gemini Flash 3.8) がそれを整理・リスト化し、スマホ内に保存する。

import React, { useState } from "react";
import {
  UserLifeProfile,
  LifeMemoryItem,
  EmotionCategory,
} from "../types/zen";
import { organizeLifeMemoriesWithAI } from "../services/zenAiService";
import { soundEngine } from "../services/soundEngine";
import {
  X,
  BookHeart,
  Send,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface LifeMemoriesModalProps {
  profile: UserLifeProfile;
  onSaveProfile: (profile: UserLifeProfile) => void;
  onClose: () => void;
}

const EMOTION_META: Record<
  EmotionCategory,
  {
    kanji: string;
    reading: string;
    badgeClass: string;
    borderClass: string;
  }
> = {
  ki: {
    kanji: "喜",
    reading: "よろこび",
    badgeClass: "bg-amber-500/20 text-amber-200 border-amber-400/40",
    borderClass: "border-amber-400/30",
  },
  do: {
    kanji: "怒",
    reading: "いかり",
    badgeClass: "bg-rose-500/20 text-rose-200 border-rose-400/40",
    borderClass: "border-rose-400/30",
  },
  ai: {
    kanji: "哀",
    reading: "かなしみ",
    badgeClass: "bg-sky-500/20 text-sky-200 border-sky-400/40",
    borderClass: "border-sky-400/30",
  },
  raku: {
    kanji: "楽",
    reading: "たのしみ",
    badgeClass: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
    borderClass: "border-emerald-400/30",
  },
};

const TOPIC_HINTS = [
  "嬉しかった・報われた記憶（喜）",
  "許せなかった・悔しかった記憶（怒）",
  "別れや深く悲しかった記憶（哀）",
  "心が安らぐ・夢中になれること（楽）",
  "生まれ年・性別・今のお仕事など（任意）",
];

export const LifeMemoriesModal: React.FC<LifeMemoriesModalProps> = ({
  profile,
  onSaveProfile,
  onClose,
}) => {
  const [currentProfile, setCurrentProfile] = useState<UserLifeProfile>(profile);
  const [narrativeText, setNarrativeText] = useState("");
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [monkMessage, setMonkMessage] = useState(
    "あなたのこれまでの歩みや、心に残っている「喜・怒・哀・楽」の出来事を、思い浮かぶまま自由にお聞かせください。順不同で構いません。お話しいただいた内容を整理し、あなたの記憶の目録としてこの端末内に書き留めます。"
  );
  const [nextPrompt, setNextPrompt] = useState(
    "文字入力のほか、スマートフォンのキーボードにある音声入力を使って、話すようにそのまま入力していただいても大丈夫です。"
  );
  const [filterEmotion, setFilterEmotion] = useState<EmotionCategory | "all">(
    "all"
  );
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  // 語られたテキストを Supabase Edge Function に送って整理・リスト化し、スマホ内に保存
  const handleOrganizeAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!narrativeText.trim() || isOrganizing) return;

    setIsOrganizing(true);
    soundEngine.playWaterDrop(1.05);

    const rawToProcess = narrativeText.trim();
    const result = await organizeLifeMemoriesWithAI(rawToProcess, currentProfile);

    const newMemoryItems: LifeMemoryItem[] = (
      result.extracted_memories || []
    ).map((m, idx) => ({
      id: `mem_${Date.now()}_${idx}`,
      emotion:
        m.emotion === "ki" ||
        m.emotion === "do" ||
        m.emotion === "ai" ||
        m.emotion === "raku"
          ? m.emotion
          : "ki",
      period: m.period || undefined,
      content: m.content,
      createdAt: new Date().toISOString(),
    }));

    const updatedProfile: UserLifeProfile = {
      birthDate:
        result.extracted_profile?.birthDate || currentProfile.birthDate || "",
      gender: result.extracted_profile?.gender || currentProfile.gender || "",
      lifeContext:
        result.extracted_profile?.lifeContext ||
        currentProfile.lifeContext ||
        "",
      memories: [...newMemoryItems, ...(currentProfile.memories || [])],
      updatedAt: new Date().toISOString(),
    };

    setCurrentProfile(updatedProfile);
    onSaveProfile(updatedProfile);
    setNarrativeText("");
    setMonkMessage(result.reply_message);
    setNextPrompt(result.next_prompt);
    setIsOrganizing(false);
    soundEngine.playWaterDrop(0.95);
  };

  const handleDeleteMemory = (id: string) => {
    const updated: UserLifeProfile = {
      ...currentProfile,
      memories: currentProfile.memories.filter((m) => m.id !== id),
      updatedAt: new Date().toISOString(),
    };
    setCurrentProfile(updated);
    onSaveProfile(updated);
  };

  const handleManualProfileChange = (
    field: "birthDate" | "gender" | "lifeContext",
    value: string
  ) => {
    const updated: UserLifeProfile = {
      ...currentProfile,
      [field]: value,
      updatedAt: new Date().toISOString(),
    };
    setCurrentProfile(updated);
    onSaveProfile(updated);
  };

  const filteredMemories =
    filterEmotion === "all"
      ? currentProfile.memories
      : currentProfile.memories.filter((m) => m.emotion === filterEmotion);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-amber-200/25 bg-[#0b1220]/95 p-5 sm:p-7 text-slate-100 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-100 hover:bg-white/10 transition"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ヘッダー */}
        <div className="mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] bg-amber-500/15 text-amber-300 border border-amber-400/30 font-serif mb-1.5">
            <BookHeart className="w-3.5 h-3.5" />
            禅問答の参照プロフィール（スマホ内のみ保存）
          </span>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-amber-50 tracking-wider">
            人生の記憶 — 喜・怒・哀・楽を語る —
          </h2>
        </div>

        {/* 1. AI聞き手（禅僧）からの対話メッセージと語りかけ促し */}
        <div className="rounded-2xl bg-slate-900/90 border border-amber-300/25 p-4 mb-4 space-y-2 shadow-inner">
          <p className="font-serif text-xs sm:text-sm text-amber-50 leading-relaxed">
            「{monkMessage}」
          </p>
          <p className="text-[11px] text-amber-200/80 font-serif">
            ◆ {nextPrompt}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {TOPIC_HINTS.map((hint, i) => (
              <span
                key={i}
                className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10"
              >
                {hint}
              </span>
            ))}
          </div>
        </div>

        {/* 2. 自由語りテキストエリア（スマホキーボードの音声入力・テキスト入力両対応） */}
        <form onSubmit={handleOrganizeAndSave} className="space-y-3 mb-6">
          <div className="relative rounded-2xl bg-slate-950/90 border border-white/15 p-3.5 focus-within:border-amber-400/60 transition">
            <textarea
              rows={4}
              value={narrativeText}
              onChange={(e) => setNarrativeText(e.target.value)}
              disabled={isOrganizing}
              placeholder="例：「私は1975年生まれの男性です。30代の頃に独立して仕事が軌道に乗ったときは本当に嬉しかった。でも3年前に父を亡くしたときは深い悲しみがありました。休日に森や海を歩くのが一番の楽しみです…」のように、思い浮かぶまま自由に入力してください。"
              className="w-full bg-transparent text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed"
            />

            <div className="flex items-center justify-end pt-2 border-t border-white/10">
              <button
                type="submit"
                disabled={!narrativeText.trim() || isOrganizing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-slate-950 font-serif font-bold text-xs sm:text-sm shadow-md transition"
              >
                {isOrganizing ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                    <span>AIが記憶を整理してリスト化しています…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>語られた記憶を整理して保存する</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* 3. 自動抽出されたプロフィール（生年月日・性別・現在の歩み）の表示＆微調整 */}
        <div className="rounded-2xl bg-slate-900/75 border border-white/10 p-3.5 mb-5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-serif text-amber-200 flex flex-wrap items-center gap-2">
              <span>◆ プロフィール:</span>
              <span className="text-slate-200 font-sans">
                {[
                  currentProfile.birthDate &&
                    `生年/年代: ${currentProfile.birthDate}`,
                  currentProfile.gender && `性別: ${currentProfile.gender}`,
                  currentProfile.lifeContext &&
                    `歩み: ${currentProfile.lifeContext}`,
                ]
                  .filter(Boolean)
                  .join(" ／ ") || "（未設定・語られた内容から自動抽出されます）"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowProfileEdit((p) => !p)}
              className="text-[11px] text-slate-400 hover:text-amber-200 flex items-center gap-1 flex-shrink-0"
            >
              <span>編集</span>
              {showProfileEdit ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {showProfileEdit && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-white/10">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  生年月日・年代（任意）
                </label>
                <input
                  type="text"
                  value={currentProfile.birthDate || ""}
                  onChange={(e) =>
                    handleManualProfileChange("birthDate", e.target.value)
                  }
                  placeholder="例：1975年生まれ"
                  className="w-full rounded-lg bg-slate-950 border border-white/10 px-2.5 py-1.5 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  性別（任意）
                </label>
                <input
                  type="text"
                  value={currentProfile.gender || ""}
                  onChange={(e) =>
                    handleManualProfileChange("gender", e.target.value)
                  }
                  placeholder="例：男性 / 女性"
                  className="w-full rounded-lg bg-slate-950 border border-white/10 px-2.5 py-1.5 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  現在の立場・暮らし（任意）
                </label>
                <input
                  type="text"
                  value={currentProfile.lifeContext || ""}
                  onChange={(e) =>
                    handleManualProfileChange("lifeContext", e.target.value)
                  }
                  placeholder="例：会社経営・子育て中"
                  className="w-full rounded-lg bg-slate-950 border border-white/10 px-2.5 py-1.5 text-xs text-slate-100"
                />
              </div>
            </div>
          )}
        </div>

        {/* 4. 整理・リスト化された「喜・怒・哀・楽の記憶」カード一覧 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-serif text-amber-100">
              ◆ 整理された「喜・怒・哀・楽」の記憶リスト（
              {filteredMemories.length}件）
            </span>
            <div className="flex items-center gap-1">
              {(["all", "ki", "do", "ai", "raku"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterEmotion(f)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-serif transition ${
                    filterEmotion === f
                      ? "bg-amber-500/25 text-amber-200 border border-amber-400/40"
                      : "bg-white/5 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {f === "all" ? "すべて" : EMOTION_META[f].kanji}
                </button>
              ))}
            </div>
          </div>

          {filteredMemories.length === 0 ? (
            <div className="rounded-2xl bg-slate-950/60 border border-white/5 p-6 text-center text-xs text-slate-400 font-serif leading-relaxed">
              まだ記憶が記録されていません。上の入力欄にあなたのこれまでの出来事や思い出を自由に入力して「語られた記憶を整理して保存する」を押してください。
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {filteredMemories.map((item) => {
                const meta = EMOTION_META[item.emotion] || EMOTION_META.ki;
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl bg-slate-950/85 border ${meta.borderClass} p-3.5 flex items-start justify-between gap-3 animate-fadeIn`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[11px] font-serif font-semibold ${meta.badgeClass}`}
                        >
                          {meta.kanji}（{meta.reading}）
                        </span>
                        {item.period && (
                          <span className="text-[11px] text-slate-400 font-serif">
                            時期：{item.period}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMemory(item.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="この記憶を削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-100 font-serif text-xs sm:text-sm tracking-wider flex items-center justify-center gap-2 transition"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>心庭へ戻る</span>
          </button>
        </div>
      </div>
    </div>
  );
};
