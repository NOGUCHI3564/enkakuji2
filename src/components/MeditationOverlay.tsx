// 自然環境音瞑想 & 円覚寺身体技法（praxes）モード画面
// spec.md 5.3節・第6章に準拠:
// 対話UIを最小化し、雨・波・森・小川・静寂の自然環境音と、
// knowledge_graph.json の7つの身体技法を選択・実践できる深い没入画面。

import React, { useEffect, useState } from "react";
import knowledgeGraph from "../../knowledge_graph.json";
import { SoundType, PraxisOffer, ActiveSession } from "../types/zen";
import { useZenStore } from "../store/useZenStore";
import { soundEngine } from "../services/soundEngine";
import {
  CloudRain,
  Waves,
  Trees,
  Droplets,
  VolumeX,
  Volume1,
  Volume2,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

interface MeditationOverlayProps {
  ambientSound: SoundType;
  secondsLeft: number;
  totalSeconds: number;
  isPlaying: boolean;
  activePraxisOffer?: PraxisOffer | null;
  activeSession?: ActiveSession | null;
  onChangeSound: (sound: SoundType, minutes: number) => void;
  onTick: () => void;
  onFinish: () => void;
}

const SOUND_OPTIONS: Array<{
  id: SoundType;
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    id: "rain",
    label: "雨",
    desc: "柔らかい雨と雨だれ",
    icon: <CloudRain className="w-4 h-4" />,
  },
  {
    id: "waves",
    label: "波",
    desc: "寄せて返す穏やかな波",
    icon: <Waves className="w-4 h-4" />,
  },
  {
    id: "forest",
    label: "森",
    desc: "木々の風と静かな息吹",
    icon: <Trees className="w-4 h-4" />,
  },
  {
    id: "stream",
    label: "小川",
    desc: "せせらぎと水琴の響き",
    icon: <Droplets className="w-4 h-4" />,
  },
  {
    id: "silence",
    label: "静寂",
    desc: "無音の坐禅",
    icon: <VolumeX className="w-4 h-4" />,
  },
];

const DURATION_OPTIONS = [3, 5, 10];

// 対話の文脈や時間帯に応じて最適な身体技法（Praxis）を動的に導出する
function getDefaultPraxisId(
  activePraxisOffer?: PraxisOffer | null,
  activeSession?: ActiveSession | null
): string {
  // 1. AIからの明示的な推薦がある場合
  if (activePraxisOffer?.praxis_id) {
    return activePraxisOffer.praxis_id;
  }

  // 2. 進行中の禅問答セッションがある場合
  if (activeSession) {
    // 覚悟への収束期（Phase 3）なら「立腰・丹田呼気充実（丹田呼吸）」
    if (activeSession.currentPhase === 3) {
      return "Pra_TandenBreathing";
    }

    // セッションの目標智慧（targetWisdomId）から導出
    const wisdom =
      knowledgeGraph.wisdoms[
        activeSession.targetWisdomId as keyof typeof knowledgeGraph.wisdoms
      ];
    if (wisdom && wisdom.praxis_ids && wisdom.praxis_ids.length > 0) {
      return wisdom.praxis_ids[0];
    }

    // 推定された苦悩ノード（estimatedSufferingId）から導出
    const sufferingId = activeSession.estimatedSufferingId;
    if (sufferingId === "Suf_Grief") return "Pra_GasshoRecitation"; // 喪失・悲嘆 -> 合掌感謝
    if (sufferingId === "Suf_Isolation") return "Pra_SweepingSamu"; // 孤立感 -> 掃き清め
    if (sufferingId === "Suf_Decline") return "Pra_ChairZazen"; // 衰え -> イス坐禅
    if (sufferingId === "Suf_Anxiety") return "Pra_SurrenderBreath"; // 焦燥 -> 手放しの呼吸
    if (sufferingId === "Suf_FearOfFailure") return "Pra_SurrenderBreath"; // 失敗の恐れ -> 手放しの呼吸
    if (sufferingId === "Suf_PerfectionismBurnout") return "Pra_OpenHandSurrender"; // 完璧主義 -> 丸木橋の手放し
  }

  // 3. ホーム画面から直接入った場合（時間帯に応じた自然な作法）
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) {
    return "Pra_MorningNamu"; // 朝の立腰念誦法
  } else if (hour >= 11 && hour < 18) {
    return "Pra_ChairZazen"; // 日中はイス坐禅（仕事や日常の合間にしやすい）
  } else {
    return "Pra_SurrenderBreath"; // 夜は無意識呼吸への帰依（リラックス・安眠）
  }
}

