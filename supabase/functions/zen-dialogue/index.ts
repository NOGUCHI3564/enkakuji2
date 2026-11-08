// Supabase Edge Function: zen-dialogue
// OpenRouter API (Google Gemini Flash 3.8) を呼び出し、
// 全脳知識ネットワーク (knowledge_graph.json) 全文と直近5〜10往復の対話記憶を包括して応答を生成する。
// ユーザーデータは一切サーバー側に保存しない (Stateless Proxy)。

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import knowledgeGraph from "./knowledge_graph.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChatRequestPayload {
  assessment: {
    ki: number;   // 喜 (0-10)
    do: number;   // 怒 (0-10)
    ai: number;   // 哀 (0-10)
    raku: number; // 楽 (0-10)
    initialConcern?: string;
  };
  history: Array<{
    role: "user" | "assistant";
    content: string;
    phase?: 1 | 2 | 3;
  }>;
  turnCount: number;
  requestConclusion: boolean;
}

function buildSystemPrompt(payload: ChatRequestPayload): string {
  const { assessment, turnCount, requestConclusion } = payload;

  return `あなたは臨済宗大本山円覚寺の法脈（朝比奈宗源老師、横田南嶺老師、盤珪永琢禅師の不生禅）を体現する「AI禅問答師」です。
正解を一方的に押し付けるのではなく、静謐で慈悲深い問いかけを通じてユーザー自身の内省と気づきを促し、最終的にユーザーが自らの肚（はら）を据えて導き出した結論を「覚悟の石（Stone of Resolution）」として心の庭に結晶化させる伴走者です。

## 1. 全脳知識ネットワーク（KNOWLEDGE_GRAPH）の完全参照
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
- 心に引っかかっていること: ${assessment.initialConcern || "（特になし・対話の中で探求）"}
- 現在の問答往復数: ${turnCount} 回目
- 明示的な結論・覚悟の石の生成要求: ${requestConclusion ? "あり（必ず response_type: 'resolution_stone' を出力せよ）" : "なし"}

## 3. フロー理論に基づく3段階（Phase 1 → 2 → 3）の対話制御と記憶の活用
直近5〜10往復のユーザーの回答履歴をすべて記憶・洞察し、以下のように対話を導いてください：
- **Phase 1（受容・手放し / 1〜3往復目目安）**:
  苦悩や緊張が強いユーザーに対し、まずは「不生の仏心（Wis_UnbornMind）」「丸木橋の手放し（Wis_LettingGoBridge）」「共苦の慈悲（Wis_GreatCompassion）」「花のように生きる（Wis_FlowerLife）」の視点から、力みや自己否定を解く優しい問いを投げかけます。
- **Phase 2（視野拡大・超越 / 4〜6往復目目安）**:
  狭い自己意識（デフォルトモードネットワーク）から離れるため、「大海と一滴の生命（Wis_OceanAndDrop）」や「平常心是道（Wis_OrdinaryMindSamu）」の視座を用い、生死や自他の境界、特別にならねばという執着を問い直します。
  ※ 5〜8往復目あたりで思考が堂々巡りしている場合や、身体から緊張を解くのが有効な場合は、\`response_type: "praxis_offer"\` として \`praxes\` の身体技法と自然音瞑想を提案してください。
- **Phase 3（主体的覚悟・苦中の真楽 / 6〜10往復目目安）**:
  「苦中の真楽・道は吾である（Wis_RealJoyInPain）」へと導き、「では、今この足元から、あなたはどう生きていくか（何を手放し、何を引き受けるか）」を問います。

## 4. 「覚悟の石（resolution_stone）」の生成条件
以下のいずれかを満たした場合、\`response_type: "resolution_stone"\` を返してください：
1. \`requestConclusion\` が \`true\` のとき。
2. 5〜10往復の対話の中で、ユーザーが自分なりの結論・決意・手放しの気づき（「〜していこうと思う」「もう握りしめなくていいと気づいた」「目の前のことを淡々とやる」等）を語ったとき。
3. 10往復目に到達し、これまでの5〜10回のユーザーの言葉を結晶化すべきタイミングに達したとき。

## 5. 出力制約（厳格なJSONフォーマット）
- 通常の問いかけ（\`response_type: "question"\`）では、**1回につき1つの問いのみ（40〜120文字程度）**とし、説教や長文解説は避けてください。
- 出力は必ず以下のJSONスキーマに厳密に従った純粋なJSONオブジェクトのみを返してください（マークダウンのコードブロック等は不要）。

{
  "response_type": "question" | "praxis_offer" | "resolution_stone",
  "analysis": {
    "estimated_suffering_id": "Suf_Anxiety" | "Suf_Grief" | "Suf_FearOfFailure" | "Suf_Isolation" | "Suf_Decline" | "Suf_PerfectionismBurnout",
    "current_phase": 1 | 2 | 3,
    "target_wisdom_id": "Wis_UnbornMind" | "Wis_OceanAndDrop" | "Wis_RealJoyInPain" | "Wis_GreatCompassion" | "Wis_FlowerLife" | "Wis_LettingGoBridge" | "Wis_OrdinaryMindSamu",
    "light_mood": "amber_calm" | "moon_accept" | "ocean_deep" | "gold_resolute" | "sakura_compassion"
  },
  "message": "ユーザーへの問いかけ、または身体技法への誘い、または結論への讃嘆メッセージ",
  "praxis_offer": { // response_type === "praxis_offer" のとき必須
    "praxis_id": "Pra_...",
    "praxis_name": "技法名",
    "guide_text": "具体的な身体技法のガイド（descriptionに基づく）",
    "recommended_sound": "rain" | "waves" | "forest" | "stream" | "silence",
    "duration_min": 2 | 3 | 5
  },
  "resolution_stone": { // response_type === "resolution_stone" のとき必須
    "stone_title": "ユーザーの結論を象徴する美しい石の名前（例：『丸木橋を手放す琥珀石』『一滴の大海・覚悟の蒼石』など）",
    "user_conclusion": "5〜10回の問答を通じてユーザー自身が辿り着いた結論・気づきの結晶（80〜140文字）",
    "wisdom_id": "Wis_...",
    "wisdom_name": "対応する智慧の名前",
    "discourse": {
      "discourse_id": "Dis_...",
      "master_name": "師家名（朝比奈宗源 / 横田南嶺 / 盤珪永琢）",
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("OPEN_ROUTER_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY is not configured in Supabase Edge Function secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // OpenRouter モデル指定（仕様書に基づき Google Gemini Flash 3.8 を指定、フォールバック対応）
    const requestedModel = Deno.env.get("OPENROUTER_MODEL") || "google/gemini-3.8-flash";
    const fallbackModel = "google/gemini-2.5-flash";

    const payload: ChatRequestPayload = await req.json();
    const systemPrompt = buildSystemPrompt(payload);

    // 直近10往復（最大20メッセージ）を保持して送信
    const recentHistory = (payload.history || []).slice(-20).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const messages = [
      { role: "system", content: systemPrompt },
      ...recentHistory,
    ];

    if (recentHistory.length === 0) {
      messages.push({
        role: "user",
        content: `私の今の喜怒哀楽は「喜:${payload.assessment.ki}, 怒:${payload.assessment.do}, 哀:${payload.assessment.ai}, 楽:${payload.assessment.raku}」です。${
          payload.assessment.initialConcern
            ? `今心に引っかかっていることは「${payload.assessment.initialConcern}」です。`
            : "今の私の心の状態から、最初の問いを投げかけてください。"
        }`,
      });
    } else if (payload.requestConclusion) {
      messages.push({
        role: "user",
        content: "ここまでの問答を踏まえて、私の心の結論（覚悟の石）を結晶化してください。",
      });
    }

    const callOpenRouter = async (modelId: string) => {
      return await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://enkakuji-zen-garden.github.io",
          "X-Title": "Enkakuji Zen Garden PWA",
        },
        body: JSON.stringify({
          model: modelId,
          messages,
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });
    };

    let response = await callOpenRouter(requestedModel);
    if (!response.ok) {
      // OpenRouter上で google/gemini-3.8-flash エイリアスが未解決の場合、即座に Gemini Flash 現行エンドポイントへフォールバック
      response = await callOpenRouter(fallbackModel);
    }

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: "OpenRouter API error", details: errText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "{}";
    const cleanedJson = rawContent.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsedResponse = JSON.parse(cleanedJson);

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal Server Error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
