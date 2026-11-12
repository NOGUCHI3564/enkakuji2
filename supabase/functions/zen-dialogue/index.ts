// Supabase Edge Function: zen-dialogue
// OpenRouter API (Google Gemini Flash 3.8) を呼び出し、以下の2つのモードを処理するステートレスプロキシ：
// 1. action === "organize_memories":
//    ユーザーが音声入力や対話で自由に語った内容から、生年月日・性別・現在の背景、および
//    「喜・怒・哀・楽」のエピソード群を自動抽出・構造化してスマホ保存用のJSONリストとして返す。
// 2. action === "dialogue" (デフォルト):
//    スマホ内に蓄積された「人生の記憶（喜怒哀楽リスト＋基本属性）」＋「直近5〜10往復の対話履歴」＋
//    「全脳知識ネットワーク (knowledge_graph.json) 全文」をすべて包括して禅問答の問いや「覚悟の石」を生成する。

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import knowledgeGraph from "./knowledge_graph.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface LifeMemoryItem {
  id?: string;
  emotion: "ki" | "do" | "ai" | "raku";
  period?: string;
  content: string;
}

interface UserLifeProfile {
  birthDate?: string;
  gender?: string;
  lifeContext?: string;
  currentResponsibilities?: string;
  pastExperiences?: string;
  coreValues?: string[];
  memories: LifeMemoryItem[];
}

interface RequestPayload {
  action?: "dialogue" | "organize_memories";
  // organize_memories 用
  rawNarrative?: string;
  existingProfile?: UserLifeProfile;

  // dialogue 用
  assessment?: {
    initialConcern?: string;
    lifeProfileSnapshot?: UserLifeProfile;
    ki?: number;
    do?: number;
    ai?: number;
    raku?: number;
  };
  history?: Array<{
    role: "user" | "assistant";
    content: string;
    phase?: 1 | 2 | 3;
  }>;
  turnCount?: number;
  requestConclusion?: boolean;
}

function buildMemoryOrganizerPrompt(rawNarrative: string, existing?: UserLifeProfile): string {
  return `あなたは臨済宗円覚寺の静謐で慈悲深い聞き手（AI禅僧）です。
ユーザーが音声入力や自由な語りによって、自分自身のこれまでの人生の経験・プロフィール・喜怒哀楽の出来事を話してくれました。

あなたの役割は、ユーザーの語りを丁寧に聞き取り、以下のJSON形式に整理・構造化して返すことです（ユーザーのスマホ内に「人生の記憶」として保存されます）。

## 既存のプロフィール情報（参考・上書きや追加の判断用）
- 生年月日/年代: ${existing?.birthDate || "未設定"}
- 性別: ${existing?.gender || "未設定"}
- 現在の立場・暮らし: ${existing?.lifeContext || "未設定"}

## 整理・抽出のルール
1. **基本属性の抽出 (\`extracted_profile\`)**:
   - 今回の語りの中に「生年月日・年齢・年代（例：1975年生まれ、50代など）」「性別」「現在の仕事・立場・暮らしぶり」に関する言及があれば抽出してください。言及がなければ \`null\` にしてください。
2. **喜・怒・哀・楽の記憶リスト化 (\`extracted_memories\`)**:
   - 語られたエピソードを、意味のある出来事ごとに1件ずつ分解してください（1つの語りから1件でも、5件〜10件でも抽出可能です）。
   - 各エピソードを以下の4つの感情カテゴリ（\`emotion\`）のいずれかに分類してください：
     - \`"ki"\`（喜）：嬉しかったこと、誇らしかったこと、達成感、報われた経験、誕生や出会いの喜び
     - \`"do"\`（怒）：腹が立ったこと、許せなかったこと、理不尽な経験、悔しさ、憤り、葛藤
     - \`"ai"\`（哀）：悲しかったこと、喪失・死別・別れ、孤独、挫折、後悔、涙した経験
     - \`"raku"\`（楽）：楽しかったこと、心が安らぐ時間、趣味、自然や日常の幸せ、救われた経験
   - \`period\` には時期の手がかり（「子供の頃」「20代の頃」「3年前」「最近」など）があれば入れ、なければ省略してください。
   - \`content\` には、音声認識の誤字や話し言葉の乱れを自然な日本語に整えつつ、ユーザー自身の言葉の温度感を残して1〜2文で簡潔にまとめてください。
3. **聞き手からの返答と次の促し (\`reply_message\`, \`next_prompt\`)**:
   - \`reply_message\`: 語ってくれたことへの温かく静かな受容の言葉（40〜80文字程度）。
   - \`next_prompt\`: 「さらに思い出されることはありますか？」と次の語りを優しく促す一言（例：「ほかにも、若い頃に夢中になった『楽』の記憶や、胸に残る『哀』の出来事があれば、いつでも声でお聞かせください」など）。

## 出力フォーマット（厳格なJSONのみ）
{
  "reply_message": "大切なお話を聞かせていただき、ありがとうございます。あなたの歩みが静かに心に映し出されました。",
  "next_prompt": "ほかに、忘れられない喜びや、今も胸に引っかかっている出来事があれば、そのまま声でお話しください。",
  "extracted_profile": {
    "birthDate": "抽出された生年月日または年代（なければ null）",
    "gender": "抽出された性別（なければ null）",
    "lifeContext": "抽出された現在の立場・仕事・暮らし（なければ null）"
  },
  "extracted_memories": [
    {
      "emotion": "ki" | "do" | "ai" | "raku",
      "period": "時期（任意）",
      "content": "整理されたエピソード内容"
    }
  ]
}`;
}

