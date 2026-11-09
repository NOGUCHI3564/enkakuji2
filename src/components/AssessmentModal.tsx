// 禅問答の開始モーダル（数値スライダーを廃止し、「人生の記憶」を自動参照＋今回のテーマ入力に特化）
// まだ「人生の記憶（喜怒哀楽の経験）」が未登録でも、その場で開いて追加するか、そのまま始めることができる。

import React, { useState } from "react";
import { EmotionAssessment, UserLifeProfile } from "../types/zen";
import {
  Sparkles,
  ArrowRight,
  X,
  BookHeart,
  PlusCircle,
} from "lucide-react";

interface AssessmentModalProps {
  lifeProfile: UserLifeProfile;
  onStart: (assessment: EmotionAssessment) => void;
  onOpenLifeMemories: () => void;
  onCancel: () => void;
}

export const AssessmentModal: React.FC<AssessmentModalProps> = ({
  lifeProfile,
  onStart,
  onOpenLifeMemories,
  onCancel,
}) => {
  const [initialConcern, setInitialConcern] = useState("");

  const memoryCounts = {
    ki: lifeProfile.memories.filter((m) => m.emotion === "ki").length,
    do: lifeProfile.memories.filter((m) => m.emotion === "do").length,
    ai: lifeProfile.memories.filter((m) => m.emotion === "ai").length,
    raku: lifeProfile.memories.filter((m) => m.emotion === "raku").length,
  };
  const totalMemories = lifeProfile.memories.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart({
      initialConcern: initialConcern.trim(),
      lifeProfileSnapshot: lifeProfile,
    });
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl border border-amber-200/20 bg-[#0b1220]/95 p-6 shadow-2xl text-slate-100 my-auto">
        <button
          onClick={onCancel}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/5 transition"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs tracking-widest bg-amber-500/10 text-amber-300 border border-amber-400/20 mb-2 font-serif">
            <Sparkles className="w-3.5 h-3.5" />
            禅問答への入堂
          </span>
          <h2 className="font-serif text-xl font-semibold tracking-wider text-amber-50">
            今の心を見つめる
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            あなたの「人生の記憶（喜・怒・哀・楽の経験）」を踏まえ、円覚寺の智慧と共に問いを紡ぎます。
          </p>
        </div>

        {/* 参照される「人生の記憶」のステータスボックス */}
        <div className="rounded-2xl bg-slate-900/80 border border-amber-300/20 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-serif text-amber-200">
              <BookHeart className="w-4 h-4 text-amber-300" />
              参照される「人生の記憶」
            </span>
            <button
              type="button"
              onClick={onOpenLifeMemories}
              className="inline-flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200 underline underline-offset-2 font-serif"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{totalMemories === 0 ? "記憶を登録する" : "記憶を追加・編集"}</span>
            </button>
          </div>

          {totalMemories === 0 && !lifeProfile.birthDate && !lifeProfile.lifeContext ? (
            <p className="text-[11px] text-slate-400 leading-relaxed">
              まだ「人生の記憶（喜怒哀楽の経験や生年月日など）」が記録されていません。このまま始めることもできますが、右上の「記憶を登録する」からあなたの経験を記しておくと、より深い禅問答になります。
            </p>
          ) : (
            <div className="space-y-2">
              {(lifeProfile.birthDate ||
                lifeProfile.gender ||
                lifeProfile.lifeContext) && (
                <div className="text-[11px] text-slate-300 bg-slate-950/70 rounded-xl px-3 py-1.5 border border-white/5">
                  {[
                    lifeProfile.birthDate,
                    lifeProfile.gender,
                    lifeProfile.lifeContext,
                  ]
                    .filter(Boolean)
                    .join(" ／ ")}
                </div>
              )}
              <div className="grid grid-cols-4 gap-1.5 text-center">
                <div className="rounded-lg bg-amber-500/10 border border-amber-400/20 py-1">
                  <span className="font-serif text-xs text-amber-200">
                    喜 {memoryCounts.ki}件
                  </span>
                </div>
                <div className="rounded-lg bg-rose-500/10 border border-rose-400/20 py-1">
                  <span className="font-serif text-xs text-rose-200">
                    怒 {memoryCounts.do}件
                  </span>
                </div>
                <div className="rounded-lg bg-sky-500/10 border border-sky-400/20 py-1">
                  <span className="font-serif text-xs text-sky-200">
                    哀 {memoryCounts.ai}件
                  </span>
                </div>
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-400/20 py-1">
                  <span className="font-serif text-xs text-emerald-200">
                    楽 {memoryCounts.raku}件
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-4">
            <label className="block font-serif text-sm text-amber-100 mb-1.5">
              今日、心に引っかかっていることや見つめたいテーマは何ですか{" "}
              <span className="text-xs text-slate-400 font-sans">（任意）</span>
            </label>
            <textarea
              rows={3}
              value={initialConcern}
              onChange={(e) => setInitialConcern(e.target.value)}
              placeholder="例：もっと成果を出さねばと焦り心が休まらない／過去の別れや後悔がふと蘇る／これからの自分の道に迷っている（空欄のままでも「人生の記憶」から問いが始まります）"
              className="w-full rounded-xl bg-slate-950/90 border border-white/10 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400/50 resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500/95 to-amber-600/95 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-serif font-bold tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition transform active:scale-[0.99]"
          >
            <span>禅問答を始める</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
