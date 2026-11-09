// 円覚寺禅問答・心庭（箱庭）・瞑想PWAアプリ メインコンテナ
// spec.md Version 2.0 に完全準拠
// ホーム画面（GARDEN_HOME）では、中央の箱庭・覚悟の石に一切の文字やバナーが重ならないよう
// 3ゾーン構成（上部ヘッダー / 中央100%オープンな心庭ステージ / 下部ドック＆石カルーセル）を採用。

import React, { useEffect, useState } from "react";
import { useZenStore } from "./store/useZenStore";
import { ZenGardenCanvas } from "./components/ZenGardenCanvas";
import { AssessmentModal } from "./components/AssessmentModal";
import { InquiryOverlay } from "./components/InquiryOverlay";
import { MeditationOverlay } from "./components/MeditationOverlay";
import { StoneManifestationModal } from "./components/StoneManifestationModal";
import { StoneDetailDrawer } from "./components/StoneDetailDrawer";
import { SettingsAndGraphModal } from "./components/SettingsAndGraphModal";
import { LifeMemoriesModal } from "./components/LifeMemoriesModal";
import {
  Sparkles,
  Wind,
  Settings,
  Gem,
  Play,
  Download,
  BookHeart,
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
    lifeProfile,
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
    updateLifeProfile,
  } = useZenStore();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLifeMemoriesOpen, setIsLifeMemoriesOpen] = useState(false);
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
        <div className="fixed inset-0 z-10 flex flex-col justify-between px-4 pt-4 pb-5 sm:px-8 sm:pt-6 sm:pb-7 pointer-events-none">
          {/* 【上部ゾーン】トップヘッダー（左：タイトル / 右：覚悟の石バッジ＆設定ボタン） */}
          <header className="flex items-center justify-between gap-2 pointer-events-auto">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-300/20 text-[10px] text-amber-200/90 font-serif mb-1 backdrop-blur-md">
                <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                <span>臨済宗円覚寺 全脳知識ネットワーク</span>
              </div>
              <div className="flex items-baseline gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-widest text-amber-50 drop-shadow">
                  心 庭
                </h1>
                <span className="font-serif text-xs text-slate-300/80 tracking-wider">
                  — 禅問答と覚悟の石 —
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* 人生の記憶ボタン（いつでも開いて対話的に喜怒哀楽の記憶やプロフィールを記録・編集できる） */}
              <button
                onClick={() => setIsLifeMemoriesOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-900/80 hover:bg-slate-800/90 border border-amber-300/30 text-xs text-amber-100 font-serif backdrop-blur-md shadow-md transition"
                title="人生の記憶（喜・怒・哀・楽の経験とプロフィール）"
              >
                <BookHeart className="w-3.5 h-3.5 text-amber-300" />
                <span>人生の記憶</span>
                {lifeProfile.memories.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-[10px] text-amber-200">
                    {lifeProfile.memories.length}
                  </span>
                )}
              </button>

              {/* 獲得した覚悟の石の個数ステータスバッジ（ヘッダー右上にすっきり配置し、庭と一切重ならない） */}
              {stones.length > 0 && (
                <button
                  onClick={() => selectStone(stones[stones.length - 1])}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-900/80 hover:bg-slate-800/90 border border-amber-400/35 text-xs text-amber-200 font-serif backdrop-blur-md shadow-md transition"
                  title="最新の覚悟の石を振り返る"
                >
                  <Gem className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span className="hidden sm:inline">覚悟の石</span>
                  <span>{stones.length}</span>
                </button>
              )}

              {deferredPrompt && (
                <button
                  onClick={handleInstallPwa}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/40 text-xs text-amber-100 font-serif backdrop-blur-md transition"
                  title="スマートフォンにPWAをインストール"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">追加</span>
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

          {/* 【中央ゾーン】心庭ビューポート（石がある時は完全にクリアにして、石の輝きと砂紋を邪魔しない） */}
          <div className="my-auto flex flex-col items-center text-center pointer-events-none">
            {stones.length === 0 && (
              <div className="max-w-xs sm:max-w-sm rounded-3xl bg-slate-950/55 border border-amber-200/15 px-6 py-5 backdrop-blur-md shadow-2xl">
                <p className="font-serif text-sm sm:text-base text-amber-100 leading-relaxed mb-1.5">
                  静かな光の庭へようこそ
                </p>
                <p className="text-xs text-slate-300/85 leading-relaxed">
                  あなたの「人生の記憶（喜・怒・哀・楽の経験）」や今の思いから禅問答を始めましょう。対話の末にあなたが出した結論が、この庭の中央に光り輝く「覚悟の石」として立ち上がります。
                </p>
              </div>
            )}
          </div>

          {/* 【下部ゾーン】覚悟の石クイック選択ピルバー ＋ メインアクションドック */}
          <footer className="w-full max-w-md mx-auto space-y-2.5 pointer-events-auto">
            {/* 石が1個以上ある場合：下部ドックのすぐ上に、横スクロール可能な小さな石チップ一覧を表示 */}
            {stones.length > 0 && (
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-serif text-amber-200/75 tracking-wide">
                  庭の石、または下の銘をタップして覚悟を振り返る
                </span>
                <div className="w-full flex items-center gap-2 overflow-x-auto py-1 px-1 no-scrollbar justify-start sm:justify-center">
                  {stones.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => selectStone(st)}
                      className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/80 hover:bg-amber-500/20 border border-amber-300/25 text-xs font-serif text-amber-100/90 backdrop-blur-md transition shadow-sm"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
                      <span className="truncate max-w-[130px]">
                        {st.stone_title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 途中のセッションがある場合の再開バー */}
            {activeSession && activeSession.messages.length > 0 && (
              <button
                onClick={() => setViewMode("INQUIRY")}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-900/85 hover:bg-slate-800/95 border border-amber-400/35 text-amber-200 font-serif text-xs flex items-center justify-center gap-2 backdrop-blur-md shadow-lg transition"
              >
                <Play className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                <span>
                  途中の禅問答を再開する（現在{" "}
                  {activeSession.messages.filter((m) => m.role === "user").length}{" "}
                  往復）
                </span>
              </button>
            )}

            {/* メインアクションボタン */}
            <div className="space-y-2 pt-0.5">
              <button
                onClick={startNewAssessment}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500/95 to-amber-600/95 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-serif font-bold text-sm sm:text-base tracking-wider shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition transform active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4" />
                <span>禅問答を始める</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setIsLifeMemoriesOpen(true)}
                  className="py-3 px-3 rounded-2xl bg-slate-900/85 hover:bg-slate-800/95 border border-amber-300/25 text-amber-200 font-serif text-xs sm:text-sm flex items-center justify-center gap-1.5 backdrop-blur-md transition"
                >
                  <BookHeart className="w-4 h-4 text-amber-300" />
                  <span>
                    人生の記憶
                    {lifeProfile.memories.length > 0
                      ? ` (${lifeProfile.memories.length})`
                      : ""}
                  </span>
                </button>

                <button
                  onClick={() =>
                    startMeditation("rain", settings.defaultMeditationMinutes)
                  }
                  className="py-3 px-3 rounded-2xl bg-slate-900/85 hover:bg-slate-800/95 border border-white/15 text-sky-200 font-serif text-xs sm:text-sm flex items-center justify-center gap-1.5 backdrop-blur-md transition"
                >
                  <Wind className="w-4 h-4 text-sky-300" />
                  <span>自然音瞑想</span>
                </button>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* 3. INITIAL_ASSESSMENT（禅問答の開始モーダル：人生の記憶の参照 ＋ 今回の問いの入力） */}
      {viewMode === "INITIAL_ASSESSMENT" && (
        <AssessmentModal
          lifeProfile={lifeProfile}
          onOpenLifeMemories={() => setIsLifeMemoriesOpen(true)}
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

      {/* 9. 人生の記憶（喜・怒・哀・楽の経験とプロフィール）対話入力モーダル */}
      {isLifeMemoriesOpen && (
        <LifeMemoriesModal
          profile={lifeProfile}
          onSaveProfile={updateLifeProfile}
          onClose={() => setIsLifeMemoriesOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
