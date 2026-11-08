// 円覚寺禅問答・心庭（箱庭）・瞑想PWAアプリ メインコンテナ
// spec.md Version 2.0 に完全準拠

import React, { useEffect, useState } from "react";
import { useZenStore } from "./store/useZenStore";
import { ZenGardenCanvas } from "./components/ZenGardenCanvas";
import { AssessmentModal } from "./components/AssessmentModal";
import { InquiryOverlay } from "./components/InquiryOverlay";
import { MeditationOverlay } from "./components/MeditationOverlay";
import { StoneManifestationModal } from "./components/StoneManifestationModal";
import { StoneDetailDrawer } from "./components/StoneDetailDrawer";
import { SettingsAndGraphModal } from "./components/SettingsAndGraphModal";
import {
  Sparkles,
  Wind,
  Settings,
  Gem,
  Play,
  Download,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const App: React.FC = () => {
  const {
    viewMode,
    stones,
    selectedStone,
    activeSession,
    settings,
    isLoadingAI,
    ambientSound,
    meditationSecondsLeft,
    meditationTotalSeconds,
    isMeditationPlaying,
    NewlyManifestedStone,
    rippleTrigger,
    initializeApp,
    setViewMode,
    selectStone,
    startNewAssessment,
    beginInquirySession,
    sendUserReply,
    requestConclusionStone,
    startMeditation,
    tickMeditation,
    finishMeditation,
    dismissPraxisOfferAndContinue,
    completeStoneManifestation,
    removeStone,
    resetAllLocalData,
    updateSettings,
  } = useZenStore();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    initializeApp();

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, [initializeApp]);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    setDeferredPrompt(null);
  };

  const currentLightMood =
    activeSession?.currentLightMood ||
    (stones.length > 0 ? "gold_resolute" : "amber_calm");

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#070b14] text-slate-100">
      {/* 1. 常時背景で光を放つ 2.5D 禅の箱庭（心の庭）キャンバス */}
      <ZenGardenCanvas
        lightMood={currentLightMood}
        stones={stones}
        selectedStoneId={selectedStone?.id}
        onSelectStone={(st) => selectStone(st)}
        ambientSound={ambientSound}
        rippleTrigger={rippleTrigger}
        isMeditationMode={viewMode === "PRAXIS_MEDITATION"}
      />

      {/* 2. GARDEN_HOME（心庭ホーム画面）のオーバーレイUI */}
      {viewMode === "GARDEN_HOME" && (
        <div className="fixed inset-0 z-10 flex flex-col justify-between p-5 sm:p-8 pointer-events-none">
          {/* トップヘッダー */}
          <header className="flex items-start justify-between gap-3 pointer-events-auto">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-300/20 text-[11px] text-amber-200/90 font-serif mb-1.5 backdrop-blur-md">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>臨済宗円覚寺 全脳知識ネットワーク × 心庭</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-widest text-amber-50 drop-shadow">
                心 庭{" "}
                <span className="text-sm font-normal text-slate-300/80 tracking-normal">
                  — 禅問答と覚悟の石 —
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {deferredPrompt && (
                <button
                  onClick={handleInstallPwa}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/40 text-xs text-amber-100 font-serif backdrop-blur-md transition"
                  title="スマートフォンにPWAをインストール"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">アプリをインストール</span>
                </button>
              )}

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2.5 rounded-full bg-slate-900/75 hover:bg-slate-800/90 border border-white/10 text-slate-300 hover:text-amber-200 backdrop-blur-md transition"
                aria-label="設定と全脳知識ネットワーク"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* 中央ガイド（庭の覚悟の石の案内） */}
          <div className="my-auto flex flex-col items-center text-center pointer-events-none">
            {stones.length === 0 ? (
              <div className="max-w-sm rounded-3xl bg-slate-950/45 border border-white/10 px-6 py-5 backdrop-blur-sm">
                <p className="font-serif text-sm sm:text-base text-amber-100/90 leading-relaxed mb-1">
                  静かな光の庭へようこそ。
                </p>
                <p className="text-xs text-slate-300/80 leading-relaxed">
                  今の「喜・怒・哀・楽」から禅問答を始めましょう。5〜10往復の対話の末にあなたが出した結論が、この庭に光り輝く「覚悟の石」として立ち上がります。
                </p>
              </div>
            ) : (
              <div className="mt-44 sm:mt-52 px-4 py-1.5 rounded-full bg-slate-950/60 border border-amber-300/20 backdrop-blur-md">
                <p className="text-xs font-serif text-amber-200/90 flex items-center gap-1.5">
                  <Gem className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>
                    心の庭に {stones.length} 個の「覚悟の石」が輝いています（石をタップして振り返る）
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* ボトムアクションバー */}
          <footer className="w-full max-w-md mx-auto space-y-3 pointer-events-auto">
            {activeSession && activeSession.messages.length > 0 && (
              <button
                onClick={() => setViewMode("INQUIRY")}
                className="w-full py-3 px-5 rounded-2xl bg-slate-900/85 hover:bg-slate-800/95 border border-amber-400/35 text-amber-200 font-serif text-xs sm:text-sm flex items-center justify-center gap-2 backdrop-blur-md shadow-lg transition"
              >
                <Play className="w-4 h-4 fill-amber-300 text-amber-300" />
                <span>
                  途中の禅問答を再開する（現在{" "}
                  {activeSession.messages.filter((m) => m.role === "user").length}{" "}
                  往復）
                </span>
              </button>
            )}

            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={startNewAssessment}
                className="col-span-2 py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-500/90 to-amber-600/90 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-serif font-bold text-sm sm:text-base tracking-wider shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition transform active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4" />
                <span>禅問答を始める</span>
              </button>

              <button
                onClick={() => startMeditation("rain", settings.defaultMeditationMinutes)}
                className="py-4 px-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-white/15 text-sky-200 font-serif text-xs sm:text-sm flex items-center justify-center gap-1.5 backdrop-blur-md transition"
              >
                <Wind className="w-4 h-4 text-sky-300" />
                <span>自然音瞑想</span>
              </button>
            </div>
          </footer>
        </div>
      )}

      {/* 3. INITIAL_ASSESSMENT（喜・怒・哀・楽の初期入力モーダル） */}
      {viewMode === "INITIAL_ASSESSMENT" && (
        <AssessmentModal
          onStart={(assessment) => beginInquirySession(assessment)}
          onCancel={() => setViewMode("GARDEN_HOME")}
        />
      )}

      {/* 4. INQUIRY（5〜10往復のAI禅問答画面） */}
      {viewMode === "INQUIRY" && activeSession && (
        <InquiryOverlay
          session={activeSession}
          isLoading={isLoadingAI}
          onSendMessage={(text) => sendUserReply(text)}
          onRequestConclusion={() => requestConclusionStone()}
          onStartMeditation={(sound, mins) => startMeditation(sound, mins)}
          onDismissPraxis={() => dismissPraxisOfferAndContinue()}
          onBackToGarden={() => setViewMode("GARDEN_HOME")}
        />
      )}

      {/* 5. PRAXIS_MEDITATION（身体技法 & 自然環境音瞑想モード） */}
      {viewMode === "PRAXIS_MEDITATION" && (
        <MeditationOverlay
          ambientSound={ambientSound}
          secondsLeft={meditationSecondsLeft}
          totalSeconds={meditationTotalSeconds}
          isPlaying={isMeditationPlaying}
          activePraxisOffer={activeSession?.activePraxisOffer}
          onChangeSound={(sound, mins) => startMeditation(sound, mins)}
          onTick={tickMeditation}
          onFinish={finishMeditation}
        />
      )}

      {/* 6. STONE_MANIFESTATION（「覚悟の石」がピカピカと光って立ち上がるクライマックス画面） */}
      {viewMode === "STONE_MANIFESTATION" && NewlyManifestedStone && (
        <StoneManifestationModal
          stone={NewlyManifestedStone}
          onComplete={completeStoneManifestation}
        />
      )}

      {/* 7. 庭の「覚悟の石」タップ時の詳細振り返りドロワー */}
      {selectedStone && viewMode === "GARDEN_HOME" && (
        <StoneDetailDrawer
          stone={selectedStone}
          onClose={() => selectStone(null)}
          onDelete={(id) => removeStone(id)}
        />
      )}

      {/* 8. 設定 & 全脳知識ネットワーク閲覧モーダル */}
      {isSettingsOpen && (
        <SettingsAndGraphModal
          settings={settings}
          stonesCount={stones.length}
          onUpdateSettings={(partial) => updateSettings(partial)}
          onResetAllData={resetAllLocalData}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