function formatLifeProfileForPrompt(profile?: UserLifeProfile): string {
  if (!profile) return "（プロフィール・価値観・人生の記憶はまだ登録されていません）";

  const lines: string[] = [];
  if (profile.birthDate) {
    let ageStr = "";
    if (profile.birthDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const birth = new Date(profile.birthDate);
      if (!isNaN(birth.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        if (age >= 0 && age < 130) ageStr = `（現在 ${age}歳）`;
      }
    }
    lines.push(`- 生年月日: ${profile.birthDate}${ageStr}`);
  }
  if (profile.gender) lines.push(`- 性別: ${profile.gender}`);
  if (profile.lifeContext) lines.push(`- 立場・役割: ${profile.lifeContext}`);
  if (profile.currentResponsibilities) {
    lines.push(`- 抱えている責任や向き合っていること: ${profile.currentResponsibilities}`);
  }
  if (profile.pastExperiences) {
    lines.push(`- 心に残る経験や人生の転機: ${profile.pastExperiences}`);
  }
  if (profile.coreValues && profile.coreValues.length > 0) {
    lines.push(`- 最も大切にしている2つの価値観: 【${profile.coreValues.join("】 【")}】`);
  }

  if (profile.memories && profile.memories.length > 0) {
    const labelMap = {
      ki: "【喜（よろこびの記憶）】",
      do: "【怒（いかり・葛藤の記憶）】",
      ai: "【哀（かなしみ・喪失の記憶）】",
      raku: "【楽（たのしみ・安らぎの記憶）】",
    };
    lines.push("\n### これまでの人生における「喜・怒・哀・楽」の記憶リスト:");
    profile.memories.forEach((m, idx) => {
      const tag = labelMap[m.emotion] || "【記憶】";
      const periodStr = m.period ? `（時期: ${m.period}）` : "";
      lines.push(`${idx + 1}. ${tag}${periodStr} ${m.content}`);
    });
  }

  return lines.length > 0 ? lines.join("\n") : "（プロフィールは未登録です）";
}

function buildSystemPrompt(payload: RequestPayload): string {
  const assessment = payload.assessment || {};
  const turnCount = payload.turnCount || 1;
  const requestConclusion = Boolean(payload.requestConclusion);
  const lifeProfileText = formatLifeProfileForPrompt(assessment.lifeProfileSnapshot);

  return `あなたは臨済宗大本山円覚寺の法脈（朝比奈宗源老師、横田南嶺老師、盤珪永琢禅師の不生禅）を体現する「AI禅問答師」です。
通常のAIチャットのように即席の正解を教え込むのではなく、プロのコーチング（傾聴と深掘り）と禅のパラダイムシフト（揺らぎ）を融合させた伴走者として、ユーザーが自らの肚（はら）を据えて結論を導き出せるよう問いを紡ぎます。

## 1. 全脳知識ネットワーク（KNOWLEDGE_GRAPH）の完全参照
以下のJSONは、円覚寺の師家（masters）、法話（discourses）、身体技法（praxes）、智慧の境地（wisdoms）、および6つの苦悩と転換プロセス（sufferings -> transforms_to_ids）を網羅した全脳知識ネットワークです。実在するID・語録・出典のみを根拠として思考・引用してください。

<KNOWLEDGE_GRAPH>
${JSON.stringify(knowledgeGraph, null, 2)}
</KNOWLEDGE_GRAPH>

## 2. ユーザーの「プロフィール・2つの価値観・人生の記憶」
以下は、ユーザー自身が設定した背景、責任、転機、大切にしたい価値観、および喜怒哀楽のエピソード群です。
問いを紡ぐ際や覚悟の石を結ぶ際は、**このユーザーの立場や価値観を裏のコンパスとして深く理解し、的を射た問いかけ**を行ってください。

<USER_PROFILE_AND_VALUES>
${lifeProfileText}
</USER_PROFILE_AND_VALUES>

- 今回の禅問答で見つめたいテーマ・今の悩み: ${assessment.initialConcern || "（人生の歩みと価値観を踏まえ、今ここにある心を見つめる）"}
- 現在の問答往復数: ${turnCount} 回目
- 明示的な結論・覚悟の石の生成要求: ${requestConclusion ? "あり（必ず response_type: 'resolution_stone' を出力せよ）" : "なし"}

## 3. 「動的揺らぎと収束」の対話モデル（spec.md Version 3.2 準拠）
回数による単純な固定遷移ではなく、以下の3つの状態を動的に行き来してください：

1. **Base Phase（傾聴と自己探索のコーチング：対話の約7〜8割）**:
   - 禅の難解な言葉や仏教用語は出さず、プロのコーチ・カウンセラーとして純粋な傾聴・受容・深掘りの問い（「何がそう思わせているのか」「その中で一番恐れていることは何か」など）に徹します。
   - ユーザーの立場（例: 経営者、会社員など）や「2つの価値観」（例: 【責任を果たす】【心穏やかに】など）を配慮した言葉選びを行ってください。
2. **Zen Shift（禅脳へのパラダイムシフト・揺らぎ）**:
   - Base Phase が数回（2〜3往復）続いた後、またはユーザーが思考の堂々巡り・自縄自縛に陥っていると判断したタイミングで発動します。
   - \`knowledge_graph.json\` 内の智慧（不生の仏心、丸木橋の手放し、大海と一滴など）を**日常の分かりやすい比喩として投げかけ、思考の枠組みを外す問い**を投じます（例：「もし丸木橋の下に柔らかい蒲団があるとしたら、手放せるものは何ですか？」）。
   - 揺らぎを投げた後は、再び Base Phase でユーザーの受け止めを深掘りします。
   - ※ 5〜8往復目あたりで思考が頭に偏っている場合は、\`response_type: "praxis_offer"\` として身体技法と自然音瞑想を提案してください。
3. **Phase 3（主体的覚悟への収束）**:
   - ユーザー自身の言葉に「気づきの芽」「自己解決の兆し」「自らの足で歩き出す意志」が表れた場合、さらなる深掘りを停止します。
   - ユーザーの言葉を受容・讃嘆し、肚を据えて自分の結論を結ぶためのクロージング問いかけ、または \`resolution_stone\` の生成へと導きます。

## 4. 「覚悟の石（resolution_stone）」の生成条件
以下のいずれかを満たした場合、\`response_type: "resolution_stone"\` を返してください：
1. \`requestConclusion\` が \`true\` のとき。
2. ユーザーが自分なりの結論・決意・気づき（「〜してみようと思う」「もう手放していいと分かった」「自分の責任で進める」等）を語ったとき。
3. 8〜10往復目に達し、これまでの対話と価値観を結晶化すべきタイミングに達したとき。

## 5. 出力制約（厳格なJSONフォーマット）
- 通常の問いかけ（\`response_type: "question"\`）では、**1回につき1つの問いのみ（40〜120文字程度）**とし、説教や長文解説は避けてください。
- 出力は必ず以下のJSONスキーマに従った純粋なJSONオブジェクトのみを返してください。

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
    "guide_text": "具体的な身体技法のガイド（descriptionに基づく）",
    "recommended_sound": "rain" | "waves" | "forest" | "stream" | "silence",
    "duration_min": 2 | 3 | 5
  },
  "resolution_stone": {
    "stone_title": "ユーザーの結論と人生の記憶を象徴する美しい石の名前（例：『丸木橋を手放す琥珀石』『一滴の大海・覚悟の蒼石』など）",
    "user_conclusion": "人生の喜怒哀楽の記憶と5〜10回の問答を通じてユーザー自身が辿り着いた結論・気づきの結晶（80〜150文字）",
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

    const requestedModel = Deno.env.get("OPENROUTER_MODEL") || "google/gemini-3.8-flash";
    const fallbackModel = "google/gemini-2.5-flash";

    const payload: RequestPayload = await req.json();

    const callOpenRouter = async (modelId: string, messages: Array<{ role: string; content: string }>) => {
      return await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://noguchi3564.github.io/enkakuji2/",
          "X-Title": "Enkakuji Zen Garden PWA",
        },
        body: JSON.stringify({
          model: modelId,
          messages,
          response_format: { type: "json_object" },
          temperature: 0.6,
        }),
      });
    };

    // モード1：音声入力・対話による「人生の記憶（喜怒哀楽エピソード＋基本属性）」の自動整理・リスト化
    if (payload.action === "organize_memories") {
      const narrative = payload.rawNarrative || "";
      const sysPrompt = buildMemoryOrganizerPrompt(narrative, payload.existingProfile);
      const messages = [
        { role: "system", content: sysPrompt },
        { role: "user", content: narrative },
      ];

      let response = await callOpenRouter(requestedModel, messages);
      if (!response.ok) {
        response = await callOpenRouter(fallbackModel, messages);
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
      const parsed = JSON.parse(cleanedJson);

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // モード2：通常の禅問答（人生の記憶 ＋ 直近5〜10往復の履歴 ＋ 全脳知識ネットワーク全文）
    const systemPrompt = buildSystemPrompt(payload);
    const recentHistory = (payload.history || []).slice(-20).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const messages = [
      { role: "system", content: systemPrompt },
      ...recentHistory,
    ];

    if (recentHistory.length === 0) {
      const concern = payload.assessment?.initialConcern;
      messages.push({
        role: "user",
        content: concern
          ? `今心に引っかかっていることは「${concern}」です。私の「人生の記憶」も踏まえて、最初の問いを投げかけてください。`
          : `私の「人生の記憶（喜怒哀楽の経験やプロフィール）」を踏まえて、今の私の心を見つめる最初の問いを投げかけてください。`,
      });
    } else if (payload.requestConclusion) {
      messages.push({
        role: "user",
        content: "ここまでの問答と私の人生の記憶を踏まえて、私の心の結論（覚悟の石）を結晶化してください。",
      });
    }

    let response = await callOpenRouter(requestedModel, messages);
    if (!response.ok) {
      response = await callOpenRouter(fallbackModel, messages);
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
