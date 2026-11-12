// AI禅問答エンジン ＆ 対話型「人生の記憶」整理サービス
// 1. Supabase Edge Functions (`zen-dialogue`) 経由で OpenRouter (Gemini Flash 3.8) を呼び出す。
// 2. `organizeLifeMemoriesWithAI`: スマホの音声入力や自由対話で語られたテキストを Edge Function に送り、
//    生年月日・性別・現在の背景、および「喜・怒・哀・楽」の記憶リストに自動構造化して返す。
// 3. `requestZenDialogue`: 蓄積された「人生の記憶」＋「直近5〜10往復の対話履歴」＋「全脳知識ネットワーク全文」を包括して推論する。

import knowledgeGraph from "../../knowledge_graph.json";
import {
  EmotionAssessment,
  DialogueMessage,
  ZenAIResponse,
  AppSettings,
  LightMood,
  StoneColorTheme,
  StoneShapeType,
  SoundType,
  UserLifeProfile,
  EmotionCategory,
} from "../types/zen";

const EDGE_FUNCTION_URL =
  import.meta.env.VITE_SUPABASE_EDGE_URL ||
  "https://nybcarmfsnqqfuebdaoq.supabase.co/functions/v1/zen-dialogue";

export interface OrganizedMemoriesResult {
  reply_message: string;
  next_prompt: string;
  extracted_profile: {
    birthDate?: string | null;
    gender?: string | null;
    lifeContext?: string | null;
  };
  extracted_memories: Array<{
    emotion: EmotionCategory;
    period?: string;
    content: string;
  }>;
}

// ユーザーが音声や自由記述で語った内容を Edge Function で整理・リスト化する
export async function organizeLifeMemoriesWithAI(
  rawNarrative: string,
  existingProfile: UserLifeProfile
): Promise<OrganizedMemoriesResult> {
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (supabaseAnonKey) {
      headers["Authorization"] = `Bearer ${supabaseAnonKey}`;
      headers["apikey"] = supabaseAnonKey;
    }

    const res = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "organize_memories",
        rawNarrative,
        existingProfile,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as OrganizedMemoriesResult;
      if (data && Array.isArray(data.extracted_memories)) {
        return data;
      }
    }
  } catch (err) {
    console.warn("Edge Function organize_memories fallback:", err);
  }

  // オフライン時のローカル文脈分解フォールバック
  const sentences = rawNarrative
    .split(/[。！？\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4);

  const extractedMemories: Array<{
    emotion: EmotionCategory;
    period?: string;
    content: string;
  }> = [];

  let birthDate: string | null = null;
  let gender: string | null = null;
  let lifeContext: string | null = null;

  sentences.forEach((s) => {
    const birthMatch = s.match(/(\d{4}年|\d{2}代|昭和\d+年|平成\d+年)/);
    if (birthMatch && !birthDate) birthDate = birthMatch[0];
    if (/男性|男です|父として/.test(s) && !gender) gender = "男性";
    if (/女性|女です|母として/.test(s) && !gender) gender = "女性";
    if (/仕事|会社|経営|働|暮ら|家庭|引退|定年|学生/.test(s) && !lifeContext) {
      lifeContext = s;
    }

    let emotion: EmotionCategory = "ki";
    if (/怒|腹が立|許せ|悔し|理不尽|苛立|喧嘩/.test(s)) {
      emotion = "do";
    } else if (/悲し|辛|寂し|亡く|別れ|失|泣|後悔|苦し/.test(s)) {
      emotion = "ai";
    } else if (/楽し|安ら|好き|趣味|癒や|穏やか|幸せ|旅行/.test(s)) {
      emotion = "raku";
    } else if (/嬉し|喜|達成|生まれ|合格|感謝|誇り/.test(s)) {
      emotion = "ki";
    }

    const periodMatch = s.match(
      /(子供の頃|学生時代|\d+代の頃|若い頃|去年|昨年|先月|\d+年前|最近|昔)/
    );

    extractedMemories.push({
      emotion,
      period: periodMatch ? periodMatch[0] : undefined,
      content: s,
    });
  });

  return {
    reply_message:
      "大切なお話を聞かせていただき、ありがとうございます。語られた言葉を「喜・怒・哀・楽」の記憶としてスマートフォン内に整理しました。",
    next_prompt:
      "ほかにも思い出された出来事があれば、いつでもマイクや文字でお話しください。",
    extracted_profile: { birthDate, gender, lifeContext },
    extracted_memories:
      extractedMemories.length > 0
        ? extractedMemories
        : [{ emotion: "ki", content: rawNarrative.trim() }],
  };
}

