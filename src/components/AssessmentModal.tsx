// 禅問答の開始モーダル（大きな文字・少ない説明で直感的にすぐ始められるデザイン）

import React, { useState } from "react";
import { EmotionAssessment, UserLifeProfile } from "../types/zen";
import { Sparkles, ArrowRight, X, BookHeart, Compass } from "lucide-react";

interface AssessmentModalProps {
  lifeProfile: UserLifeProfile;
  onStart: (assessment: EmotionAssessment) => void;
  onOpenLifeMemories: () => void;
  onOpenUserProfile?: () => void;
  onCancel: () => void;
}

export const AssessmentModal: React.FC<AssessmentModalProps> = ({
  lifeProfile,
  onStart,
  onOpenLifeMemories,
  onOpenUserProfile,
  onCancel,
}) => {
  const [initialConcern, setInitialConcern] = useState("");
  const totalMemories = lifeProfile.memories.length;
  const valuesCount = lifeProfile.coreValues ? lifeProfile.coreValues.length : 0;
  const valuesSummary =
    valuesCount > 0 ? lifeProfile.coreValues.join("・") : "未設定";

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
            禅問答を始める
          </h2>
        </div>

        {/* プロフィール・価値観 ＆ 人生の記憶ステータス */}
        <div className="space-y-2.5 mb-5">
          {/* 価値観・立場 */}
          <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Compass className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-serif text-sm font-bold text-amber-100 truncate">
                  価値観：{valuesSummary}
                </p>
                <p className="text-[11px] text-slate-400">
                  {valuesCount === 2
                    ? "価値観をコンパスに対話します"
                    : "直感で2つ選ぶと問いが深まります"}
                </p>
              </div>
            </div>
            {onOpenUserProfile && (
              <button
                type="button"
                onClick={onOpenUserProfile}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-serif font-bold text-amber-200 flex-shrink-0 transition"
              >
                {valuesCount === 0 ? "設定する" : "変更"}
              </button>
            )}
          </div>

          {/* 人生の記憶 */}
          <div className="rounded-2xl bg-slate-900/90 border border-amber-300/20 p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <BookHeart className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <div>
                <p className="font-serif text-sm font-bold text-amber-100">
                  人生の記憶：{totalMemories}件
                </p>
                <p className="text-[11px] text-slate-400">
                  {totalMemories > 0
                    ? "喜怒哀楽の記憶を踏まえて対話します"
                    : "未登録でもそのまま始められます"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenLifeMemories}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-xs font-serif font-bold text-amber-200 flex-shrink-0 transition"
            >
              {totalMemories === 0 ? "記憶を書く" : "追加・確認"}
            </button>
          </div>
        </div>

        {/* 今回のテーマ入力 */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-serif text-base font-bold text-amber-50 mb-2">
              今、気になっていることはありますか？（任意）
            </label>
            <textarea
              rows={3}
              value={initialConcern}
              onChange={(e) => setInitialConcern(e.target.value)}
              placeholder="例：仕事の焦りが消えない、これからの道に迷っている（空欄でも始められます）"
              className="w-full rounded-2xl bg-slate-950 border border-white/15 p-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-serif font-bold text-base sm:text-lg tracking-wider shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition transform active:scale-[0.99]"
          >
            <Sparkles className="w-5 h-5" />
            <span>対話を始める</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

