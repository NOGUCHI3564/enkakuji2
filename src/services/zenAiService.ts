// AI禅問答エンジン サービス
// 1. Supabase Edge Functions (`zen-dialogue`) 経由で OpenRouter (Gemini Flash 3.8) を呼び出す。
// 2. 常に直近5〜10往復の対話履歴と、全脳知識ネットワーク (`knowledge_graph.json`) 全文を包括して推論する。
// 3. オフライン時やEdge未接続時でも、全脳知識ネットワークを用いた自律エンジンで途切れない禅問答と「覚悟の石」生成を保証する。

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
} from "../types/zen";

interface ChatRequestPayload {
  assessment: EmotionAssessment;
  history: Array<{
    role: "user" | "assistant";
    content: string;
    phase?: 1 | 2 | 3;
  }>;
  turnCount: number;
  requestConclusion: boolean;
}

function buildSystemPromptForLLM(payload: ChatRequestPayload): string {
  const { assessment, turnCount, requestConclusion } = payload;

  return `あなたは臨済宗大本山円覚寺の法脈（朝比奈宗源老師、横田南嶺老師、盤珪永琢禅師の不生禅）を体現する「AI禅問答師」です。
正解を一方的に押し付けるのではなく、静謐で慈悲深い問いかけを通じてユーザー自身の内省と気づきを促し、最終的にユーザーが自らの肚（はら）を据えて導き出した結論を「覚悟の石（Stone of Resolution）」として心の庭に結晶化させる伴走者です。

## 1. 全脳知識ネットワーク（KNOWLEDGE_GRAPH）の完全包括
以下のJSONは、円覚寺の師家（masters）、法話（discourses）、身体技法（praxes）、智慧の境地（wisdoms）、および6つの苦悩と3段階の転換プロセス（sufferings -> transforms_to_ids）を網羅した全脳知識ネットワークです。
必ずこの全脳知識ネットワーク全体を包括的に参照し、実在するID・語録・出典のみを根拠として思考・応答してください。

<KNOWLEDGE_GRAPH>
${JSON.stringify(knowledgeGraph, null, 2)}
</KNOWLEDGE_GRAPH>

## 2. ユーザーの初期状態（喜怒哀楽と初期の悩み）
- 喜（よろこび）: ${assessment.ki} / 10
- 怒（いかり）: ${assessment.do} / 10
- 哀（かなしみ）: ${assessment.ai} / 10
- 楽（たのしみ・安らぎ）: ${assessment.raku} / 10
- 心に引っかかっていること: ${assessment.initialConcern || "（対話の中で探求）"}
- 現在の問答往復数: ${turnCount} 回目
- 明示的な結論・覚悟の石の生成要求: ${requestConclusion ? "あり（必ず response_type: 'resolution_stone' を出力せよ）" : "なし"}

## 3. フロー理論に基づく3段階（Phase 1 → 2 → 3）の対話制御と直近5〜10回の記憶活用
直近5〜10往復のユーザーの回答履歴をすべて記憶・洞察し、以下のように対話を導いてください：
- **Phase 1（受容・手放し / 1〜3往復目目安）**:
  苦悩や緊張が強いユーザーに対し、まずは「不生の仏心（Wis_UnbornMind）」「丸木橋の手放し（Wis_LettingGoBridge）」「共苦の慈悲（Wis_GreatCompassion）」「花のように生きる（Wis_FlowerLife）」の視点から、力みや自己否定を解く優しい問いを1つだけ投げかけます。
- **Phase 2（視野拡大・超越 / 4〜6往復目目安）**:
  狭い自己意識（デフォルトモードネットワーク）から離れるため、「大海と一滴の生命（Wis_OceanAndDrop）」や「平常心是道（Wis_OrdinaryMindSamu）」の視座を用い、生死や自他の境界、特別にならねばという執着を問い直します。
  ※ 5〜8往復目あたりで思考が堂々巡りしている場合や、身体から緊張を解くのが有効な場合は、\`response_type: "praxis_offer"\` として \`praxes\` の身体技法と自然音瞑想を提案してください。
- **Phase 3（主体的覚悟・苦中の真楽 / 6〜10往復目目安）**:
  「苦中の真楽・道は吾である（Wis_RealJoyInPain）」へと導き、「では、今この足元から、あなたはどう生きていくか（何を手放し、何を引き受けるか）」を問います。

## 4. 「覚悟の石（resolution_stone）」の生成条件
以下のいずれかを満たした場合、\`response_type: "resolution_stone"\` を返してください：
1. \`requestConclusion\` が \`true\` のとき。
2. 5〜10往復の対話の中で、ユーザーが自分なりの結論・決意・手放しの気づき（「〜していこうと思う」「もう握りしめなくていいと気づいた」「目の前のことを淡々とやる」等）を語ったとき。
3. 8〜10往復目に到達し、これまでのユーザーの言葉を「覚悟の石」として結晶化すべきタイミングに達したとき。

## 5. 出力制約（厳格なJSONフォーマット）
- 通常の問いかけ（\`response_type: "question"\`）では、**1回につき1つの問いのみ（40〜110文字程度）**とし、説教や長文解説は避けてください。
- 出力は必ず以下のJSONスキーマに厳密に従った純粋なJSONオブジェクトのみを返してください。

{
  "response_type": "question" | "praxis_offer" | "resolution_stone",
  "analysis": {
    "estimated_suffering_id": "Suf_Anxiety" | "Suf_Grief" | "Suf_FearOfFailure" | "Suf_Isolation" | "Suf_Decline" | "Suf_PerfectionismBurnout",
    "current_phase": 1 | 2 | 3,
    "target_wisdom_id": "Wis_UnbornMind" | "Wis_OceanAndDrop" | "Wis_RealJoyInPain" | "Wis_GreatCompassion" | "Wis_FlowerLife" | "Wis_LettingGoBridge" | "Wis_OrdinaryMindSamu",
    "light_mood": "amber_calm" | "moon_accept" | "ocean_deep" | "gold_resolute" | "sakura_compassion"
  },
  "message": "ユーザーへの問いかけ、または身体技法への誘い、または結論への讃嘆メッセージ",
  "praxis_offer": {
    "praxis_id": "Pra_...",
    "praxis_name": "技法名",
    "guide_text": "具体的な身体技法のガイド",
    "recommended_sound": "rain" | "waves" | "forest" | "stream" | "silence",
    "duration_min": 3
  },
  "resolution_stone": {
    "stone_title": "ユーザーの結論を象徴する美しい石の名前（例：『丸木橋を手放す琥珀石』『一滴の大海・覚悟の蒼石』）",
    "user_conclusion": "5〜10回の問答を通じてユーザー自身が辿り着いた結論・気づきの結晶（70〜140文字）",
    "wisdom_id": "Wis_...",
    "wisdom_name": "対応する智慧の名前",
    "discourse": {
      "discourse_id": "Dis_...",
      "master_name": "師家名",
      "quote": "knowledge_graph.json内の該当discourseのquote原文",
      "source_title": "出典タイトル",
      "source_url": "出典URL"
    },
    "stone_visual": {
      "color_theme": "emerald_glow" | "sapphire_zen" | "golden_resolve" | "lotus_warm",
      "glow_intensity": 0.95,
      "shape_type": "round_pebble" | "standing_monolith" | "crystal_zen" | "moss_jewel"
    }
  }
}`;
}

