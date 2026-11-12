// 「人生の記憶（Life Memories）」直感的・シンプル入力モーダル
// 細かい説明文を極力省き、大きな文字と直感的なUIでパッと見てすぐ入力・確認できるデザイン。

import React, { useState } from "react";
import {
  UserLifeProfile,
  LifeMemoryItem,
  EmotionCategory,
} from "../types/zen";
import { organizeLifeMemoriesWithAI } from "../services/zenAiService";
import { soundEngine } from "../services/soundEngine";
import { X, Send, Trash2, Sparkles, UserCheck, ShieldCheck } from "lucide-react";

interface LifeMemoriesModalProps {
  profile: UserLifeProfile;
  onSaveProfile: (profile: UserLifeProfile) => void;
  onClose: () => void;
}

const EMOTION_META: Record<
  EmotionCategory,
  {
    kanji: string;
    label: string;
    badgeClass: string;
    borderClass: string;
  }
> = {
  ki: {
    kanji: "喜",
    label: "嬉しかった",
    badgeClass: "bg-amber-500/25 text-amber-200 border-amber-400/50",
    borderClass: "border-amber-400/35",
  },
  do: {
    kanji: "怒",
    label: "悔しかった",
    badgeClass: "bg-rose-500/25 text-rose-200 border-rose-400/50",
    borderClass: "border-rose-400/35",
  },
  ai: {
    kanji: "哀",
    label: "悲しかった",
    badgeClass: "bg-sky-500/25 text-sky-200 border-sky-400/50",
    borderClass: "border-sky-400/35",
  },
  raku: {
    kanji: "楽",
    label: "楽しかった",
    badgeClass: "bg-emerald-500/25 text-emerald-200 border-emerald-400/50",
    borderClass: "border-emerald-400/35",
  },
};

