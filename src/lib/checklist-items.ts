import { VideoStatus } from "@/types";

export interface ChecklistItemDef {
  key: string;
  label: string;
  stage: "week_start" | "after_filming" | "after_editing" | "before_upload";
}

export const CHECKLIST_ITEMS: ChecklistItemDef[] = [
  // תחילת שבוע
  { key: "shoot_day_set", label: "יום צילום נקבע ביומן", stage: "week_start" },
  { key: "ideas_ready", label: "יש רשימת רעיונות/נושאים לצילום", stage: "week_start" },
  { key: "week_plan_clear", label: "ברור אילו תכנים עולים השבוע", stage: "week_start" },

  // אחרי צילום
  { key: "footage_on_drive", label: "כל חומרי הגלם עלו לדרייב", stage: "after_filming" },
  { key: "files_named", label: "לכל סרטון יש שם מסודר", stage: "after_filming" },
  { key: "no_missing_clips", label: "לא חסר שום קובץ/זווית/קטע חשוב", stage: "after_filming" },

  // אחרי עריכה
  { key: "hook_strong", label: "יש Hook חזק בתחילת הסרטון", stage: "after_editing" },
  { key: "subtitles_added", label: "כתוביות הוספו", stage: "after_editing" },
  { key: "sound_ok", label: "סאונד תקין", stage: "after_editing" },
  { key: "cta_at_end", label: "הנעה לפעולה בסוף הסרטון", stage: "after_editing" },
  { key: "format_ok", label: "הפורמט מותאם לאינסטגרם/פלטפורמה", stage: "after_editing" },

  // לפני העלאה
  { key: "cover_ready", label: "Cover/תמונת שער מוכנה", stage: "before_upload" },
  { key: "caption_ready", label: "Caption/תיאור מוכן", stage: "before_upload" },
  { key: "cta_clear", label: "הנעה לפעולה ברורה בתיאור", stage: "before_upload" },
  { key: "scheduled_correctly", label: "התוכן מתוזמן ביום ובשעה שנקבעו", stage: "before_upload" },
];

export const STAGE_LABELS: Record<ChecklistItemDef["stage"], string> = {
  week_start: "תחילת שבוע",
  after_filming: "אחרי צילום",
  after_editing: "אחרי עריכה",
  before_upload: "לפני העלאה",
};

export function getRelevantChecklists(status: VideoStatus): ChecklistItemDef["stage"][] {
  switch (status) {
    case "planned": return ["week_start"];
    case "filmed": return ["week_start", "after_filming"];
    case "on_drive": return ["after_filming"];
    case "editing": return ["after_filming", "after_editing"];
    case "ready": return ["after_editing", "before_upload"];
    case "published": return ["before_upload"];
    default: return [];
  }
}
