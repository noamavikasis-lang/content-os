import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface TopPost {
  title: string;
  label: string | null;
  views: number;
  saves: number;
  shares: number;
  comments: number;
}

interface LabelStat {
  label: string;
  count: number;
  avgViews: number;
  savesPer1k: number;
  sharesPer1k: number;
}

const IDEAS_SCHEMA = {
  type: "object",
  properties: {
    verdict: {
      type: "object",
      properties: {
        keep_doing: { type: "string" },
        stop_doing: { type: "string" },
        why: { type: "string" },
      },
      required: ["keep_doing", "stop_doing", "why"],
      additionalProperties: false,
    },
    ideas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          hook: { type: "string" },
          based_on: { type: "string" },
          goal: { type: "string", enum: ["views", "saves", "shares"] },
        },
        required: ["title", "hook", "based_on", "goal"],
        additionalProperties: false,
      },
    },
  },
  required: ["verdict", "ideas"],
  additionalProperties: false,
} as const;

export async function POST(request: Request) {
  try {
    const { topPosts, labelStats, days } = (await request.json()) as {
      topPosts: TopPost[];
      labelStats: LabelStat[];
      days: number;
    };

    if (!topPosts?.length) {
      return NextResponse.json({ error: "אין מספיק נתונים" }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: { type: "json_schema", schema: IDEAS_SCHEMA },
      },
      system:
        "אתה אנליסט תוכן לרשתות חברתיות שעובד עם יוצר תוכן ישראלי בתחום השיווק ובניית אתרים. " +
        "אתה מדבר עברית, ישיר, בלי מליצות. אתה מסתמך רק על הנתונים שנמסרו לך ולא ממציא מספרים. " +
        "עקרון מנחה: שמירות מעידות על תוכן ערך שאנשים רוצים לחזור אליו, שיתופים מעידים על תוכן שמדבר לזהות של הצופה, " +
        "וצפיות לבדן מעידות על הוק חזק אבל לא בהכרח על ערך.",
      messages: [
        {
          role: "user",
          content: `אלה נתוני הביצועים שלי מ-${days} הימים האחרונים.

הפוסטים המובילים:
${topPosts
  .map(
    (p) =>
      `- "${p.title}" [${p.label ?? "ללא תיוג"}] — ${p.views.toLocaleString()} צפיות, ${p.saves} שמירות, ${p.shares} שיתופים, ${p.comments} תגובות`
  )
  .join("\n")}

ביצועים לפי סוג תוכן (מנורמל ל-1000 צפיות):
${labelStats
  .map(
    (l) =>
      `- ${l.label}: ${l.count} סרטונים, ${Math.round(l.avgViews).toLocaleString()} צפיות בממוצע, ${l.savesPer1k.toFixed(1)} שמירות ל-1000 צפיות, ${l.sharesPer1k.toFixed(1)} שיתופים ל-1000 צפיות`
  )
  .join("\n")}

תן לי:
1. verdict — מה להמשיך לעשות, מה להפסיק, ולמה. תתבסס על המספרים ותצטט אותם.
2. ideas — 5 רעיונות לסרטונים חדשים. כל רעיון צריך להיות דומה במנגנון לסרטון שכבר עבד לי, לא העתקה שלו.
   לכל רעיון: title (כותרת עבודה קצרה), hook (המשפט הראשון בסרטון, מילה במילה),
   based_on (על איזה סרטון שעבד הוא מבוסס ולמה), goal (למה הוא מכוון: views / saves / shares).`,
        },
      ],
    });

    if (message.stop_reason === "refusal") {
      return NextResponse.json({ error: "הבקשה נדחתה" }, { status: 400 });
    }

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "תשובה לא צפויה" }, { status: 500 });
    }

    return NextResponse.json(JSON.parse(textBlock.text));
  } catch (error) {
    console.error("Ideas error:", error);
    return NextResponse.json({ error: "יצירת הרעיונות נכשלה" }, { status: 500 });
  }
}