export const LifeMemoriesModal: React.FC<LifeMemoriesModalProps> = ({
  profile,
  onSaveProfile,
  onClose,
}) => {
  const [currentProfile, setCurrentProfile] = useState<UserLifeProfile>(profile);
  const [narrativeText, setNarrativeText] = useState("");
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [filterEmotion, setFilterEmotion] = useState<EmotionCategory | "all">(
    "all"
  );
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  // 語られたテキストをAIで整理してスマホ内に保存
  const handleOrganizeAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!narrativeText.trim() || isOrganizing) return;

    setIsOrganizing(true);
    setFeedbackMsg(null);
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
      ...currentProfile,
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
    setFeedbackMsg(
      newMemoryItems.length > 0
        ? `${newMemoryItems.length}件の記憶を記録しました`
        : "プロフィールを更新しました"
    );
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

  const profileSummary = [
    currentProfile.birthDate,
    currentProfile.gender,
    currentProfile.lifeContext,
  ]
    .filter(Boolean)
    .join(" ・ ");

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-amber-200/25 bg-[#0b1220] p-5 sm:p-7 text-slate-100 shadow-2xl">
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-white/10 transition"
          aria-label="閉じる"
        >
          <X className="w-6 h-6" />
        </button>

        {/* タイトル（大きくシンプルに） */}
        <div className="mb-5 pr-10">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-amber-50 tracking-wider">
              人生の記憶
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-xs text-emerald-200 font-serif">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              このスマホ内のみ保存
            </span>
          </div>
          <p className="font-serif text-sm sm:text-base text-amber-200/90 mt-1">
            これまでの「喜・怒・哀・楽」やプロフィールを自由に書いてください
          </p>
        </div>

        {/* 1. 大きな入力ボックス + 保存ボタン */}
        <form onSubmit={handleOrganizeAndSave} className="mb-6">
          <div className="rounded-2xl bg-slate-950 border border-amber-300/30 p-4 focus-within:border-amber-400 transition shadow-inner">
            <textarea
              rows={4}
              value={narrativeText}
              onChange={(e) => setNarrativeText(e.target.value)}
              disabled={isOrganizing}
              placeholder="例：1975年生まれ。30代で独立した時は本当に嬉しかった。3年前に父を亡くした時は悲しかった。休日に自然を歩くのが一番楽しい。"
              className="w-full bg-transparent text-base sm:text-lg text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed"
            />

            <button
              type="submit"
              disabled={!narrativeText.trim() || isOrganizing}
              className="w-full mt-3 py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-serif font-bold text-base tracking-wider shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.99]"
            >
              {isOrganizing ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                  <span>AIが整理しています…</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>記録する（AIで自動整理）</span>
                </>
              )}
            </button>
          </div>

          {feedbackMsg && (
            <p className="mt-2.5 text-center font-serif text-sm text-amber-300 animate-fadeIn">
              ✓ {feedbackMsg}
            </p>
          )}
        </form>

        {/* 2. 基本プロフィール（1行でスッキリ表示・タップで編集） */}
        <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-3.5 mb-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm sm:text-base text-slate-200">
              <UserCheck className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <span className="truncate">
                {profileSummary || "生年・性別・立場（任意）"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowProfileEdit((p) => !p)}
              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs sm:text-sm text-amber-200 font-serif flex-shrink-0 transition"
            >
              {showProfileEdit ? "閉じる" : "入力"}
            </button>
          </div>

          {showProfileEdit && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-white/10">
              <input
                type="text"
                value={currentProfile.birthDate || ""}
                onChange={(e) =>
                  handleManualProfileChange("birthDate", e.target.value)
                }
                placeholder="生まれ年・年代"
                className="w-full rounded-xl bg-slate-950 border border-white/15 px-3 py-2 text-sm text-slate-100"
              />
              <input
                type="text"
                value={currentProfile.gender || ""}
                onChange={(e) =>
                  handleManualProfileChange("gender", e.target.value)
                }
                placeholder="性別"
                className="w-full rounded-xl bg-slate-950 border border-white/15 px-3 py-2 text-sm text-slate-100"
              />
              <input
                type="text"
                value={currentProfile.lifeContext || ""}
                onChange={(e) =>
                  handleManualProfileChange("lifeContext", e.target.value)
                }
                placeholder="お仕事・今の立場"
                className="w-full rounded-xl bg-slate-950 border border-white/15 px-3 py-2 text-sm text-slate-100"
              />
            </div>
          )}
        </div>

        {/* 3. 喜・怒・哀・楽タブ（大きく押しやすいボタン） */}
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-1.5">
            <button
              type="button"
              onClick={() => setFilterEmotion("all")}
              className={`py-2 rounded-xl text-sm font-serif font-bold transition ${
                filterEmotion === "all"
                  ? "bg-amber-500/30 text-amber-100 border border-amber-400/50"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-white/5"
              }`}
            >
              全て({currentProfile.memories.length})
            </button>
            {(["ki", "do", "ai", "raku"] as const).map((emo) => {
              const count = currentProfile.memories.filter(
                (m) => m.emotion === emo
              ).length;
              return (
                <button
                  key={emo}
                  type="button"
                  onClick={() => setFilterEmotion(emo)}
                  className={`py-2 rounded-xl text-sm font-serif font-bold transition ${
                    filterEmotion === emo
                      ? EMOTION_META[emo].badgeClass + " border"
                      : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-white/5"
                  }`}
                >
                  {EMOTION_META[emo].kanji}({count})
                </button>
              );
            })}
          </div>

          {/* 記憶リスト */}
          {filteredMemories.length === 0 ? (
            <div className="rounded-2xl bg-slate-950/50 border border-white/5 py-8 px-4 text-center text-sm sm:text-base text-slate-400 font-serif">
              まだ記録がありません
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {filteredMemories.map((item) => {
                const meta = EMOTION_META[item.emotion] || EMOTION_META.ki;
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl bg-slate-950/90 border ${meta.borderClass} p-4 flex items-start justify-between gap-3`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg border text-sm font-serif font-bold ${meta.badgeClass}`}
                        >
                          {meta.kanji}
                        </span>
                        {item.period && (
                          <span className="text-sm text-amber-200/80 font-serif">
                            {item.period}
                          </span>
                        )}
                      </div>
                      <p className="text-base text-slate-100 leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMemory(item.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="削除"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 戻るボタン */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-amber-100 font-serif font-bold text-base tracking-wider flex items-center justify-center gap-2 transition"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>庭へ戻る</span>
          </button>
        </div>
      </div>
    </div>
  );
};
