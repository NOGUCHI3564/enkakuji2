// 禅問答対話パネル（フロー理論の3段階フェーズ表示、直近5〜10往復の記憶インジケーター、身体技法提案、覚悟の石の生成ボタン）
// spec.md 第3章・第5章に準拠

import React, { useState, useRef, useEffect } from "react";
import { ActiveSession, SoundType } from "../types/zen";
import {
  Send,
  Sparkles,
  Wind,
  Gem,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from "lucide-react";

interface InquiryOverlayProps {
  session: ActiveSession;
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onRequestConclusion: () => void;
  onStartMeditation: (sound: SoundType, minutes: number) => void;
  onDismissPraxis: () => void;
  onBackToGarden: () => void;
}

const PHASE_LABELS: Record<
  1 | 2 | 3,
  { title: string; subtitle: string; badgeClass: string }
> = {
  1: {
    title: "自己探索：傾聴と受容",
    subtitle: "あなたの心に耳を傾け、思考を深めています",
    badgeClass: "bg-sky-500/15 text-sky-200 border-sky-400/30",
  },
  2: {
    title: "視点の転換：本質への問い",
    subtitle: "思考の枠組みを解き、別の角度から見つめる",
    badgeClass: "bg-indigo-500/15 text-indigo-200 border-indigo-400/30",
  },
  3: {
    title: "主体的覚悟：内省の結び",
    subtitle: "自らの足で歩き出す意志を結晶化する",
    badgeClass: "bg-amber-500/15 text-amber-200 border-amber-400/30",
  },
};

export const InquiryOverlay: React.FC<InquiryOverlayProps> = ({
  session,
  isLoading,
  onSendMessage,
  onRequestConclusion,
  onStartMeditation,
  onDismissPraxis,
  onBackToGarden,
}) => {
  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const assistantMessages = session.messages.filter(
    (m) => m.role === "assistant"
  );
  const userTurnCount = session.messages.filter(
    (m) => m.role === "user"
  ).length;
  const latestQuestion =
    assistantMessages[assistantMessages.length - 1]?.content ||
    "心を静めて、問いを紡いでいます…";

  // 動的揺らぎ（Coaching ⇔ Zen Shift ⇔ Closing）に応じたリアルタイム表示
  const currentMode = session.dialogueMode || (session.currentPhase === 3 ? "closing" : session.currentPhase === 2 ? "zen_shift" : "coaching");
  const modeInfo = currentMode === "zen_shift"
    ? {
        title: "禅の揺らぎ：視点の転換",
        subtitle: "思考の枠組みを外し、別の視点から見つめる",
        badgeClass: "bg-indigo-500/20 text-indigo-200 border-indigo-400/40 shadow-lg shadow-indigo-500/10",
      }
    : currentMode === "closing"
    ? {
        title: "主体的覚悟：内省の結び",
        subtitle: "自らの足で歩き出す意志を結晶化する",
        badgeClass: "bg-amber-500/20 text-amber-200 border-amber-400/40 shadow-lg shadow-amber-500/10",
      }
    : {
        title: "自己探索：傾聴と受容",
        subtitle: "あなたの心に耳を傾け、思考を深めています",
        badgeClass: "bg-sky-500/20 text-sky-200 border-sky-400/40 shadow-lg shadow-sky-500/10",
      };

  useEffect(() => {
    if (showHistory) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [session.messages.length, showHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    onSendMessage(text);
  };

  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-between p-4 sm:p-6 pointer-events-none">
      {/* 上部バー：庭へ戻る・現在のフェーズ・5〜10往復の記憶ゲージ */}
      <div className="flex items-center justify-between gap-2 pointer-events-auto">
        <button
          onClick={onBackToGarden}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-900/75 hover:bg-slate-800/90 border border-white/10 text-xs text-slate-300 backdrop-blur-md transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>心庭へ</span>
        </button>

        <div
          className={`px-3.5 py-1.5 rounded-full border text-xs font-serif tracking-wide backdrop-blur-md transition-all duration-500 ${modeInfo.badgeClass}`}
        >
          {modeInfo.title}
        </div>

        <button
          onClick={() => setShowHistory((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-900/75 hover:bg-slate-800/90 border border-white/10 text-xs text-amber-200/90 backdrop-blur-md transition"
          title="直近5〜10往復の対話記憶を確認"
        >
          <span>問答 {Math.max(1, userTurnCount)} / 10</span>
          {showHistory ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* 中央エリア：現在のAI禅問答の問い（または履歴ドロワー） */}
      <div className="my-auto flex flex-col items-center justify-center max-w-lg mx-auto w-full pointer-events-auto">
        {showHistory ? (
          <div className="w-full max-h-[52vh] overflow-y-auto rounded-3xl bg-slate-950/85 border border-white/10 p-4 backdrop-blur-xl space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <span className="text-xs font-serif text-amber-200">
                記憶されている対話の軌跡（直近10往復保持）
              </span>
              <button
                onClick={() => setShowHistory(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                閉じる
              </button>
            </div>
            {session.messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <span className="text-[10px] text-slate-400 mb-0.5 px-1">
                  {m.role === "user" ? "あなた" : "円覚寺 禅問答師"}
                </span>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-amber-500/20 border border-amber-400/30 text-amber-50"
                      : "bg-slate-900/90 border border-white/10 text-slate-200 font-serif"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="w-full text-center px-3">
            {/* 10往復プログレスドット */}
            <div className="flex items-center justify-center gap-1.5 mb-4">
              {Array.from({ length: 10 }).map((_, idx) => {
                const active = idx < userTurnCount;
                const isCurrent = idx === userTurnCount;
                return (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      active
                        ? "w-4 bg-amber-400 shadow-sm shadow-amber-300"
                        : isCurrent
                        ? "w-6 bg-amber-200/80 animate-pulse"
                        : "w-1.5 bg-white/15"
                    }`}
                  />
                );
              })}
            </div>

            {/* 現在の問いカード */}
            <div className="relative rounded-3xl bg-slate-950/65 border border-amber-100/15 px-6 py-7 backdrop-blur-md shadow-2xl">
              <p className="text-[11px] text-amber-300/80 tracking-widest font-serif mb-3">
                {modeInfo.subtitle}
              </p>
              {isLoading ? (
                <div className="py-6 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-amber-300/60 border-t-transparent animate-spin" />
                  <p className="font-serif text-sm text-amber-100/80 tracking-wider">
                    {currentMode === "zen_shift"
                      ? "視点を揺さぶる禅の智慧を紡いでいます…"
                      : currentMode === "closing"
                      ? "全脳の智慧と共鳴させ、覚悟を結晶化しています…"
                      : "あなたの心に寄り添い、問いを深めています…"}
                  </p>
                </div>
              ) : (
                <p className="font-serif text-lg sm:text-xl leading-relaxed text-amber-50 tracking-wide">
                  {latestQuestion}
                </p>
              )}
            </div>

            {/* 身体技法・自然音瞑想の提案バナー（praxis_offer時） */}
            {session.activePraxisOffer && !isLoading && (
              <div className="mt-4 rounded-2xl bg-emerald-950/80 border border-emerald-400/30 p-4 text-left backdrop-blur-md shadow-lg animate-fadeIn">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-serif font-semibold mb-1">
                  <Wind className="w-4 h-4" />
                  <span>
                    身体技法と自然音瞑想の提案：
                    {session.activePraxisOffer.praxis_name}
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed mb-3">
                  {session.activePraxisOffer.guide_text}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() =>
                      onStartMeditation(
                        session.activePraxisOffer!.recommended_sound,
                        session.activePraxisOffer!.duration_min
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-emerald-500/90 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition"
                  >
                    {session.activePraxisOffer.duration_min}分間 瞑想する
                  </button>
                  <button
                    onClick={onDismissPraxis}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition"
                  >
                    問答を続ける
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 下部エリア：ユーザーの回答入力フォーム ＋ いつでも瞑想 / 「覚悟の石」結晶化ボタン */}
      <div className="w-full max-w-lg mx-auto space-y-2.5 pointer-events-auto">
        <div className="flex items-center justify-between gap-2 px-1">
          <button
            type="button"
            onClick={() => onStartMeditation("rain", 3)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/75 hover:bg-slate-800 border border-white/10 text-xs text-sky-200/90 backdrop-blur-md transition"
          >
            <Wind className="w-3.5 h-3.5" />
            <span>自然音で呼吸を整える</span>
          </button>

          {userTurnCount >= 1 && (
            <button
              type="button"
              onClick={onRequestConclusion}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-xs text-amber-200 font-serif backdrop-blur-md transition shadow-sm shadow-amber-500/10"
            >
              <Gem className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>今の結論を「覚悟の石」に結ぶ</span>
            </button>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="relative flex items-end gap-2 rounded-3xl bg-slate-950/80 border border-white/15 p-2.5 backdrop-blur-xl shadow-2xl"
        >
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            disabled={isLoading}
            placeholder="心に浮かんだ言葉、気づき、あるいは今の結論を記してください…"
            className="flex-1 bg-transparent px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 transition flex-shrink-0"
            aria-label="回答を送信"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-400/80 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-300/70" />
          <span>
            5〜10往復の問答の末にあなたが出した結論が、庭に「覚悟の石」として立ち上がります
          </span>
        </p>
      </div>
    </div>
  );
};
