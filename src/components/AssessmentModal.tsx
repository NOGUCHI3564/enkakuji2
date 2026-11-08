// ステップ1：初期質問「喜・怒・哀・楽」と今の悩みの入力パネル
// spec.md 5.1節に準拠:
// 0〜10のスライダー操作時に光の粒子と水滴音が連動し、心を見つめる導入をつくる。

import React, { useState } from "react";
import { EmotionAssessment } from "../types/zen";
import { soundEngine } from "../services/soundEngine";
import { Sparkles, ArrowRight, X } from "lucide-react";

interface AssessmentModalProps {
  onStart: (assessment: EmotionAssessment) => void;
  onCancel: () => void;
}

const EMOTION_ITEMS: Array<{
  key: keyof Omit<EmotionAssessment, "initialConcern">;
  kanji: string;
  reading: string;
  question: string;
  accent: string;
}> = [
  {
    key: "ki",
    kanji: "喜",
    reading: "よろこび",
    question: "今、心の中にどのくらい喜びや満たされた感覚がありますか",
    accent: "accent-amber-400",
  },
  {
    key: "do",
    kanji: "怒",
    reading: "いかり",
    question: "今、心の中にどのくらい苛立ちや憤り、納得のいかない思いがありますか",
    accent: "accent-rose-400",
  },
  {
    key: "ai",
    kanji: "哀",
    reading: "かなしみ",
    question: "今、心の中にどのくらい悲しみや寂しさ、喪失感がありますか",
    accent: "accent-sky-400",
  },
  {
    key: "raku",
    kanji: "楽",
    reading: "たのしみ",
    question: "今、どのくらい心が軽やかで、安心や安らぎを感じられていますか",
    accent: "accent-emerald-400",
  },
];

export const AssessmentModal: React.FC<AssessmentModalProps> = ({
  onStart,
  onCancel,
}) => {
  const [values, setValues] = useState<EmotionAssessment>({
    ki: 4,
    do: 4,
    ai: 5,
    raku: 4,
    initialConcern: "",
  });

  const handleSliderChange = (
    key: keyof Omit<EmotionAssessment, "initialConcern">,
    val: number
  ) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    soundEngine.playWaterDrop(0.85 + val * 0.04);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart(values);
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-black/55 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl border border-amber-200/20 bg-[#0b1220]/90 p-6 shadow-2xl shadow-amber-950/30 text-slate-100 my-auto">
        <button
          onClick={onCancel}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/5 transition"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs tracking-widest uppercase bg-amber-500/10 text-amber-300 border border-amber-400/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            心の状態の観察
          </span>
          <h2 className="font-serif text-xl font-semibold tracking-wider text-amber-50">
            今の「喜・怒・哀・楽」を観る
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            良い・悪いはありません。ただ今の心の波立ちをそのまま映してください。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {EMOTION_ITEMS.map((item) => {
            const score = values[item.key];
            return (
              <div
                key={item.key}
                className="rounded-2xl bg-slate-900/70 border border-white/5 px-4 py-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-lg font-bold text-amber-200">
                      {item.kanji}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      （{item.reading}）
                    </span>
                  </div>
                  <span className="font-mono text-sm font-semibold text-amber-300">
                    {score} <span className="text-xs text-slate-500">/ 10</span>
                  </span>
                </div>
                <p className="text-xs text-slate-300 mb-2">{item.question}</p>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={score}
                  onChange={(e) =>
                    handleSliderChange(item.key, Number(e.target.value))
                  }
                  className={`w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer ${item.accent}`}
                />
              </div>
            );
          })}

          <div className="rounded-2xl bg-slate-900/70 border border-white/5 px-4 py-3">
            <label className="block font-serif text-sm text-amber-100 mb-1.5">
              今、心に引っかかっていることは何ですか{" "}
              <span className="text-xs text-slate-400 font-sans">（任意）</span>
            </label>
            <textarea
              rows={2}
              value={values.initialConcern}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  initialConcern: e.target.value,
                }))
              }
              placeholder="例：もっと成果を出さねばと焦り、心が休まらない／大切な人を失いぽっかり穴が空いている…"
              className="w-full rounded-xl bg-slate-950/80 border border-white/10 p-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400/50 resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500/90 to-amber-600/90 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-serif font-semibold tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition transform active:scale-[0.99]"
          >
            <span>禅問答を始める</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