interface ChatRequestPayload {
  action: "dialogue";
  assessment: EmotionAssessment;
  history: Array<{
    role: "user" | "assistant";
    content: string;
    phase?: 1 | 2 | 3;
  }>;
  turnCount: number;
  requestConclusion: boolean;
}

// ユーザーの「人生の記憶」と発言から最適な苦悩ノード (sufferings) を推定するローカル知識グラフ推論
function estimateSufferingFromGraph(
  assessment: EmotionAssessment,
  text: string
): keyof typeof knowledgeGraph.sufferings {
  const memoriesText = (assessment.lifeProfileSnapshot?.memories || [])
    .map((m) => m.content)
    .join(" ");
  const combined = `${assessment.initialConcern || ""} ${text} ${memoriesText}`;

  if (/完璧|もっと|成果|限界|疲れ|燃え尽き|頑張|手放せ/.test(combined)) {
    return "Suf_PerfectionismBurnout";
  }
  if (/別れ|亡く|失っ|喪失|過去|後悔|悲し/.test(combined)) {
    return "Suf_Grief";
  }
  if (/失敗|責任|プレッシャー|怖|恐|うまくいか/.test(combined)) {
    return "Suf_FearOfFailure";
  }
  if (/孤独|ひとり|理解され|誰も|孤立|怒|許せ/.test(combined)) {
    return "Suf_Isolation";
  }
  if (/老い|病|体|衰え|動けな|気力/.test(combined)) {
    return "Suf_Decline";
  }
  return "Suf_Anxiety";
}

