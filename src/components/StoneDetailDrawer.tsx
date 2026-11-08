// 庭の「覚悟の石」をタップした際に表示される詳細振り返りカード
// spec.md 4.3節・7.2節に準拠:
// 「いつ、どんな喜怒哀楽と苦しみから、どのような問答を経て、どんな自分の結論（覚悟）に至ったか」と
// その時授かった禅師の法話・出典URLをいつでもスマホ内で振り返ることができる。

import React, { useState } from "react";
import { SavedResolutionStone } from "../types/zen";
import {
  X,
  ExternalLink,
  Trash2,
  MessageSquare,
  Calendar,
  Sparkles,
} from "lucide-react";

interface StoneDetailDrawerProps {
  stone: SavedResolutionStone;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export const StoneDetailDrawer: React.FC<StoneDetailDrawerProps> = ({
  stone,
  onClose,
  onDelete,
}) => {
  const [showDialogue, setShowDialogue] = useState(false);

  const formattedDate = new Date(stone.createdAt).toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-20 flex items-end sm:items-center justify-center p-3 sm:p-6 bg-black/55 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-amber-200/25 bg-[#0c1324]/95 p-6 text-slate-100 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-100 hover:bg-white/10 transition"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ヘッダー */}
        <div className="flex items-center gap-2 text-xs text-amber-300/90 font-serif mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{stone.wisdom_name}</span>
        </div>
        <h3 className="font-serif text-xl font-bold text-amber-50 tracking-wide mb-2">
          {stone.stone_title}
        </h3>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mb-4">
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {formattedDate}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
            当時の喜怒哀楽：喜{stone.assessment.ki} / 怒{stone.assessment.do} / 哀
            {stone.assessment.ai} / 楽{stone.assessment.raku}
          </span>
        </div>

        {/* 自分が到達した結論 */}
        <div className="rounded-2xl bg-amber-500/10 border border-amber-300/25 p-4 mb-4">
          <div className="text-[11px] text-amber-300 font-serif mb-1">
            ◆ あなたの結論（覚悟の言葉）
          </div>
          <p className="font-serif text-sm text-amber-50 leading-relaxed">
            {stone.user_conclusion}
          </p>
        </div>

        {/* 授かった円覚寺の法話 */}
        <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-4 mb-4">
          <div className="flex items-center justify-between text-xs text-sky-300 font-serif mb-1.5">
            <span>{stone.master_name} 老師の言葉</span>
            <span className="text-[11px] text-slate-400">
              {stone.source_title}
            </span>
          </div>
          <blockquote className="font-serif text-xs sm:text-sm text-slate-200 leading-relaxed border-l-2 border-amber-400/50 pl-3 my-2">
            「{stone.quote}」
          </blockquote>
          {stone.source_url && (
            <div className="text-right mt-2">
              <a
                href={stone.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200 underline underline-offset-2"
              >
                <span>出典法話を読む</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* 問答履歴の折りたたみ表示 */}
        {stone.dialogue_digest && stone.dialogue_digest.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowDialogue((prev) => !prev)}
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 flex items-center justify-between transition"
            >
              <span className="inline-flex items-center gap-1.5 font-serif">
                <MessageSquare className="w-3.5 h-3.5 text-amber-300" />
                この石を生んだ禅問答の記録（{stone.dialogue_digest.length}発言）
              </span>
              <span>{showDialogue ? "閉じる ▲" : "開く ▼"}</span>
            </button>

            {showDialogue && (
              <div className="mt-2 max-h-52 overflow-y-auto rounded-2xl bg-slate-950/90 border border-white/10 p-3 space-y-2.5">
                {stone.dialogue_digest.map((msg, i) => (
                  <div
                    key={i}
                    className={`text-xs leading-relaxed p-2.5 rounded-xl ${
                      msg.role === "user"
                        ? "bg-amber-500/15 text-amber-100 ml-6"
                        : "bg-slate-900 text-slate-300 mr-6 font-serif"
                    }`}
                  >
                    <span className="block text-[10px] text-slate-400 mb-0.5">
                      {msg.role === "user" ? "あなた" : "禅問答師"}
                    </span>
                    {msg.content}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* フッターボタン */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            onClick={() => {
              if (
                window.confirm(
                  "この「覚悟の石」を心の庭から手放しますか？（端末内から削除されます）"
                )
              ) {
                onDelete(stone.id);
              }
            }}
            className="inline-flex items-center gap-1 text-xs text-rose-400/80 hover:text-rose-300 px-2 py-1.5 rounded-lg hover:bg-rose-500/10 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>石を手放す</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-xs text-amber-100 font-serif transition"
          >
            心庭へ戻る
          </button>
        </div>
      </div>
    </div>
  );
};
