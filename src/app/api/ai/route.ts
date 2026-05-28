import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const NETWORK_PROMPTS: Record<string, string> = {
  instagram: "כתוב caption לאינסטגרם: עד 2200 תווים, כולל אמוג'ים, 5-10 hashtags רלוונטיים בעברית ואנגלית, CTA ברור.",
  tiktok: "כתוב caption לטיקטוק: קצר, תוסס, עד 300 תווים, 3-5 hashtags טרנדיים.",
  youtube_short: "כתוב תיאור ליוטיוב שורטס: שורה ראשונה מושכת, 2-3 hashtags של Shorts.",
  youtube: "כתוב תיאור מלא ליוטיוב: פתיח מושך, תוכן מפורט, נקודות עיקריות, CTA להרשמה, timestamps אם רלוונטי, כ-300-500 מילים.",
  facebook: "כתוב פוסט לפייסבוק: סיפורי, עם שאלה לקהל, אמוג'ים, 1-3 hashtags.",
};

export async function POST(request: Request) {
  try {
    const { title, description, network } = await request.json();

    if (!title || !network) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const networkInstruction = NETWORK_PROMPTS[network] || NETWORK_PROMPTS.instagram;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `אתה כותב תוכן לרשתות חברתיות בעברית. כתוב קופי לסרטון הבא:

כותרת: ${title}
${description ? `תיאור: ${description}` : ""}

הנחיות: ${networkInstruction}

החזר JSON בפורמט הבא בלבד, ללא טקסט נוסף:
{
  "caption": "הטקסט המלא כאן",
  "hashtags": "#hashtag1 #hashtag2 #hashtag3"
}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Unexpected response" }, { status: 500 });
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse response" }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (error) {
    console.error("AI error:", error);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