export const MeditationOverlay: React.FC<MeditationOverlayProps> = ({
  ambientSound,
  secondsLeft,
  totalSeconds,
  isPlaying,
  activePraxisOffer,
  activeSession,
  onChangeSound,
  onTick,
  onFinish,
}) => {
  const praxesList = Object.values(knowledgeGraph.praxes);
  const [selectedPraxisId, setSelectedPraxisId] = useState<string>(() =>
    getDefaultPraxisId(activePraxisOffer, activeSession)
  );
  const currentMinutes = Math.round(totalSeconds / 60) || 3;

  // 音量設定の取得と更新（useZenStore経由でlocalStorage保存 & soundEngineに即時反映）
  const settings = useZenStore((s) => s.settings);
  const updateSettings = useZenStore((s) => s.updateSettings);
  const setViewMode = useZenStore((s) => s.setViewMode);
  const soundVolume = settings?.soundVolume ?? 0.8;

  const handleVolumeChange = (newVol: number) => {
    updateSettings({ soundVolume: Math.max(0, Math.min(1, newVol)) });
  };

  const handleToggleMute = () => {
    if (soundVolume > 0.01) {
      updateSettings({ soundVolume: 0 });
    } else {
      updateSettings({ soundVolume: 0.7 });
    }
  };

  // 心庭（ホーム画面）へ直接戻る
  const handleBackToGarden = () => {
    soundEngine.stopAmbientSound();
    setViewMode("GARDEN_HOME");
  };

  useEffect(() => {
    setSelectedPraxisId(getDefaultPraxisId(activePraxisOffer, activeSession));
  }, [activePraxisOffer, activeSession]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      onTick();
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, onTick]);

  const currentPraxis =
    praxesList.find((p) => p.id === selectedPraxisId) || praxesList[0];

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const progress =
    totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 100;

  return (
    <div className="fixed inset-0 z-10 overflow-y-auto overscroll-contain pointer-events-auto bg-slate-950/40 backdrop-blur-[2px]">
      <div className="min-h-full flex flex-col justify-between p-3.5 sm:p-6 max-w-lg mx-auto">
        {/* 上部：心庭へ戻るボタン・音源選択・時間選択・音量スライダー */}
        <div className="flex flex-col gap-2 shrink-0 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* 左端：心庭（ホーム）へ戻るボタン */}
            <button
              type="button"
              onClick={handleBackToGarden}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-white/15 text-xs text-slate-200 hover:text-amber-200 backdrop-blur-md transition shadow-md shrink-0 active:scale-95"
              title="心庭（ホーム）に戻る"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>心庭へ</span>
            </button>

            {/* 自然環境音ピル */}
            <div className="flex items-center gap-1 bg-slate-950/85 border border-white/10 rounded-full p-1 backdrop-blur-md shadow-lg overflow-x-auto max-w-full">
              {SOUND_OPTIONS.map((s) => {
                const active = ambientSound === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      onChangeSound(s.id, currentMinutes);
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition shrink-0 ${
                      active
                        ? "bg-amber-500/25 text-amber-200 border border-amber-400/40 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {s.icon}
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 瞑想時間ピル */}
            <div className="flex items-center gap-0.5 bg-slate-950/85 border border-white/10 rounded-full p-1 backdrop-blur-md shadow-lg shrink-0">
              {DURATION_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => onChangeSound(ambientSound, m)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                    currentMinutes === m
                      ? "bg-sky-500/25 text-sky-200 border border-sky-400/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {m}分
                </button>
              ))}
            </div>
          </div>

          {/* 音量調整スライダーバー */}
          <div className="flex items-center justify-end">
            <div className="inline-flex items-center gap-2 bg-slate-950/85 border border-white/10 rounded-full px-3 py-1 backdrop-blur-md shadow-lg">
              <button
                type="button"
                onClick={handleToggleMute}
                className="text-slate-400 hover:text-amber-200 transition focus:outline-none"
                title={soundVolume <= 0.01 ? "ミュート解除" : "ミュート"}
              >
                {soundVolume <= 0.01 ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400/90" />
                ) : soundVolume < 0.5 ? (
                  <Volume1 className="w-3.5 h-3.5 text-amber-200/90" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-amber-200" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={soundVolume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20 sm:w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
                title="瞑想音量"
              />
              <span className="text-[10px] font-mono text-slate-300 min-w-[24px] text-right">
                {Math.round(soundVolume * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* 中央：呼吸する円相タイマーと身体技法（Praxis）ガイド */}
        <div className="my-3 sm:my-5 flex flex-col items-center justify-center w-full text-center">
          {/* 呼吸する光の円相サークル（スマホではコンパクトに調整して見切れを防止） */}
          <div className="relative w-36 h-36 sm:w-48 sm:h-48 flex items-center justify-center mb-3 sm:mb-4">
            <div className="absolute inset-0 rounded-full border border-amber-300/20 animate-pulse-slow" />
            <div
              className="absolute inset-2 sm:inset-3 rounded-full border border-sky-300/25 transition-transform duration-1000"
              style={{
                transform: `scale(${0.92 + Math.sin(secondsLeft * 0.4) * 0.08})`,
              }}
            />
            <div className="flex flex-col items-center">
              <span className="text-[10px] sm:text-[11px] tracking-widest text-amber-200/70 font-serif mb-0.5">
                {secondsLeft > 0 ? "呼吸に身を委ねる" : "静寂の完了"}
              </span>
              <span className="font-serif text-3xl sm:text-4xl font-light tracking-widest text-amber-50">
                {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </span>
              <div className="w-20 sm:w-24 h-1 bg-white/10 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-amber-300/80 transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* 身体技法（Praxis）カード */}
          <div className="w-full rounded-2xl sm:rounded-3xl bg-slate-950/80 border border-white/10 p-3.5 sm:p-5 backdrop-blur-md shadow-xl text-left">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex flex-col">
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 font-serif">
                  <Sparkles className="w-3.5 h-3.5" />
                  円覚寺 身体技法（姿勢と呼吸の作法）
                </span>
                <span className="text-[10px] text-slate-400 font-serif">
                  {activePraxisOffer
                    ? "AIが今のあなたに推薦した作法"
                    : activeSession
                    ? "対話の状況に合わせた作法"
                    : "時間帯に合わせた作法"}
                </span>
              </div>
              <select
                value={currentPraxis.id}
                onChange={(e) => setSelectedPraxisId(e.target.value)}
                className="bg-slate-900/90 border border-white/15 rounded-lg px-2 py-1 text-[11px] text-amber-100 focus:outline-none"
                title="他の作法に切り替える"
              >
                {praxesList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <h3 className="font-serif text-sm sm:text-base font-semibold text-amber-50 mb-1">
              {currentPraxis.name}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
              {currentPraxis.description}
            </p>
            <p className="text-[10px] sm:text-[11px] text-amber-200/70 mt-1.5 font-serif">
              目指す境地：{currentPraxis.target_state}
            </p>
          </div>
        </div>

        {/* 下部：瞑想を終えて問答・心庭へ戻る（余白をしっかり確保） */}
        <div className="flex justify-center pt-1 pb-4 sm:pb-2 shrink-0">
          <button
            type="button"
            onClick={onFinish}
            className="inline-flex items-center gap-2 px-6 py-2.5 sm:py-3 rounded-full bg-amber-500/25 hover:bg-amber-500/35 border border-amber-300/40 text-amber-100 font-serif text-xs sm:text-sm tracking-wider backdrop-blur-md transition shadow-lg active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4 text-amber-300" />
            <span>{activeSession ? "瞑想を終えて問答へ戻る" : "瞑想を終えて心庭へ戻る"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
