// 自然環境音瞑想 & 円覚寺身体技法（praxes）モード画面
// spec.md 5.3節・第6章に準拠:
// 対話UIを最小化し、雨・波・森・小川・静寂の自然環境音と、
// knowledge_graph.json の7つの身体技法を選択・実践できる深い没入画面。

import React, { useEffect, useState } from "react";
import knowledgeGraph from "../../knowledge_graph.json";
import { SoundType, PraxisOffer } from "../types/zen";
import {
  CloudRain,
  Waves,
  Trees,
  Droplets,
  VolumeX,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface MeditationOverlayProps {
  ambientSound: SoundType;
  secondsLeft: number;
  totalSeconds: number;
  isPlaying: boolean;
  activePraxisOffer?: PraxisOffer | null;
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

export const MeditationOverlay: React.FC<MeditationOverlayProps> = ({
  ambientSound,
  secondsLeft,
  totalSeconds,
  isPlaying,
  activePraxisOffer,
  onChangeSound,
  onTick,
  onFinish,
}) => {
  const praxesList = Object.values(knowledgeGraph.praxes);
  const [selectedPraxisId, setSelectedPraxisId] = useState<string>(
    activePraxisOffer?.praxis_id || "Pra_OpenHandSurrender"
  );
  const currentMinutes = Math.round(totalSeconds / 60) || 3;

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
    <div className="fixed inset-0 z-10 flex flex-col justify-between p-5 sm:p-8 pointer-events-none">
      {/* 上部：音源選択と時間選択 */}
      <div className="flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        <div className="flex items-center gap-1.5 bg-slate-950/75 border border-white/10 rounded-full p-1 backdrop-blur-md">
          {SOUND_OPTIONS.map((s) => {
            const active = ambientSound === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  onChangeSound(s.id, currentMinutes);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition ${
                  active
                    ? "bg-amber-500/25 text-amber-200 border border-amber-400/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {s.icon}
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 bg-slate-950/75 border border-white/10 rounded-full p-1 backdrop-blur-md">
          {DURATION_OPTIONS.map((m) => (
            <button
              key={m}
              onClick={() => onChangeSound(ambientSound, m)}
              className={`px-3 py-1 rounded-full text-xs transition ${
                currentMinutes === m
                  ? "bg-sky-500/25 text-sky-200 border border-sky-400/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {m}分
            </button>
          ))}
        </div>
      </div>

      {/* 中央：呼吸する円相タイマーと身体技法（Praxis）ガイド */}
      <div className="my-auto flex flex-col items-center justify-center max-w-md mx-auto w-full text-center pointer-events-auto">
        {/* 呼吸する光の円相サークル */}
        <div className="relative w-52 h-52 flex items-center justify-center mb-6">
          <div className="absolute inset-0 rounded-full border border-amber-300/20 animate-pulse-slow" />
          <div
            className="absolute inset-3 rounded-full border border-sky-300/25 transition-transform duration-1000"
            style={{
              transform: `scale(${0.92 + Math.sin(secondsLeft * 0.4) * 0.08})`,
            }}
          />
          <div className="flex flex-col items-center">
            <span className="text-[11px] tracking-widest text-amber-200/70 font-serif mb-1">
              {secondsLeft > 0 ? "呼吸に身を委ねる" : "静寂の完了"}
            </span>
            <span className="font-serif text-4xl font-light tracking-widest text-amber-50">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
            <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-amber-300/80 transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* 身体技法（Praxis）カード */}
        <div className="w-full rounded-3xl bg-slate-950/70 border border-white/10 p-5 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 font-serif">
              <Sparkles className="w-3.5 h-3.5" />
              円覚寺 身体技法（Praxis）
            </span>
            <select
              value={currentPraxis.id}
              onChange={(e) => setSelectedPraxisId(e.target.value)}
              className="bg-slate-900/90 border border-white/15 rounded-xl px-2.5 py-1 text-xs text-amber-100 focus:outline-none"
            >
              {praxesList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <h3 className="font-serif text-base font-semibold text-amber-50 mb-1.5">
            {currentPraxis.name}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {currentPraxis.description}
          </p>
          <p className="text-[11px] text-amber-200/70 mt-2 font-serif">
            目指す境地：{currentPraxis.target_state}
          </p>
        </div>
      </div>

      {/* 下部：瞑想を終えて問答・心庭へ戻る */}
      <div className="flex justify-center pointer-events-auto">
        <button
          onClick={onFinish}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-500/20 hover:bg-amber-500/35 border border-amber-300/40 text-amber-100 font-serif text-sm tracking-wider backdrop-blur-md transition shadow-lg"
        >
          <CheckCircle2 className="w-4 h-4 text-amber-300" />
          <span>瞑想を終えて戻る</span>
        </button>
      </div>
    </div>
  );
};
