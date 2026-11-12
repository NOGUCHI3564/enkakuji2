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
import { UserProfileModal } from "./components/UserProfileModal";
import {
  Sparkles,
  Wind,
  Settings,
  Gem,
  Play,
  Download,
  BookHeart,
  ShieldCheck,
  Compass,
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
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [showPrivacyWhisper, setShowPrivacyWhisper] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    initializeApp();

    // 起動時にさりげなく「スマホ内のみ保存（クラウド保存なし）」の安心感を5.5秒だけ伝えて自動で消す
    const showTimer = window.setTimeout(() => setShowPrivacyWhisper(true), 400);
    const hideTimer = window.setTimeout(
      () => setShowPrivacyWhisper(false),
      6000
    );

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, [initializeApp]);

  const triggerPrivacyWhisper = () => {
    setShowPrivacyWhisper(true);
    window.setTimeout(() => setShowPrivacyWhisper(false), 4500);
  };

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

      {/* 2. GARDEN_HOME（心庭ホーム画面）のオーバーレイUI：余計な説明を排し、余白とガラス銀河球を主役にする */}
      {viewMode === "GARDEN_HOME" && (
        <div className="fixed inset-0 z-10 flex flex-col justify-between px-5 pt-5 pb-6 sm:px-8 sm:pt-7 sm:pb-8 pointer-events-none">
          {/* 【上部ゾーン】ミニマルヘッダー（左：心庭 ＋ 端末内保存マーク / 右：記憶・石・設定） */}
          <header className="flex items-center justify-between gap-2 pointer-events-auto">
            <div className="flex items-center gap-2.5">
              <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-[0.28em] text-amber-50/95 drop-shadow">
                心 庭
              </h1>
              <button
                type="button"
                onClick={triggerPrivacyWhisper}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-emerald-400/20 text-[11px] text-emerald-200/80 font-serif transition"
                title="プライバシー保護について確認"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-300/90" />
                <span>端末内保存</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsUserProfileOpen(true)}
                className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs text-amber-100/90 font-serif backdrop-blur-md transition"
                title="プロフィールと価値観"
              >
                <Compass className="w-3.5 h-3.5 text-amber-300/90" />
                <span>価値観</span>
                {lifeProfile.coreValues && lifeProfile.coreValues.length > 0 ? (
                  <span className="text-amber-300 font-sans text-[11px]">
                    {lifeProfile.coreValues.length}
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setIsLifeMemoriesOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs text-amber-100/90 font-serif backdrop-blur-md transition"
                title="人生の記憶"
              >
                <BookHeart className="w-3.5 h-3.5 text-amber-300/90" />
                <span>記憶</span>
                {lifeProfile.memories.length > 0 && (
                  <span className="text-amber-300 font-sans text-[11px]">
                    {lifeProfile.memories.length}
                  </span>
                )}
              </button>

              {stones.length > 0 && (
                <button
                  onClick={() => selectStone(stones[stones.length - 1])}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-amber-400/25 text-xs text-amber-200 font-serif backdrop-blur-md transition"
                  title="覚悟の石を振り返る"
                >
                  <Gem className="w-3.5 h-3.5 text-amber-300" />
                  <span>{stones.length}</span>
                </button>
              )}

              {deferredPrompt && (
                <button
                  onClick={handleInstallPwa}
                  className="p-2 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-100 backdrop-blur-md transition"
                  title="アプリを追加"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-amber-200 backdrop-blur-md transition"
                aria-label="設定"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* 【中央ゾーン】完全な余白（3Dガラス球と渦状銀河・覚悟の石だけを美しく見せる） */}
          <div className="my-auto pointer-events-none" />

          {/* 【下部ゾーン】余白を活かしたスリークなアクションバー */}
          <footer className="w-full max-w-sm mx-auto space-y-2.5 pointer-events-auto">
            {/* 石が1個以上ある場合：極薄のガラスピルで銘だけを静かに並べる */}
            {stones.length > 0 && (
              <div className="w-full flex items-center gap-1.5 overflow-x-auto py-1 px-1 no-scrollbar justify-start sm:justify-center">
                {stones.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => selectStone(st)}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] hover:bg-amber-500/20 border border-white/10 text-xs font-serif text-amber-100/85 backdrop-blur-md transition"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                    <span className="truncate max-w-[120px]">
                      {st.stone_title}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* 途中のセッションがある場合の再開バー */}
            {activeSession && activeSession.messages.length > 0 && (
              <button
                onClick={() => setViewMode("INQUIRY")}
                className="w-full py-2 px-4 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-amber-300/30 text-amber-200 font-serif text-xs flex items-center justify-center gap-2 backdrop-blur-md transition"
              >
                <Play className="w-3 h-3 fill-amber-300 text-amber-300" />
                <span>途中の対話を再開</span>
              </button>
            )}

            {/* メインアクション（グラスモーフィズムの洗練されたピルボタン） */}
            <div className="flex items-center gap-2">
              <button
                onClick={startNewAssessment}
                className="flex-1 py-3.5 px-6 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-amber-200/30 text-amber-50 font-serif text-sm sm:text-base tracking-[0.2em] backdrop-blur-md shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>禅問答を始める</span>
              </button>

              <button
                onClick={() =>
                  startMeditation("rain", settings.defaultMeditationMinutes)
                }
                className="p-3.5 rounded-full bg-white/[0.05] hover:bg-white/[0.12] border border-white/15 text-sky-200/90 backdrop-blur-md transition"
                title="自然音瞑想"
              >
                <Wind className="w-4 h-4" />
              </button>
            </div>
          </footer>
        </div>
      )}

      {/* さりげないプライバシー安心トースト（起動時または「端末内保存」タップ時に数秒だけふわっと表示して自動で消える） */}
      <div
        className={`fixed top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-all duration-700 ${
          showPrivacyWhisper
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2"
        }`}
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-950/85 border border-emerald-400/35 text-xs sm:text-sm text-emerald-100 font-serif backdrop-blur-md shadow-xl whitespace-nowrap">
          <ShieldCheck className="w-4 h-4 text-emerald-300 flex-shrink-0" />
          <span>記録はクラウドに残らず、このスマホ内だけに保存されます</span>
        </div>
      </div>

      {/* 3. INITIAL_ASSESSMENT（禅問答の開始モーダル：人生の記憶の参照 ＋ 今回の問いの入力） */}
      {viewMode === "INITIAL_ASSESSMENT" && (
        <AssessmentModal
          lifeProfile={lifeProfile}
          onOpenLifeMemories={() => setIsLifeMemoriesOpen(true)}
          onOpenUserProfile={() => setIsUserProfileOpen(true)}
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

      {/* 10. プロフィールと価値観（18枚のフラットカードから2枚選択）モーダル */}
      {isUserProfileOpen && (
        <UserProfileModal
          profile={lifeProfile}
          onSaveProfile={updateLifeProfile}
          onClose={() => setIsUserProfileOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
