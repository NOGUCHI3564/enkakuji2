// 「プロフィールと価値観」設定モーダル（spec.md Version 3.2 第5.1節準拠）
// AIが最適な問いかけを作るためのコンテキスト入力画面。
// 「書きたくないことは空欄のままで構いません」と明記し、心理的安全性を担保する。

import React, { useState } from "react";
import { UserLifeProfile } from "../types/zen";
import { soundEngine } from "../services/soundEngine";
import {
  X,
  Sparkles,
  ShieldCheck,
  Check,
  Compass,
  UserCheck,
  Briefcase,
  HelpCircle,
} from "lucide-react";

interface UserProfileModalProps {
  profile: UserLifeProfile;
  onSaveProfile: (profile: UserLifeProfile) => void;
  onClose: () => void;
}

// 18種類のフラット価値観カード定義
export const CORE_VALUES_OPTIONS: string[] = [
  "社会に貢献",
  "誰かのために",
  "社会を変えたい",
  "気になるテーマで",
  "地域のために",
  "何かを生み出す",
  "自分らしく",
  "夢中になれる",
  "経験と能力を活かす",
  "自分の裁量で",
  "責任を果たす",
  "仲間とともに",
  "家族とともに",
  "仕事も生活も",
  "好きな場所で",
  "自分の時間",
  "心穏やかに",
  "地球にやさしく",
];

