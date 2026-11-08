// ユーザー向け設定・全脳知識ネットワーク閲覧・スマホ内データ管理モーダル
// ※ Supabase や OpenRouter 等のバックエンド接続情報は開発者側（環境変数・Supabase Secrets）で管理し、
// ユーザーの画面には一切表示しない設計とする。

import React, { useState } from "react";
import knowledgeGraph from "../../knowledge_graph.json";
import { AppSettings } from "../types/zen";
import {
  X,
  Volume2,
  Clock,
  ShieldCheck,
  Network,
  Sliders,
  Trash2,
} from "lucide-react";

interface SettingsAndGraphModalProps {
  settings: AppSettings;
  stonesCount: number;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onResetAllData: () => void;
  onClose: () => void;
}

export const SettingsAndGraphModal: React.FC<SettingsAndGraphModalProps> = ({
  settings,
  stonesCount,
  onUpdateSettings,
  onResetAllData,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"settings" | "graph">("settings");

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg max-h-[86vh] overflow-y-auto rounded-3xl border border-white/15 bg-[#0b1220]/95 p-6 text-slate-100 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-100 hover:bg-white/10 transition"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>

        {/* タブ切り替え */}
        <div className="flex items-center gap-2 mb-5 border-b border-white/10 pb-3">
          <button
            onClick={() => setActiveTab("settings")}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-serif transition ${
              activeTab === "settings"
                ? "bg-amber-500/20 text-amber-200 border border-amber-400/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>音響・瞑想設定と記録管理</span>
          </button>

          <button
            onClick={() => setActiveTab("graph")}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-serif transition ${
              activeTab === "graph"
                ? "bg-sky-500/20 text-sky-200 border border-sky-400/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>円覚寺 全脳知識ネットワーク</span>
          </button>
        </div>

        {activeTab === "settings" ? (
          <div className="space-y-5">
            {/* 1. 音量設定 */}
            <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-2 text-xs font-serif text-amber-100">
                  <Volume2 className="w-4 h-4 text-amber-300" />
                  自然環境音・おりん（磬子）の音量
                </span>
                <span className="text-xs font-mono text-amber-300">
                  {Math.round(settings.soundVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.soundVolume}
                onChange={(e) =>
                  onUpdateSettings({ soundVolume: Number(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-amber-400"
              />
            </div>

            {/* 2. デフォルト瞑想時間設定 */}
            <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="inline-flex items-center gap-2 text-xs font-serif text-amber-100">
                  <Clock className="w-4 h-4 text-sky-300" />
                  自然音瞑想の基本時間
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([3, 5, 10] as const).map((mins) => {
                  const active = settings.defaultMeditationMinutes === mins;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({ defaultMeditationMinutes: mins })
                      }
                      className={`py-2.5 rounded-xl text-xs font-serif border transition ${
                        active
                          ? "bg-amber-500/25 border-amber-400/50 text-amber-100"
                          : "bg-slate-950/60 border-white/10 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {mins}分
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. プライバシー＆ローカルデータ消去 */}
            <div className="rounded-2xl bg-emerald-950/30 border border-emerald-500/20 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-serif text-emerald-300">
                <ShieldCheck className="w-4 h-4" />
                <span>スマートフォン内完結の記録保護</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                あなたの「喜・怒・哀・楽」の記録、禅問答の対話履歴、および心の庭に据えられた「覚悟の石（現在{" "}
                {stonesCount}{" "}
                個）」は、すべてお使いのスマートフォン内部にのみ保存され、外部のデータベースには一切保存されません。
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        "スマートフォン内に保存されているすべての対話履歴と「覚悟の石」を初期化しますか？"
                      )
                    ) {
                      onResetAllData();
                      onClose();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-xs text-rose-300 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>心の庭と対話履歴を初期化する</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 全脳知識ネットワーク (knowledge_graph.json) ビューア */
          <div className="space-y-4 text-xs">
            <p className="text-slate-300 leading-relaxed">
              円覚寺の師家の法話・身体技法・智慧の体系です。禅問答ではこれらの知識ネットワーク全体を参照し、あなたの心の状態に応じた問いと導きが紡がれます。
            </p>

            {/* 禅師一覧 */}
            <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-4 space-y-2">
              <h4 className="font-serif text-amber-200 font-semibold">
                1. 師家・法脈（{Object.keys(knowledgeGraph.masters).length}名）
              </h4>
              {Object.values(knowledgeGraph.masters).map((m) => (
                <div
                  key={m.id}
                  className="border-l-2 border-amber-400/40 pl-3 py-1"
                >
                  <div className="font-serif text-slate-100 font-medium">
                    {m.name}{" "}
                    <span className="text-[11px] text-slate-400">
                      （{m.title}）
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-200/80">
                    核心思想：{m.core_philosophy}
                  </div>
                </div>
              ))}
            </div>

            {/* 7つの智慧 */}
            <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-4 space-y-2">
              <h4 className="font-serif text-sky-200 font-semibold">
                2. 智慧の境地（{Object.keys(knowledgeGraph.wisdoms).length}種）
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {Object.values(knowledgeGraph.wisdoms).map((w) => (
                  <div
                    key={w.id}
                    className="rounded-xl bg-slate-950/80 border border-white/5 p-2.5"
                  >
                    <div className="font-serif text-amber-100 font-medium">
                      {w.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {w.summary}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 6つの苦悩と3段階転換パス */}
            <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-4 space-y-2">
              <h4 className="font-serif text-emerald-200 font-semibold">
                3. 苦悩類型と3段階の転換パス（
                {Object.keys(knowledgeGraph.sufferings).length}類型）
              </h4>
              {Object.values(knowledgeGraph.sufferings).map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl bg-slate-950/80 border border-white/5 p-2.5"
                >
                  <div className="font-serif text-slate-100 font-medium">
                    {s.name}
                  </div>
                  <div className="text-[11px] text-slate-400 mb-1">
                    {s.description}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {s.transforms_to_ids.map((t) => (
                      <span
                        key={t.phase}
                        className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-amber-200/90"
                      >
                        Phase {t.phase}: {t.description}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
