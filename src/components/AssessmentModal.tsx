// 禅問答の開始モーダル（問いの入力と対話開始に特化したシンプルなデザイン）

import React, { useState } from "react";
import { EmotionAssessment, UserLifeProfile } from "../types/zen";
import { Sparkles, ArrowRight, X, BookHeart, Compass } from "lucide-react";

interface AssessmentModalProps {
  lifeProfile: UserLifeProfile;
  onStart: (assessment: EmotionAssessment) => void;
  onCancel: () => void;
}

export const AssessmentModal: React.FC<AssessmentModalProps> = ({
  lifeProfile,
  onStart,
  onCancel,
}) => {
  const [initialConcern, setInitialConcern] = useState("");
  const totalMemories = lifeProfile.memories.length;
  const valuesCount = lifeProfile.coreValues ? lifeProfile.coreValues.length : 0;
  const valuesSummary =
    valuesCount > 0 ? lifeProfile.coreValues.join("・") : "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart({
      initialConcern: initialConcern.trim(),
      lifeProfileSnapshot: lifeProfile,
    });
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl border border-amber-200/25 bg-[#0b1220] p-6 sm:p-7 shadow-2xl text-slate-100 my-auto">
        <button
          onClick={onCancel}
          className="absolute top-5 right-5 p-2.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-white/10 transition"
          aria-label="閉じる"
        >
          <X className="w-6 h-6" />
        </button>

        {/* タイトル */}
        <div className="mb-5 pr-10">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-wider text-amber-50">
            対話を始める
          </h2>

          {/* 登録済みコンテキストのさりげない反映ステータス */}
          {(valuesCount > 0 || totalMemories > 0) ? (
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              {valuesCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-300/25 text-xs text-amber-200 font-serif">
                  <Compass className="w-3 h-3 text-amber-300" />
                  価値観: {valuesSummary}
                </span>
              )}
              {totalMemories > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-300/25 text-xs text-amber-200 font-serif">
                  <BookHeart className="w-3 h-3 text-amber-300" />
                  記憶: {totalMemories}件
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 font-serif mt-1.5">
              あなたの心の波紋に寄り添い、内省の問いを紡ぎます
            </p>
          )}
        </div>

        {/* 今回のテーマ入力 */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-serif text-base font-bold text-amber-50 mb-2">
              今、気になっていることはありますか？（任意）
            </label>
            <textarea
              rows={4}
              value={initialConcern}
              onChange={(e) => setInitialConcern(e.target.value)}
              placeholder="例：仕事の焦りが消えない、これからの道に迷っている、人間関係のモヤモヤ（空欄でも始められます）"
              className="w-full rounded-2xl bg-slate-950 border border-white/15 p-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-serif font-bold text-base sm:text-lg tracking-wider shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition transform active:scale-[0.99]"
          >
            <Sparkles className="w-5 h-5" />
            <span>自身の心と向き合う</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