function generateLocalKnowledgeGraphResponse(
  payload: ChatRequestPayload
): ZenAIResponse {
  const userMessages = payload.history.filter((m) => m.role === "user");
  const lastUserText =
    userMessages[userMessages.length - 1]?.content ||
    payload.assessment.initialConcern ||
    "";
  const allUserText = userMessages.map((m) => m.content).join(" / ");
  const sufferingId = estimateSufferingFromGraph(
    payload.assessment,
    allUserText
  );
  const suffering = knowledgeGraph.sufferings[sufferingId];

  const turn = payload.turnCount;
  const currentPhase: 1 | 2 | 3 = turn <= 2 ? 1 : turn <= 5 ? 2 : 3;

  const transformStep =
    suffering.transforms_to_ids.find((t) => t.phase === currentPhase) ||
    suffering.transforms_to_ids[0];
  const targetWisdomId =
    transformStep.target_id as keyof typeof knowledgeGraph.wisdoms;
  const wisdom = knowledgeGraph.wisdoms[targetWisdomId];

  const moodMap: Record<string, LightMood> = {
    accepting: "moon_accept",
    transcendent: "ocean_deep",
    resolute: "gold_resolute",
    solidarity: "sakura_compassion",
  };
  const lightMood: LightMood = moodMap[wisdom.orientation] || "amber_calm";

  const hasResolutionKeywords =
    turn >= 5 &&
    /思[うい]|してみ[るよう]|手放|歩[くい]|受け入|大切|感謝|やってみ|いいんだ|決め|肚/.test(
      lastUserText
    );

  if (payload.requestConclusion || hasResolutionKeywords || turn >= 8) {
    const finalWisdomId = (
      turn >= 5 ? "Wis_RealJoyInPain" : targetWisdomId
    ) as keyof typeof knowledgeGraph.wisdoms;
    const finalWisdom = knowledgeGraph.wisdoms[finalWisdomId] || wisdom;
    const discourseId =
      finalWisdom.discourse_ids[0] as keyof typeof knowledgeGraph.discourses;
    const discourse = knowledgeGraph.discourses[discourseId];
    const master =
      knowledgeGraph.masters[
        discourse.speaker_id as keyof typeof knowledgeGraph.masters
      ];

    const colorMap: Record<string, StoneColorTheme> = {
      accepting: "emerald_glow",
      transcendent: "sapphire_zen",
      resolute: "golden_resolve",
      solidarity: "lotus_warm",
    };
    const shapeList: StoneShapeType[] = [
      "crystal_zen",
      "standing_monolith",
      "round_pebble",
      "moss_jewel",
    ];
    const shapeType = shapeList[turn % shapeList.length];

    const conclusionSummary = lastUserText
      ? `「${lastUserText.slice(0, 65)}」—— 人生の喜怒哀楽の記憶を抱きしめながら、今この足元から自らの道を歩むという静かな覚悟が結ばれました。`
      : `これまでの人生の歩みと「${suffering.name}」を見つめ、作為を手放して今できる一歩を踏み出す覚悟が定まりました。`;

    return {
      response_type: "resolution_stone",
      analysis: {
        estimated_suffering_id: sufferingId,
        current_phase: 3,
        target_wisdom_id: finalWisdom.id,
        light_mood: "gold_resolute",
      },
      message: `あなたの言葉の奥に、静かで揺るぎない光が宿りました。ここまでの問答の結晶が、心の庭に「覚悟の石」として立ち上がります。`,
      resolution_stone: {
        stone_title: `${wisdom.name.split("（")[0]}・覚悟の石`,
        user_conclusion: conclusionSummary,
        wisdom_id: finalWisdom.id,
        wisdom_name: finalWisdom.name,
        discourse: {
          discourse_id: discourse.id,
          master_name: master.name,
          quote: discourse.quote,
          source_title: discourse.source_title,
          source_url: discourse.source_url,
        },
        stone_visual: {
          color_theme: colorMap[finalWisdom.orientation] || "golden_resolve",
          glow_intensity: 0.96,
          shape_type: shapeType,
        },
      },
    };
  }

  if (turn === 5) {
    const praxisId = (wisdom.praxis_ids[0] ||
      "Pra_SurrenderBreath") as keyof typeof knowledgeGraph.praxes;
    const praxis = knowledgeGraph.praxes[praxisId];
    const soundMap: Record<string, SoundType> = {
      Pra_OpenHandSurrender: "rain",
      Pra_SurrenderBreath: "waves",
      Pra_SweepingSamu: "forest",
      Pra_TandenBreathing: "silence",
      Pra_GasshoRecitation: "stream",
      Pra_ChairZazen: "forest",
    };
    return {
      response_type: "praxis_offer",
      analysis: {
        estimated_suffering_id: sufferingId,
        current_phase: 2,
        target_wisdom_id: wisdom.id,
        light_mood: lightMood,
      },
      message: `言葉を重ねて、少し心の奥が見えてきましたね。ここで一度、思考の糸を休めて「${praxis.name}」と自然の音に身を委ねてみませんか。`,
      praxis_offer: {
        praxis_id: praxis.id,
        praxis_name: praxis.name,
        guide_text: praxis.description,
        recommended_sound: soundMap[praxis.id] || "rain",
        duration_min: praxis.duration_min || 3,
      },
    };
  }

  const profile = payload.assessment.lifeProfileSnapshot;
  const values = profile?.coreValues || [];
  const primaryValue = values.length > 0 ? `【${values.join("・")}】` : "";
  const roleHint = profile?.lifeContext ? `${profile.lifeContext}として歩む中で、` : "";

  const memories = profile?.memories || [];
  const sampleMemory = memories[turn % Math.max(1, memories.length)];
  const memoryHint = sampleMemory
    ? `かつて「${sampleMemory.content.slice(0, 18)}…」と経験されたあなたにとって、`
    : roleHint;

  const snippet = lastUserText
    ? `「${lastUserText.slice(0, 18)}${lastUserText.length > 18 ? "…" : ""}」`
    : "その思い";

  // Base Phase（純粋なコーチング・傾聴と自己探索）から始まり、深まった段階で Zen Shift（禅の揺らぎ）へ移行する問い群
  const phaseQuestions: Record<1 | 2 | 3, string[]> = {
    1: [
      // Base Phase 1: 傾聴と現状探索（禅の用語・比喩は一切使わない）
      `${memoryHint}${snippet}という思いを抱えていらっしゃるのですね。${primaryValue ? `${primaryValue}を大切にされているあなたにとって、` : ""}その状況やプレッシャーを一番強く感じるのは、日々のどんな瞬間でしょうか。`,
      // Base Phase 2: 心の重荷の特定
      `その状況の中で、いま何が一番ご自身の心を重く、焦らせていると感じますか。静かに思い浮かぶことを教えてください。`,
      // Base Phase 3: 内省・無意識のルールの探索
      `そのお気持ちの奥で、無意識に「こうでなければならない」と自分自身を縛っているルールがあるとしたら、それはどんな言葉でしょうか。`,
    ],
    2: [
      // Zen Shift: 丸木橋の手放し（ここで初めて思考の枠組みを外す比喩を投入）
      `もし今、丸木橋から手を離しても「下には柔らかい蒲団がある」としたら、あなたが一番に手放したい力みは何ですか。`,
      // Base Phase: 価値観コンパスによる本質深掘り
      `${primaryValue ? `${primaryValue}という原点に立ち返ったとき、` : ""}${snippet}の奥で、あなたが本当に守り抜きたいものは何でしょうか。`,
      // Zen Shift: 大海と一滴
      `大海に浮かぶ一滴の泡のように、これまでの歩みも今の悩みも大きな命の流れの中にあります。10年後の静かな場所から今を見つめたら、何が見えますか。`,
    ],
    3: [
      // Phase 3: 主体的覚悟への収束
      `朝比奈宗源老師は「道は吾である」と説かれました。これまでの歩みをすべて自らの道として引き受けるなら、今日ここからどんな小さな一歩を選びますか。`,
      `ここまで心を静かに見つめてきて、いまあなたの肚（はら）の底から湧いてくる「自分の結論」をひと言で表すなら、どんな言葉になりますか。`,
    ],
  };

  const candidates = phaseQuestions[currentPhase];
  const questionText = candidates[(turn - 1) % candidates.length];

  return {
    response_type: "question",
    analysis: {
      estimated_suffering_id: sufferingId,
      current_phase: currentPhase,
      target_wisdom_id: wisdom.id,
      light_mood: lightMood,
    },
    message: questionText,
  };
}

export async function requestZenDialogue(
  assessment: EmotionAssessment,
  messages: DialogueMessage[],
  requestConclusion: boolean,
  _settings?: AppSettings
): Promise<ZenAIResponse> {
  const recentHistory = messages.slice(-20).map((m) => ({
    role: m.role,
    content: m.content,
    phase: m.phase,
  }));

  const userTurnCount = messages.filter((m) => m.role === "user").length + 1;

  const payload: ChatRequestPayload = {
    action: "dialogue",
    assessment,
    history: recentHistory,
    turnCount: userTurnCount,
    requestConclusion,
  };

  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (EDGE_FUNCTION_URL && EDGE_FUNCTION_URL.startsWith("http")) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (supabaseAnonKey) {
        headers["Authorization"] = `Bearer ${supabaseAnonKey}`;
        headers["apikey"] = supabaseAnonKey;
      }

      const res = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = (await res.json()) as ZenAIResponse;
        if (data && data.response_type && data.message) {
          return data;
        }
      }
    } catch (err) {
      console.warn("Supabase Edge Function call failed, trying fallback:", err);
    }
  }

  await new Promise((r) => setTimeout(r, 650));
  return generateLocalKnowledgeGraphResponse(payload);
}