const calculateAge = (dateString?: string): string | null => {
  if (!dateString || !dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return null;
  const birth = new Date(dateString);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 && age < 130 ? `${age}歳` : null;
};

const GENDER_OPTIONS = [
  "未設定",
  "男性",
  "女性",
  "その他",
  "回答しない",
];

const ROLE_OPTIONS = [
  "未設定",
  "会社員",
  "経営者・役員",
  "自営業・フリーランス",
  "専門職",
  "公務員",
  "主婦・主夫",
  "学生",
  "退職・シニア",
  "その他",
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  profile,
  onSaveProfile,
  onClose,
}) => {
  const [birthDate, setBirthDate] = useState(
    profile.birthDate &&
      !profile.birthDate.includes("代") &&
      profile.birthDate !== "未設定"
      ? profile.birthDate
      : ""
  );
  const [gender, setGender] = useState(profile.gender || "未設定");
  const [lifeContext, setLifeContext] = useState(profile.lifeContext || "未設定");
  const [currentResponsibilities, setCurrentResponsibilities] = useState(
    profile.currentResponsibilities || ""
  );
  const [pastExperiences, setPastExperiences] = useState(
    profile.pastExperiences || ""
  );
  const [coreValues, setCoreValues] = useState<string[]>(
    profile.coreValues || []
  );
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  const currentAge = calculateAge(birthDate);

  const handleToggleValue = (val: string) => {
    soundEngine.playWaterDrop(1.1);
    if (coreValues.includes(val)) {
      setCoreValues(coreValues.filter((v) => v !== val));
    } else {
      if (coreValues.length < 2) {
        setCoreValues([...coreValues, val]);
      }
    }
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    soundEngine.playWaterDrop(1.2);

    const updated: UserLifeProfile = {
      ...profile,
      birthDate: birthDate.trim(),
      gender: gender === "未設定" ? "" : gender,
      lifeContext: lifeContext === "未設定" ? "" : lifeContext,
      currentResponsibilities: currentResponsibilities.trim(),
      pastExperiences: pastExperiences.trim(),
      coreValues,
      updatedAt: new Date().toISOString(),
    };

    onSaveProfile(updated);
    setFeedbackSaved(true);
    setTimeout(() => {
      onClose();
    }, 450);
  };

  const isLimitReached = coreValues.length >= 2;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-amber-200/25 bg-[#0b1220] p-5 sm:p-7 text-slate-100 shadow-2xl">
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-white/10 transition"
          aria-label="閉じる"
        >
          <X className="w-6 h-6" />
        </button>

        {/* ヘッダー */}
        <div className="mb-6 pr-10">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-amber-50 tracking-wider">
              プロフィールと価値観
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-xs text-emerald-200 font-serif">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              このスマホ内のみ保存
            </span>
          </div>
          <p className="font-serif text-xs sm:text-sm text-amber-200/90 mt-1.5 leading-relaxed">
            AI禅問答があなたの立場や価値観に深く寄り添うための道しるべです。
            <br className="hidden sm:inline" />
            <span className="text-slate-400">
              ※ 書きたくない項目は空欄のままで構いません（すべて任意です）
            </span>
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* セクション1: 背景・経験 */}
          <div className="rounded-2xl bg-slate-950/80 border border-white/10 p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm sm:text-base font-serif font-bold text-amber-100">
              <UserCheck className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <span>1. あなたの背景・経験（任意）</span>
            </div>

            {/* 生年月日・性別・立場 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-slate-400 font-serif">
                    生年月日
                  </label>
                  {currentAge && (
                    <span className="text-[11px] text-amber-300 font-serif font-bold">
                      現在 {currentAge}
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  value={birthDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/15 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400 [color-scheme:dark]"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-serif mb-1">
                  性別
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/15 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                >
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-serif mb-1">
                  立場・役割
                </label>
                <select
                  value={lifeContext}
                  onChange={(e) => setLifeContext(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/15 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 抱えている責任や向き合っていること */}
            <div>
              <label className="block text-xs sm:text-sm text-slate-300 font-serif mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-amber-300/80" />
                <span>いま抱えている責任や向き合っていること</span>
              </label>
              <textarea
                rows={2}
                value={currentResponsibilities}
                onChange={(e) => setCurrentResponsibilities(e.target.value)}
                placeholder="例：新規事業の立ち上げ、チームの育成、親の介護と仕事の両立など"
                className="w-full rounded-xl bg-slate-900 border border-white/15 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
              />
            </div>

            {/* 心に残る経験や転機 */}
            <div>
              <label className="block text-xs sm:text-sm text-slate-300 font-serif mb-1.5 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-300/80" />
                <span>心に残る経験や人生の転機</span>
              </label>
              <textarea
                rows={2}
                value={pastExperiences}
                onChange={(e) => setPastExperiences(e.target.value)}
                placeholder="例：20代での独立・転職、大きな失敗から学んだこと、人生観が変わった出会いなど"
                className="w-full rounded-xl bg-slate-900 border border-white/15 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* セクション2: 18枚のフラット価値観カード */}
          <div className="rounded-2xl bg-slate-950/80 border border-white/10 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-sm sm:text-base font-serif font-bold text-amber-100">
                <Compass className="w-4 h-4 text-amber-300 flex-shrink-0" />
                <span>2. 最も大切にしたい価値観（直感で2つ）</span>
              </div>
              <span
                className={`text-xs font-serif px-2.5 py-0.5 rounded-full border ${
                  isLimitReached
                    ? "bg-amber-500/25 border-amber-400/50 text-amber-200"
                    : "bg-white/5 border-white/10 text-slate-400"
                }`}
              >
                選択中: {coreValues.length} / 2
              </span>
            </div>

            <p className="text-xs text-slate-400 font-serif">
              以下の18個から、いまのあなたが最も大切にしたい言葉を直感で2つ選んでください。
              {isLimitReached && "（他のカードを選ぶには、選んだカードをタップして解除してください）"}
            </p>

            {/* 18枚のフラットグリッドカード */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {CORE_VALUES_OPTIONS.map((val) => {
                const selected = coreValues.includes(val);
                const disabled = !selected && isLimitReached;

                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleToggleValue(val)}
                    disabled={disabled}
                    className={`relative p-3 rounded-xl border text-xs sm:text-sm font-serif font-medium text-center transition-all duration-200 flex items-center justify-center gap-1.5 min-h-[46px] select-none ${
                      selected
                        ? "bg-amber-500/25 border-amber-400 text-amber-50 shadow-md shadow-amber-500/20 scale-[1.02]"
                        : disabled
                        ? "bg-slate-900/40 border-white/5 text-slate-600 opacity-40 cursor-not-allowed"
                        : "bg-slate-900/80 border-white/10 text-slate-300 hover:text-slate-100 hover:border-amber-300/40 hover:bg-slate-900 active:scale-95"
                    }`}
                  >
                    {selected && (
                      <Check className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                    )}
                    <span className="truncate">{val}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 保存ボタン */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-serif font-bold text-base sm:text-lg tracking-wider shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition transform active:scale-[0.99]"
            >
              <Sparkles className="w-5 h-5" />
              <span>{feedbackSaved ? "保存しました" : "保存して心庭へ戻る"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default UserProfileModal;