// ユーザーの喜怒哀楽と発言から最適な苦悩ノード (sufferings) を推定するローカル知識グラフ推論
function estimateSufferingFromGraph(assessment: EmotionAssessment, text: string): keyof typeof knowledgeGraph.sufferings {
  const combined = `${assessment.initialConcern || ""} ${text}`;
  if (/完璧|もっと|成果|限界|疲れ|燃え尽き|頑張|手放せ/.test(combined)) {
    return "Suf_PerfectionismBurnout";
  }
  if (/別れ|亡く|失っ|喪失|過去|後悔|悲し/.test(combined) || assessment.ai >= 7) {
    return "Suf_Grief";
  }
  if (/失敗|責任|プレッシャー|怖|恐|うまくいか/.test(combined)) {
    return "Suf_FearOfFailure";
  }
  if (/孤独|ひとり|理解され|誰も|孤立|怒|許せ/.test(combined) || assessment.do >= 7) {
    return "Suf_Isolation";
  }
  if (/老い|病|体|衰え|動けな|気力/.test(combined)) {
    return "Suf_Decline";
  }
  return "Suf_Anxiety";
}

// オフライン時・API未設定時にも `knowledge_graph.json` 全文を使って動作するフォールバック禅問答エンジン
function generateLocalKnowledgeGraphResponse(payload: ChatRequestPayload): ZenAIResponse {
  const userMessages = payload.history.filter((m) => m.role === "user");
  const lastUserText = userMessages[userMessages.length - 1]?.content || payload.assessment.initialConcern || "";
  const allUserText = userMessages.map((m) => m.content).join(" / ");
  const sufferingId = estimateSufferingFromGraph(payload.assessment, allUserText);
  const suffering = knowledgeGraph.sufferings[sufferingId];

  const turn = payload.turnCount;
  const currentPhase: 1 | 2 | 3 = turn <= 2 ? 1 : turn <= 5 ? 2 : 3;

  const transformStep =
    suffering.transforms_to_ids.find((t) => t.phase === currentPhase) ||
    suffering.transforms_to_ids[0];
  const targetWisdomId = transformStep.target_id as keyof typeof knowledgeGraph.wisdoms;
  const wisdom = knowledgeGraph.wisdoms[targetWisdomId];

  const moodMap: Record<string, LightMood> = {
    accepting: "moon_accept",
    transcendent: "ocean_deep",
    resolute: "gold_resolute",
    solidarity: "sakura_compassion",
  };
  const lightMood: LightMood = moodMap[wisdom.orientation] || "amber_calm";

  // ユーザーが明示的に結論を求めたか、5往復以上で覚悟・気づきの言葉を述べたか、8往復以上に達した場合
  const hasResolutionKeywords =
    turn >= 5 &&
    /思[うい]|してみ[るよう]|手放|歩[くい]|受け入|大切|感謝|やってみ|いいんだ|決め|肚/.test(lastUserText);

  if (payload.requestConclusion || hasResolutionKeywords || turn >= 8) {
    // Phase 3 の智慧または現在の智慧から法話を抽出
    const finalWisdomId = (turn >= 5 ? "Wis_RealJoyInPain" : targetWisdomId) as keyof typeof knowledgeGraph.wisdoms;
    const finalWisdom = knowledgeGraph.wisdoms[finalWisdomId] || wisdom;
    const discourseId = finalWisdom.discourse_ids[0] as keyof typeof knowledgeGraph.discourses;
    const discourse = knowledgeGraph.discourses[discourseId];
    const master = knowledgeGraph.masters[discourse.speaker_id as keyof typeof knowledgeGraph.masters];

    const colorMap: Record<string, StoneColorTheme> = {
      accepting: "emerald_glow",
      transcendent: "sapphire_zen",
      resolute: "golden_resolve",
      solidarity: "lotus_warm",
    };
    const shapeList: StoneShapeType[] = ["crystal_zen", "standing_monolith", "round_pebble", "moss_jewel"];
    const shapeType = shapeList[turn % shapeList.length];

    const conclusionSummary = lastUserText
      ? `「${lastUserText.slice(0, 65)}」—— 迷いや力みを通り抜け、今この足元から自らの道を歩むという静かな覚悟が結ばれました。`
      : `「${suffering.name}」の渦中にありながら、作為を手放し、本来の仏心の中で今できる一歩を踏み出す覚悟が定まりました。`;

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

  // 5往復目で身体技法・自然音瞑想を提案
  if (turn === 5) {
    const praxisId = (wisdom.praxis_ids[0] || "Pra_SurrenderBreath") as keyof typeof knowledgeGraph.praxes;
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

  // 往復数と苦悩に応じた禅の問いかけ生成
  const snippet = lastUserText ? `「${lastUserText.slice(0, 18)}${lastUserText.length > 18 ? "…" : ""}」` : "その思い";

  const phaseQuestions: Record<1 | 2 | 3, string[]> = {
    1: [
      `${snippet}を抱えている今、あなたが無意識にぎゅっと握りしめている「こうあらねばならない」という力みは何でしょうか。`,
      `もし今、丸木橋から手を離しても「下には柔らかい蒲団がある」としたら、一番に手放したい重荷は何ですか。`,
      `生まれたままの心（不生の仏心）には何ひとつ欠けたものはありません。今の自分を責めているその声は、誰の声でしょうか。`,
    ],
    2: [
      `大海に浮かぶ一滴の泡のように、あなたの命も大いなる流れの中にあります。10年後の静かな場所から今を見つめたら、何が見えますか。`,
      `${snippet}の奥で、あなたが本当に守りたいと願っている大切なものは何でしょうか。`,
      `特別な何者かになろうとする焦りを一度脇に置いたとき、ただ目の前に残る「今日ひとつのこと」は何ですか。`,
    ],
    3: [
      `朝比奈宗源老師は「道は吾である」と説かれました。この状況を自らの道として引き受けるなら、今日どんな小さな一歩を選びますか。`,
      `ここまで心を観察してきて、今あなたの肚（はら）の底から湧いてくる「自分の結論」をひと言で表すなら、どんな言葉になりますか。`,
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
  // 直近10往復（最大20メッセージ）の履歴を抽出
  const recentHistory = messages.slice(-20).map((m) => ({
    role: m.role,
    content: m.content,
    phase: m.phase,
  }));

  const userTurnCount = messages.filter((m) => m.role === "user").length + 1;

  const payload: ChatRequestPayload = {
    assessment,
    history: recentHistory,
    turnCount: userTurnCount,
    requestConclusion,
  };

  // 1. Supabase Edge Functions エンドポイント (https://nybcarmfsnqqfuebdaoq.supabase.co/functions/v1/zen-dialogue) を呼び出す
  const supabaseEdgeUrl =
    import.meta.env.VITE_SUPABASE_EDGE_URL ||
    "https://nybcarmfsnqqfuebdaoq.supabase.co/functions/v1/zen-dialogue";
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseEdgeUrl && supabaseEdgeUrl.startsWith("http")) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (supabaseAnonKey) {
        headers["Authorization"] = `Bearer ${supabaseAnonKey}`;
        headers["apikey"] = supabaseAnonKey;
      }

      const res = await fetch(supabaseEdgeUrl, {
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

  // 2. ローカル全脳知識ネットワーク推論エンジン（オフライン時・Edge未デプロイ時でも完全動作）
  await new Promise((r) => setTimeout(r, 650));
  return generateLocalKnowledgeGraphResponse(payload);
}
