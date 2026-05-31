"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  LayoutDashboard, Columns3, Calendar, BarChart3, Smartphone,
  Plus, X, Save, CheckSquare, Square,
  ExternalLink, Send, ChevronRight, ChevronLeft, TrendingUp,
  Users, FileText, Link as LinkIcon, Target, Youtube, Trash2,
} from "lucide-react";

const C = { sidebar: "#0E1525", primary: "#42FEEE", primaryDark: "#0E1525" };

// ─── Types ────────────────────────────────────────────────────────────────────
type Status = string;
type Network = "instagram" | "tiktok" | "youtube_short" | "youtube" | "facebook";
type ContentLabel = "viral" | "broad" | "niche" | "carousel" | null;
type Tab = "board" | "dashboard" | "calendar" | "analytics" | "sapir";
type PanelTab = "info" | "copy" | "checklist" | "notes" | "script";

interface Column {
  id: string; label: string; emoji: string;
  bg: string; border: string; header: string; badge: string;
  gradient: string; accent: string;
}
interface FollowerEntry { date: string; network: Network; count: number }
interface Video {
  id: string; title: string; description: string;
  shoot_date: string; publish_date: string; publish_time: string;
  status: Status; networks: Network[]; drive_link: string;
  inspiration_link: string; script: string; label: ContentLabel;
  copies: Partial<Record<Network, { caption: string; hashtags: string }>>;
  checklist: Record<string, boolean>;
  notes: { author: string; text: string; time: string }[];
  views?: number; saves?: number; shares?: number;
}

// ─── Column configs ───────────────────────────────────────────────────────────
const DEFAULT_COLUMNS: Column[] = [
  { id: "planned",   label: "מתוכנן",      emoji: "📅",
    bg: "bg-slate-50",   border: "border-slate-200",  header: "bg-slate-100",   badge: "bg-slate-100 text-slate-600",
    gradient: "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)", accent: "#64748b" },
  { id: "filmed",    label: "צולם",         emoji: "🎬",
    bg: "bg-blue-50",    border: "border-blue-100",   header: "bg-blue-500",    badge: "bg-blue-100 text-blue-700",
    gradient: "linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)", accent: "#3b82f6" },
  { id: "on_drive",  label: "בדרייב",       emoji: "☁️",
    bg: "bg-violet-50",  border: "border-violet-100", header: "bg-violet-500",  badge: "bg-violet-100 text-violet-700",
    gradient: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)", accent: "#8b5cf6" },
  { id: "editing",   label: "בעריכה",       emoji: "✂️",
    bg: "bg-amber-50",   border: "border-amber-100",  header: "bg-amber-500",   badge: "bg-amber-100 text-amber-700",
    gradient: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)", accent: "#f59e0b" },
  { id: "ready",     label: "מוכן לעלייה", emoji: "✅",
    bg: "bg-emerald-50", border: "border-emerald-100",header: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700",
    gradient: "linear-gradient(135deg, #34d399 0%, #059669 100%)", accent: "#10b981" },
  { id: "published", label: "עלה",          emoji: "🚀",
    bg: "bg-teal-50",    border: "border-teal-100",   header: "bg-teal-500",    badge: "bg-teal-100 text-teal-700",
    gradient: "linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)", accent: "#14b8a6" },
];
const CUSTOM_COL_STYLES = [
  { bg: "bg-pink-50",   border: "border-pink-100",  header: "bg-pink-500",  badge: "bg-pink-100 text-pink-700",
    gradient: "linear-gradient(135deg, #f472b6 0%, #db2777 100%)", accent: "#ec4899" },
  { bg: "bg-orange-50", border: "border-orange-100",header: "bg-orange-500",badge: "bg-orange-100 text-orange-700",
    gradient: "linear-gradient(135deg, #fb923c 0%, #ea580c 100%)", accent: "#f97316" },
  { bg: "bg-cyan-50",   border: "border-cyan-100",  header: "bg-cyan-500",  badge: "bg-cyan-100 text-cyan-700",
    gradient: "linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)", accent: "#06b6d4" },
  { bg: "bg-rose-50",   border: "border-rose-100",  header: "bg-rose-500",  badge: "bg-rose-100 text-rose-700",
    gradient: "linear-gradient(135deg, #fb7185 0%, #e11d48 100%)", accent: "#f43f5e" },
];

// ─── Constants ────────────────────────────────────────────────────────────────
const NET_LABEL: Record<Network, string> = {
  instagram: "אינסטגרם", tiktok: "טיקטוק",
  youtube_short: "יוטיוב שורטס", youtube: "יוטיוב", facebook: "פייסבוק",
};
const NET_EMOJI: Record<Network, string> = {
  instagram: "📸", tiktok: "🎵", youtube_short: "▶️", youtube: "🎥", facebook: "👥",
};
const LABEL_CONFIG: Record<NonNullable<ContentLabel>, { label: string; emoji: string; color: string }> = {
  viral:    { label: "ויראלי",          emoji: "🔥", color: "bg-red-100 text-red-700 border-red-200"        },
  broad:    { label: "קהל רחב",         emoji: "📢", color: "bg-blue-100 text-blue-700 border-blue-200"      },
  niche:    { label: "ערך קהל מצומצם",  emoji: "💎", color: "bg-violet-100 text-violet-700 border-violet-200"},
  carousel: { label: "קרוסלה",          emoji: "📊", color: "bg-orange-100 text-orange-700 border-orange-200"},
};
const ALL_NETWORKS: Network[] = ["instagram", "tiktok", "youtube_short", "youtube", "facebook"];
const CHECKLIST_ITEMS = [
  { key: "shoot_day_calendar", label: "יום צילום נקבע ביומן (פעם בשבוע)", stage: "בתחילת שבוע" },
  { key: "ideas_list_ready",   label: "יש רשימת רעיונות/נושאים לצילום",  stage: "בתחילת שבוע" },
  { key: "weekly_plan_clear",  label: "ברור אילו תכנים עולים השבוע",       stage: "בתחילת שבוע" },
  { key: "footage_on_drive",   label: "כל חומרי הגלם עלו ל-Drive",         stage: "אחרי צילום"  },
  { key: "files_named",        label: "לכל סרטון יש שם מסודר",              stage: "אחרי צילום"  },
  { key: "no_missing_clips",   label: "לא חסר שום קובץ / זווית / קטע",     stage: "אחרי צילום"  },
  { key: "hook_strong",        label: "יש Hook חזק בתחילת הסרטון",          stage: "אחרי עריכה"  },
  { key: "subtitles_added",    label: "כתוביות הוספו",                       stage: "אחרי עריכה"  },
  { key: "cover_ready",        label: "Cover מוכן",                          stage: "לפני העלאה" },
  { key: "caption_ready",      label: "תיאור/Caption מוכן",                  stage: "לפני העלאה" },
  { key: "cta_clear",          label: "הנעה לפעולה ברורה",                   stage: "לפני העלאה" },
  { key: "scheduled",          label: "התוכן מתוזמן/מוכן לעלייה",            stage: "לפני העלאה" },
  { key: "post_on_time",       label: "הפוסט עולה ביום ובשעה שנקבעו",       stage: "לפני העלאה" },
  { key: "weekly_3_posts",     label: "עולים לפחות 3 תכנים בשבוע",          stage: "מעקב ובקרה" },
  { key: "track_best",         label: "עוקבים אחרי תכנים שעבדו טוב",        stage: "מעקב ובקרה" },
  { key: "identify_hooks",     label: "מזהים Hooks ונושאים חזקים",           stage: "מעקב ובקרה" },
  { key: "new_ideas",          label: "הכנת רשימת רעיונות לתוכן הבא",        stage: "מעקב ובקרה" },
];
const MONTHS_HE = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const DAYS_HE   = ["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"];
const DAYS_FULL = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO: Video[] = [
  {
    id: "1", title: "5 טיפים לצמיחה מהירה באינסטגרם", description: "סרטון על אסטרטגיות צמיחה אורגנית",
    shoot_date: "2026-05-20", publish_date: "2026-05-21", publish_time: "18:00",
    status: "ready", networks: ["instagram", "tiktok"], drive_link: "https://drive.google.com",
    inspiration_link: "", script: "פתיחה (Hook):\nהסוד שאף אחד לא מספר לך...\n\nתוכן עיקרי:\n1. עקביות\n2. שעות פרסום\n3. אינטראקציה\n\nCTA:\nאיזה טיפ הכי הפתיע אתכם?",
    label: "viral",
    copies: { instagram: { caption: "הסוד לצמיחה שלא מדברים עליו 👇", hashtags: "#אינסטגרם #שיווק #תוכן" } },
    checklist: { footage_on_drive: true, files_named: true, hook_strong: true, subtitles_added: true, cover_ready: true },
    notes: [{ author: "נעם", text: "סרטון מוכן, ממתין לאישור ספיר", time: "אתמול 20:00" }],
    views: 15400, saves: 890, shares: 234,
  },
  {
    id: "2", title: "יום בחיים שלי כיוצר תוכן", description: "Vlog של יום צילום שלם",
    shoot_date: "2026-05-19", publish_date: "2026-05-23", publish_time: "17:00",
    status: "editing", networks: ["youtube", "instagram"], drive_link: "https://drive.google.com",
    inspiration_link: "", script: "", label: "broad",
    copies: {}, checklist: { footage_on_drive: true, files_named: true },
    notes: [{ author: "ספיר", text: "שלחתי לעריכה, חוזר עד חמישי", time: "היום 10:30" }],
    views: 8200, saves: 612, shares: 98,
  },
  {
    id: "3", title: "איך אני מתכנן את התוכן לחודש", description: "תהליך תכנון תוכן חודשי",
    shoot_date: "2026-05-22", publish_date: "2026-05-26", publish_time: "19:00",
    status: "planned", networks: ["instagram", "tiktok", "facebook"], drive_link: "",
    inspiration_link: "", script: "", label: "niche", copies: {}, checklist: {}, notes: [],
  },
  {
    id: "4", title: "שגיאות שעשיתי בשנה הראשונה", description: "לקחים ממה שלא עבד",
    shoot_date: "2026-05-18", publish_date: "2026-05-19", publish_time: "18:00",
    status: "published", networks: ["instagram", "tiktok"], drive_link: "https://drive.google.com",
    inspiration_link: "", script: "", label: "viral",
    copies: { instagram: { caption: "שנה ראשונה, 10 טעויות גדולות 😅", hashtags: "#יוצרתוכן #שיווק" } },
    checklist: Object.fromEntries(CHECKLIST_ITEMS.map(i => [i.key, true])),
    notes: [{ author: "ספיר", text: "עלה! ביצועים מעולים 🔥", time: "אתמול 18:00" }],
    views: 24100, saves: 1420, shares: 567,
  },
  {
    id: "5", title: "ציוד צילום שכל יוצר תוכן צריך", description: "מדריך ציוד לתחילת דרך",
    shoot_date: "2026-05-21", publish_date: "2026-05-28", publish_time: "17:30",
    status: "filmed", networks: ["youtube", "instagram", "tiktok"], drive_link: "https://drive.google.com",
    inspiration_link: "", script: "", label: "carousel",
    copies: {}, checklist: { footage_on_drive: true, files_named: true }, notes: [],
    views: 5100, saves: 320, shares: 45,
  },
  {
    id: "6", title: "3 טעויות שכל מתחיל עושה בטיקטוק", description: "טיפים למתחילים",
    shoot_date: "2026-05-23", publish_date: "2026-05-30", publish_time: "19:00",
    status: "on_drive", networks: ["tiktok", "instagram"], drive_link: "https://drive.google.com",
    inspiration_link: "", script: "", label: "broad",
    copies: {}, checklist: { footage_on_drive: true, files_named: true, no_missing_clips: true }, notes: [],
  },
];
const DEMO_FOLLOWERS: FollowerEntry[] = [
  { date: "2026-05-01", network: "instagram", count: 4200 },
  { date: "2026-05-01", network: "tiktok",    count: 8900 },
  { date: "2026-05-08", network: "instagram", count: 4850 },
  { date: "2026-05-08", network: "tiktok",    count: 10200 },
  { date: "2026-05-15", network: "instagram", count: 5600 },
  { date: "2026-05-15", network: "tiktok",    count: 12400 },
  { date: "2026-05-21", network: "instagram", count: 6100 },
  { date: "2026-05-21", network: "tiktok",    count: 14800 },
];

// ─── Utils ────────────────────────────────────────────────────────────────────
function cn(...cls: (string | boolean | undefined | null)[]) { return cls.filter(Boolean).join(" "); }
function getCol(columns: Column[], id: string): Column {
  return columns.find(c => c.id === id) ?? {
    id, label: id, emoji: "📌",
    bg: "bg-slate-50", border: "border-slate-200",
    header: "bg-slate-100", badge: "bg-slate-100 text-slate-600",
    gradient: "linear-gradient(135deg, #94a3b8, #64748b)", accent: "#94a3b8",
  };
}
function toDateStr(d: Date) { return d.toISOString().split("T")[0]; }
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

// ─── Kanban Card (Monday style) ───────────────────────────────────────────────
function KanbanCard({ video, columns, onClick }: { video: Video; columns: Column[]; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: video.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const col = getCol(columns, video.status);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onClick}
      className={cn(
        "bg-white rounded-xl border border-slate-100 relative overflow-hidden",
        "cursor-grab active:cursor-grabbing select-none",
        "hover:shadow-md hover:-translate-y-0.5 transition-all duration-150",
        isDragging && "opacity-40 shadow-xl rotate-1"
      )}>
      {/* Top accent bar (Monday style) */}
      <div className="h-1 w-full" style={{ background: col.gradient }} />

      <div className="p-3.5">
        <p className="font-normal text-sm text-slate-700 leading-snug mb-2.5">{video.title}</p>

        {video.label ? (
          <div className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium border mb-2.5", LABEL_CONFIG[video.label].color)}>
            {LABEL_CONFIG[video.label].emoji} {LABEL_CONFIG[video.label].label}
          </div>
        ) : (
          <div className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium border mb-2.5 bg-slate-50 text-slate-400 border-slate-200">
            ללא קטגוריה
          </div>
        )}

        {video.publish_date && (
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <span>📅</span>
            <span>{formatDate(video.publish_date)}{video.publish_time ? ` · ${video.publish_time.slice(0, 5)}` : ""}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Kanban Column (Monday style) ─────────────────────────────────────────────
function KanbanColumn({ col, videos, columns, onCardClick, onRename, onAddCard }: {
  col: Column; videos: Video[]; columns: Column[];
  onCardClick: (v: Video) => void; onRename: (id: string, label: string) => void;
  onAddCard: (status: string, title: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(col.label);
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");

  function commit() {
    if (editVal.trim()) onRename(col.id, editVal.trim());
    setEditing(false);
  }

  function submitCard(e: React.FormEvent) {
    e.preventDefault();
    if (!newCardTitle.trim()) return;
    onAddCard(col.id, newCardTitle.trim());
    setNewCardTitle("");
    setAddingCard(false);
  }

  return (
    <div ref={setNodeRef}
      className={cn("w-[230px] shrink-0 rounded-xl overflow-hidden border transition-all",
        col.border, isOver && "ring-2 ring-[#42FEEE]"
      )}>
      {/* Monday-style gradient header */}
      <div className="px-3.5 py-3 flex items-center justify-between text-white"
        style={{ background: col.gradient }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-base shrink-0">{col.emoji}</span>
          {editing ? (
            <input autoFocus value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onBlur={commit}
              onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
              className="text-xs font-bold rounded px-1.5 py-0.5 flex-1 focus:outline-none bg-white/20 border border-white/40 text-white placeholder:text-white/50 min-w-0"
            />
          ) : (
            <span className="font-bold text-sm truncate flex-1 cursor-default"
              onDoubleClick={() => { setEditVal(col.label); setEditing(true); }}
              title="לחץ פעמיים לשינוי שם">
              {col.label}
            </span>
          )}
        </div>
        <span className="bg-white/25 text-white text-xs px-2 py-0.5 rounded-full font-bold shrink-0 mr-1">
          {videos.length}
        </span>
      </div>

      {/* Cards */}
      <div className={cn("p-2 space-y-2", col.bg)}>
        <SortableContext items={videos.map(v => v.id)} strategy={verticalListSortingStrategy}>
          {videos.map(v => (
            <KanbanCard key={v.id} video={v} columns={columns} onClick={() => onCardClick(v)} />
          ))}
        </SortableContext>
        {videos.length === 0 && !addingCard && (
          <div className="h-8 rounded-lg border-2 border-dashed border-slate-200 opacity-40" />
        )}

        {/* Add card inline form */}
        {addingCard ? (
          <form onSubmit={submitCard} className="space-y-1.5">
            <textarea autoFocus value={newCardTitle}
              onChange={e => setNewCardTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitCard(e as any); } if (e.key === "Escape") { setAddingCard(false); setNewCardTitle(""); } }}
              placeholder="נושא הסרטון..."
              rows={2}
              className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-[#42FEEE] bg-white shadow-sm"
            />
            <div className="flex items-center gap-1.5">
              <button type="submit"
                className="text-xs font-bold px-3 py-1.5 rounded-lg text-[#0E1525]"
                style={{ background: col.gradient }}>
                הוסף
              </button>
              <button type="button" onClick={() => { setAddingCard(false); setNewCardTitle(""); }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white transition-colors">
                <X size={14} />
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setAddingCard(true)}
            className={cn(
              "w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all",
              "text-slate-400 hover:text-slate-600 hover:bg-white/60"
            )}>
            <Plus size={14} /> הוסף כרטיס
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Video Panel ──────────────────────────────────────────────────────────────
function VideoPanel({ video, onClose, onUpdate, onDelete, columns, panelTabLabels, onRenameTab, currentUser }: {
  video: Video; onClose: () => void; onUpdate: (v: Video) => void; onDelete: (id: string) => void;
  columns: Column[];
  panelTabLabels: Record<PanelTab, string>;
  onRenameTab: (tab: PanelTab, label: string) => void;
  currentUser: string;
}) {
  const [tab, setTab] = useState<PanelTab>("info");
  const [f, setF] = useState({ ...video });
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingTab, setEditingTab] = useState<PanelTab | null>(null);
  const [editingTabVal, setEditingTabVal] = useState("");

  function save() { onUpdate(f); setSaved(true); setTimeout(() => setSaved(false), 2000); }
  function toggle(key: string) { setF(p => ({ ...p, checklist: { ...p.checklist, [key]: !p.checklist[key] } })); }
  function sendNote() {
    if (!note.trim()) return;
    const timeStr = new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
    setF(p => ({ ...p, notes: [...p.notes, { author: currentUser || "נועם", text: note.trim(), time: `היום ${timeStr}` }] }));
    setNote("");
  }
  function setCopy(net: Network, field: "caption" | "hashtags", val: string) {
    setF(p => ({ ...p, copies: { ...p.copies, [net]: { ...(p.copies[net] || {}), [field]: val } } }));
  }
  function commitTabRename() {
    if (editingTabVal.trim() && editingTab) onRenameTab(editingTab, editingTabVal.trim());
    setEditingTab(null);
  }

  const stages = [...new Set(CHECKLIST_ITEMS.map(i => i.stage))];
  const checked = Object.values(f.checklist).filter(Boolean).length;
  const col = getCol(columns, f.status);
  const PANEL_TABS: PanelTab[] = ["info", "copy", "checklist", "notes", "script"];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed left-0 top-0 h-full w-full max-w-[430px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header accent */}
        <div className="h-1" style={{ background: col.gradient }} />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold", col.badge)}>
              {col.emoji} {col.label}
            </span>
            {f.label && (
              <span className={cn("text-xs px-2 py-0.5 rounded-md border font-medium", LABEL_CONFIG[f.label].color)}>
                {LABEL_CONFIG[f.label].emoji} {LABEL_CONFIG[f.label].label}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 px-3 pt-3 border-b border-slate-100 overflow-x-auto">
          {PANEL_TABS.map(t => {
            const baseLabel = panelTabLabels[t];
            const displayLabel = t === "checklist" ? `${baseLabel} (${checked}/${CHECKLIST_ITEMS.length})` : baseLabel;
            return (
              <div key={t} className="shrink-0">
                {editingTab === t ? (
                  <input autoFocus value={editingTabVal}
                    onChange={e => setEditingTabVal(e.target.value)}
                    onBlur={commitTabRename}
                    onKeyDown={e => { if (e.key === "Enter") commitTabRename(); if (e.key === "Escape") setEditingTab(null); }}
                    className="px-2 py-1.5 text-xs font-medium border border-[#42FEEE] rounded-t-lg focus:outline-none w-20"
                  />
                ) : (
                  <button onClick={() => setTab(t)}
                    onDoubleClick={() => { setEditingTabVal(baseLabel); setEditingTab(t); }}
                    title="לחץ פעמיים לשינוי שם"
                    className={cn("px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 whitespace-nowrap transition-colors",
                      tab === t ? "border-[#42FEEE] text-[#0E1525] bg-[#42FEEE]/10" : "border-transparent text-slate-500 hover:text-slate-700"
                    )}>
                    {t === "script" ? <span className="flex items-center gap-1"><FileText size={11} />{displayLabel}</span> : displayLabel}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* ── Info ── */}
          {tab === "info" && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">כותרת</label>
                <input value={f.title} onChange={e => setF(p => ({ ...p, title: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#42FEEE]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">תיאור</label>
                <textarea value={f.description} onChange={e => setF(p => ({ ...p, description: e.target.value }))}
                  rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#42FEEE]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">סוג תוכן</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(LABEL_CONFIG) as [NonNullable<ContentLabel>, typeof LABEL_CONFIG[keyof typeof LABEL_CONFIG]][]).map(([key, cfg]) => (
                    <button key={key} type="button"
                      onClick={() => setF(p => ({ ...p, label: p.label === key ? null : key }))}
                      className={cn("px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all",
                        f.label === key ? cfg.color + " shadow-sm scale-105" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                      )}>
                      {cfg.emoji} {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">סטטוס</label>
                <select value={f.status} onChange={e => setF(p => ({ ...p, status: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#42FEEE]">
                  {columns.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">תאריך צילום</label>
                  <input type="date" value={f.shoot_date} onChange={e => setF(p => ({ ...p, shoot_date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#42FEEE]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">תאריך פרסום</label>
                  <input type="date" value={f.publish_date} onChange={e => setF(p => ({ ...p, publish_date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#42FEEE]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">שעת פרסום</label>
                <input type="time" value={f.publish_time} onChange={e => setF(p => ({ ...p, publish_time: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#42FEEE]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">רשתות</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_NETWORKS.map(n => (
                    <button key={n} type="button"
                      onClick={() => setF(p => ({ ...p, networks: p.networks.includes(n) ? p.networks.filter(x => x !== n) : [...p.networks, n] }))}
                      className={cn("px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                        f.networks.includes(n) ? "text-[#0E1525] border-[#42FEEE] bg-[#42FEEE]" : "bg-white text-slate-600 border-slate-200 hover:border-[#42FEEE]/50"
                      )}>
                      {NET_EMOJI[n]} {NET_LABEL[n]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">קישור Google Drive</label>
                <div className="flex gap-2">
                  <input value={f.drive_link} onChange={e => setF(p => ({ ...p, drive_link: e.target.value }))}
                    placeholder="https://drive.google.com/..." className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#42FEEE]" />
                  {f.drive_link && <a href={f.drive_link} target="_blank" rel="noopener noreferrer" className="text-[#0E1525] bg-[#42FEEE] p-2 rounded-lg hover:opacity-80"><ExternalLink size={16} /></a>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1.5"><LinkIcon size={12} /> קישור השראה</label>
                <div className="flex gap-2">
                  <input value={f.inspiration_link} onChange={e => setF(p => ({ ...p, inspiration_link: e.target.value }))}
                    placeholder="https://..." className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#42FEEE]" />
                  {f.inspiration_link && <a href={f.inspiration_link} target="_blank" rel="noopener noreferrer" className="text-[#0E1525] bg-[#42FEEE] p-2 rounded-lg hover:opacity-80"><ExternalLink size={16} /></a>}
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 gap-3">
                <div className="flex items-center gap-2">
                  <button onClick={save} className="flex items-center gap-2 text-[#0E1525] font-semibold bg-[#42FEEE] hover:opacity-90 text-sm px-5 py-2.5 rounded-lg transition-all">
                    <Save size={14} /> שמור שינויים
                  </button>
                  {saved && <span className="text-xs text-emerald-600 font-medium">✓ נשמר!</span>}
                </div>
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">בטוח?</span>
                    <button onClick={() => { onDelete(video.id); onClose(); }}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">
                      מחק
                    </button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5">
                      ביטול
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-all border border-transparent hover:border-red-100">
                    <Trash2 size={13} /> מחק סרטון
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Copy ── */}
          {tab === "copy" && (
            <div>
              {ALL_NETWORKS.map(n => (
                <div key={n} className={cn("mb-4 border rounded-xl p-3 transition-opacity",
                  f.networks.includes(n) ? "border-slate-200 bg-slate-50/50" : "border-dashed border-slate-200 bg-white opacity-50"
                )}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-base">{NET_EMOJI[n]}</span>
                    <span className="text-xs font-semibold text-slate-600">{NET_LABEL[n]}</span>
                    {!f.networks.includes(n) && <span className="text-[10px] text-slate-400 mr-auto">לא נבחר</span>}
                    {f.copies[n]?.caption && f.networks.includes(n) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-auto" />}
                  </div>
                  <textarea value={f.copies[n]?.caption ?? ""} onChange={e => setCopy(n, "caption", e.target.value)}
                    rows={3} placeholder="Caption לפוסט..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#42FEEE] mb-2 bg-white" />
                  <input value={f.copies[n]?.hashtags ?? ""} onChange={e => setCopy(n, "hashtags", e.target.value)}
                    placeholder="#hashtag1 #hashtag2" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#42FEEE] bg-white" />
                </div>
              ))}
              <button onClick={save} className="flex items-center gap-2 text-[#0E1525] font-semibold bg-[#42FEEE] hover:opacity-90 text-sm px-4 py-2 rounded-lg">
                <Save size={14} /> שמור קופי
              </button>
            </div>
          )}

          {/* ── Checklist ── */}
          {tab === "checklist" && (
            <div>
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>התקדמות</span><span className="font-medium">{checked}/{CHECKLIST_ITEMS.length}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#42FEEE] rounded-full transition-all" style={{ width: `${(checked / CHECKLIST_ITEMS.length) * 100}%` }} />
                </div>
              </div>
              {stages.map(stage => (
                <div key={stage} className="mb-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">{stage}</h4>
                  {CHECKLIST_ITEMS.filter(i => i.stage === stage).map(item => (
                    <button key={item.key} onClick={() => toggle(item.key)}
                      className="flex items-center gap-2.5 w-full text-right p-2 hover:bg-slate-50 rounded-lg transition-colors">
                      <span className={f.checklist[item.key] ? "text-[#42FEEE]" : "text-slate-200"}
                        style={f.checklist[item.key] ? { filter: "drop-shadow(0 0 4px #42FEEE)" } : {}}>
                        {f.checklist[item.key] ? <CheckSquare size={16} /> : <Square size={16} />}
                      </span>
                      <span className={cn("text-sm", f.checklist[item.key] ? "line-through text-slate-400" : "text-slate-700")}>{item.label}</span>
                    </button>
                  ))}
                </div>
              ))}
              <button onClick={save} className="flex items-center gap-2 text-[#0E1525] font-semibold bg-[#42FEEE] hover:opacity-90 text-sm px-4 py-2 rounded-lg mt-2">
                <Save size={14} /> שמור
              </button>
            </div>
          )}

          {/* ── Notes ── */}
          {tab === "notes" && (
            <div>
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {f.notes.length === 0 && <p className="text-sm text-slate-400 text-center py-8">אין הערות עדיין</p>}
                {f.notes.map((n, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-700">{n.author}</span>
                      <span className="text-xs text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{n.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={note} onChange={e => setNote(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sendNote(); } }}
                  placeholder="הוסף הערה..." className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#42FEEE]" />
                <button onClick={sendNote} className="bg-[#42FEEE] text-[#0E1525] p-2 rounded-lg hover:opacity-80"><Send size={16} /></button>
              </div>
            </div>
          )}

          {/* ── Script ── */}
          {tab === "script" && (
            <div>
              <p className="text-xs text-slate-400 mb-3">Hook, תוכן עיקרי, CTA</p>
              <textarea value={f.script} onChange={e => setF(p => ({ ...p, script: e.target.value }))}
                rows={18} placeholder={"פתיחה (Hook):\n\nתוכן עיקרי:\n1.\n2.\n3.\n\nסיכום + CTA:"}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#42FEEE] leading-relaxed font-mono" />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-slate-400">{f.script.length} תווים</span>
                <button onClick={save} className="flex items-center gap-2 text-[#0E1525] font-semibold bg-[#42FEEE] hover:opacity-90 text-sm px-4 py-2 rounded-lg">
                  <Save size={14} /> שמור תסריט
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardView({ videos, columns }: { videos: Video[]; columns: Column[] }) {
  const today = new Date();
  const todayStr = toDateStr(today);

  // Monthly stats
  const monthStart = toDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
  const monthEnd   = toDateStr(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  const publishedMonth = videos.filter(v => v.status === "published" && v.publish_date >= monthStart && v.publish_date <= monthEnd);

  // Weekly stats
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
  const publishedWeek = videos.filter(v =>
    v.status === "published" && v.publish_date >= toDateStr(weekStart) && v.publish_date <= toDateStr(weekEnd)
  ).length;
  const youtubeMonth = publishedMonth.filter(v => v.networks.includes("youtube")).length;

  // Label stats
  const byLabel = {
    viral:    publishedMonth.filter(v => v.label === "viral").length,
    broad:    publishedMonth.filter(v => v.label === "broad").length,
    niche:    publishedMonth.filter(v => v.label === "niche").length,
    carousel: publishedMonth.filter(v => v.label === "carousel").length,
  };

  // Next video
  const nextVideo = videos
    .filter(v => v.publish_date >= todayStr && v.status !== "published")
    .sort((a, b) => `${a.publish_date} ${a.publish_time}`.localeCompare(`${b.publish_date} ${b.publish_time}`))[0] ?? null;

  // Next 7 days
  const next7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i); return d;
  });

  return (
    <div className="space-y-4">

      {/* ── Row 1: Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">שלום נעם! 👋</h1>
          <p className="text-slate-400 text-xs mt-0.5">{today.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs bg-white border border-slate-100 rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
            <Target size={12} className="text-[#42FEEE]" />
            <span className="text-slate-500">שבועי</span>
            <span className="font-bold text-slate-800">{publishedWeek}/3</span>
          </div>
          <div className="text-xs bg-white border border-slate-100 rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
            <Youtube size={12} className="text-red-400" />
            <span className="text-slate-500">יוטיוב</span>
            <span className="font-bold text-slate-800">{youtubeMonth}/1</span>
          </div>
          <div className="text-xs bg-white border border-slate-100 rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
            <TrendingUp size={12} className="text-emerald-400" />
            <span className="text-slate-500">החודש</span>
            <span className="font-bold text-slate-800">{publishedMonth.length}</span>
          </div>
        </div>
      </div>

      {/* ── Row 2: Main grid ── */}
      <div className="grid grid-cols-5 gap-4">

        {/* Left col — 3/5: Next video + 7 days */}
        <div className="col-span-3 space-y-4">

          {/* Next video */}
          {nextVideo ? (
            <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, #0E1525 0%, #1a2744 100%)" }}>
              <div className="text-[10px] text-white/40 mb-1 font-medium tracking-widest uppercase">הסרטון הבא שעולה</div>
              <div className="font-semibold text-white text-base mb-2 leading-snug">{nextVideo.title}</div>
              <div className="flex items-center gap-2 flex-wrap">
                {nextVideo.label && (
                  <span className={cn("text-[11px] px-2 py-0.5 rounded-lg font-semibold border", LABEL_CONFIG[nextVideo.label].color)}>
                    {LABEL_CONFIG[nextVideo.label].emoji} {LABEL_CONFIG[nextVideo.label].label}
                  </span>
                )}
                {nextVideo.networks.slice(0, 3).map(n => (
                  <span key={n} className="text-[11px] text-white/40">{NET_EMOJI[n]} {NET_LABEL[n]}</span>
                ))}
                {nextVideo.publish_date && (
                  <span className="text-[11px] font-semibold text-[#42FEEE] mr-auto">
                    📅 {new Date(nextVideo.publish_date).toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" })}
                    {nextVideo.publish_time && ` · ${nextVideo.publish_time.slice(0, 5)}`}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-4 border-2 border-dashed border-slate-200 text-center text-sm text-slate-400">
              אין סרטון מתוכנן קרוב
            </div>
          )}

          {/* 7 days strip */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1.5">
              <Calendar size={13} className="text-slate-400" /> 7 הימים הקרובים
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {next7.map(day => {
                const ds = toDateStr(day);
                const dayVids = videos.filter(v => v.publish_date === ds).sort((a, b) => (a.publish_time || "").localeCompare(b.publish_time || ""));
                const isToday = ds === todayStr;
                return (
                  <div key={ds} className={cn("rounded-xl overflow-hidden border",
                    isToday ? "border-[#42FEEE]" : "border-slate-100"
                  )}>
                    <div className={cn("py-1.5 text-center border-b",
                      isToday ? "bg-[#42FEEE]/10 border-[#42FEEE]/20" : "bg-slate-50 border-slate-100"
                    )}>
                      <div className="text-[9px] text-slate-400">{DAYS_FULL[day.getDay()].slice(0, 2)}</div>
                      <div className={cn("text-sm font-bold", isToday ? "text-[#0E1525]" : "text-slate-600")}>{day.getDate()}</div>
                    </div>
                    <div className="p-1 space-y-0.5 min-h-[48px] bg-white">
                      {dayVids.length === 0 && <div className="text-[9px] text-slate-200 text-center pt-1.5">—</div>}
                      {dayVids.map(v => {
                        const cfg = v.label ? LABEL_CONFIG[v.label] : null;
                        return (
                          <div key={v.id} className={cn("rounded px-1 py-1 border text-right",
                            cfg ? cfg.color : "bg-slate-50 border-slate-200 text-slate-600"
                          )}>
                            {v.publish_time && <div className="text-[9px] font-bold opacity-60">{v.publish_time.slice(0, 5)}</div>}
                            <div className="text-[10px] font-medium leading-tight line-clamp-2">{v.title}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right col — 2/5: Goals + Monthly + Top videos */}
        <div className="col-span-2 space-y-3">

          {/* Goals — compact side by side */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Target size={13} className="text-[#42FEEE]" />, label: "שבועי — 3 פוסטים", val: publishedWeek, max: 3, met: publishedWeek >= 3 },
              { icon: <Youtube size={13} className="text-red-400" />, label: "יוטיוב — 1 בחודש",  val: youtubeMonth, max: 1, met: youtubeMonth >= 1 },
            ].map((g, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-3">
                <div className="flex items-center gap-1.5 mb-2">{g.icon}<span className="text-[10px] font-semibold text-slate-500 leading-tight">{g.label}</span></div>
                <div className="text-2xl font-black text-slate-800">{g.val}<span className="text-slate-300 text-sm font-medium">/{g.max}</span></div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                  <div className="h-full rounded-full" style={{ width: `${Math.min((g.val / g.max) * 100, 100)}%`, background: g.met ? "#10b981" : "#42FEEE" }} />
                </div>
                <div className="text-[10px] mt-1.5">{g.met ? <span className="text-emerald-500 font-semibold">✓ יעד הושג!</span> : <span className="text-slate-400">{g.max - g.val} נותר</span>}</div>
              </div>
            ))}
          </div>

          {/* Monthly by label */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0E1525 0%, #1a2744 100%)" }}>
            <div className="relative p-3.5">
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, rgba(66,254,238,0.10) 0%, transparent 60%)" }} />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-white/70">תוכן החודש</span>
                  <span className="text-lg font-black text-white">{publishedMonth.length} <span className="text-white/30 text-xs font-normal">פוסטים</span></span>
                </div>
                <div className="space-y-2">
                  {(Object.entries(byLabel) as [NonNullable<ContentLabel>, number][]).map(([key, count]) => {
                    const pct = publishedMonth.length > 0 ? Math.round((count / publishedMonth.length) * 100) : 0;
                    const cfg = LABEL_CONFIG[key];
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-xs shrink-0">{cfg.emoji}</span>
                        <div className="flex-1">
                          <div className="flex justify-between mb-0.5">
                            <span className="text-[10px] text-white/60">{cfg.label}</span>
                            <span className="text-[10px] font-bold text-white">{count}</span>
                          </div>
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#42FEEE" }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Top performing */}
          <div className="bg-white rounded-2xl border border-slate-100 p-3.5">
            <div className="flex items-center gap-1.5 mb-2.5">
              <TrendingUp size={13} className="text-[#42FEEE]" />
              <span className="text-xs font-semibold text-slate-600">סרטונים שהתפוצצו 🔥</span>
            </div>
            {videos.filter(v => v.views).sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 3).map((v, i) => {
              const col = getCol(columns, v.status);
              return (
                <div key={v.id} className="flex items-center gap-2 py-2 border-b last:border-0 border-slate-50">
                  <span className="text-xs font-black text-slate-300 w-4">#{i + 1}</span>
                  <div className="w-0.5 h-6 rounded-full shrink-0" style={{ background: col.accent }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-700 truncate">{v.title}</div>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400">👁️ {(v.views || 0).toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400">🔖 {(v.saves || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  {v.label && <span className={cn("text-[10px] px-1 py-0.5 rounded border shrink-0", LABEL_CONFIG[v.label].color)}>{LABEL_CONFIG[v.label].emoji}</span>}
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
function CalendarView({ videos, columns, onReschedule }: {
  videos: Video[]; columns: Column[];
  onReschedule: (id: string, date: string) => void;
}) {
  const [cur, setCur] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [dragId, setDragId] = useState<string | null>(null);

  const year = cur.getFullYear();
  const month = cur.getMonth();
  const today = toDateStr(new Date());

  // Week helpers
  const weekStart = new Date(cur);
  weekStart.setDate(cur.getDate() - cur.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d;
  });

  function prevPeriod() {
    if (view === "month") setCur(new Date(year, month - 1));
    else { const d = new Date(cur); d.setDate(d.getDate() - 7); setCur(d); }
  }
  function nextPeriod() {
    if (view === "month") setCur(new Date(year, month + 1));
    else { const d = new Date(cur); d.setDate(d.getDate() + 7); setCur(d); }
  }

  // Month grid
  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const offset = firstDay.getDay();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: lastDate }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  function dateStr(day: number) { return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; }

  const headerTitle = view === "month"
    ? `${MONTHS_HE[month]} ${year}`
    : `${weekDays[0].getDate()} ${MONTHS_HE[weekDays[0].getMonth()]} — ${weekDays[6].getDate()} ${MONTHS_HE[weekDays[6].getMonth()]} ${year}`;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0E1525] to-[#1a2744]">
          <button onClick={prevPeriod} className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors"><ChevronRight size={18} /></button>
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-lg text-white">{headerTitle}</h2>
            <div className="flex rounded-lg overflow-hidden border border-white/20">
              {(["month", "week"] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={cn("px-3 py-1.5 text-xs font-semibold transition-colors",
                    view === v ? "bg-[#42FEEE] text-[#0E1525]" : "text-white/60 hover:text-white"
                  )}>{v === "month" ? "חודש" : "שבוע"}</button>
              ))}
            </div>
          </div>
          <button onClick={nextPeriod} className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors"><ChevronLeft size={18} /></button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
          {DAYS_HE.map(d => <div key={d} className="text-center py-2.5 text-xs font-semibold text-slate-500">{d}</div>)}
        </div>

        {/* Month view */}
        {view === "month" && (
          <>
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                if (!day) return <div key={`e${i}`} className="min-h-[100px] border-b border-l border-slate-50 bg-slate-50/40" />;
                const ds = dateStr(day);
                const dayVideos = videos.filter(v => v.publish_date === ds);
                const isToday = ds === today;
                return (
                  <div key={ds}
                    className={cn("min-h-[100px] border-b border-l border-slate-100 p-1.5 transition-colors", isToday && "bg-[#42FEEE]/5")}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => { if (dragId) { onReschedule(dragId, ds); setDragId(null); } }}>
                    <div className={cn("text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1",
                      isToday ? "bg-[#42FEEE] text-[#0E1525]" : "text-slate-500"
                    )}>{day}</div>
                    {dayVideos.map(v => {
                      const col = getCol(columns, v.status);
                      return (
                        <div key={v.id} draggable onDragStart={() => setDragId(v.id)}
                          className="text-[10px] px-1.5 py-1 rounded-lg mb-1 font-medium cursor-grab leading-tight border"
                          style={{ background: `${col.accent}18`, borderColor: `${col.accent}40`, color: col.accent }}>
                          <div className="font-bold truncate">{v.title}</div>
                          <div className="flex items-center gap-1 opacity-80 mt-0.5">
                            {v.publish_time && <span>{v.publish_time.slice(0, 5)}</span>}
                            {v.label && <span>{LABEL_CONFIG[v.label].emoji} {LABEL_CONFIG[v.label].label}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 px-5 py-3 bg-slate-50 border-t border-slate-100 flex-wrap">
              {columns.map(col => (
                <div key={col.id} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.accent }} />
                  <span className="text-xs text-slate-500">{col.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Week view */}
        {view === "week" && (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map(day => {
                const ds = toDateStr(day);
                const dayVids = videos.filter(v => v.publish_date === ds).sort((a, b) => (a.publish_time || "").localeCompare(b.publish_time || ""));
                const isToday = ds === today;
                return (
                  <div key={ds}
                    className={cn("min-h-[320px] rounded-xl border-2 p-2 transition-colors",
                      isToday ? "border-[#42FEEE] bg-[#42FEEE]/5" : "border-slate-200 bg-white"
                    )}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => { if (dragId) { onReschedule(dragId, ds); setDragId(null); } }}>
                    {/* Day header */}
                    <div className={cn("text-center mb-2.5 py-1.5 rounded-lg", isToday && "bg-[#42FEEE]/15")}>
                      <div className="text-[10px] font-semibold text-slate-400">{DAYS_FULL[day.getDay()]}</div>
                      <div className={cn("text-xl font-black", isToday ? "text-[#0E1525]" : "text-slate-700")}>{day.getDate()}</div>
                    </div>
                    {/* Videos */}
                    {dayVids.map(v => {
                      const col = getCol(columns, v.status);
                      return (
                        <div key={v.id} draggable onDragStart={() => setDragId(v.id)}
                          className="mb-2 rounded-xl border overflow-hidden cursor-grab hover:shadow-md transition-shadow"
                          style={{ borderColor: `${col.accent}40` }}>
                          {/* Accent top */}
                          <div className="h-0.5" style={{ background: col.gradient }} />
                          <div className="p-2" style={{ background: `${col.accent}08` }}>
                            {v.publish_time && (
                              <div className="text-[10px] font-black mb-1" style={{ color: col.accent }}>
                                ⏰ {v.publish_time.slice(0, 5)}
                              </div>
                            )}
                            <div className="text-xs font-semibold text-slate-800 leading-snug mb-1.5">{v.title}</div>
                            {v.label && (
                              <span className={cn("inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md font-semibold border", LABEL_CONFIG[v.label].color)}>
                                {LABEL_CONFIG[v.label].emoji} {LABEL_CONFIG[v.label].label}
                              </span>
                            )}
                            <div className="text-[10px] text-slate-400 mt-1 truncate">{v.description}</div>
                          </div>
                        </div>
                      );
                    })}
                    {dayVids.length === 0 && (
                      <div className="text-center text-xs text-slate-300 mt-4">אין תוכן</div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 text-center mt-3">גרור סרטון לתאריך אחר כדי לשנות את יום הפרסום</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────────
function AnalyticsView() {
  const [followers, setFollowers] = useState<FollowerEntry[]>(DEMO_FOLLOWERS);
  const [showForm, setShowForm] = useState(false);
  const [newEntry, setNewEntry] = useState({ network: "instagram" as Network, count: "" });

  const latestByNet: Partial<Record<Network, FollowerEntry[]>> = {};
  followers.forEach(f => { if (!latestByNet[f.network]) latestByNet[f.network] = []; latestByNet[f.network]!.push(f); });
  const netFollowers: Partial<Record<Network, number>> = {};
  (Object.entries(latestByNet) as [Network, FollowerEntry[]][]).forEach(([net, entries]) => {
    netFollowers[net] = entries.sort((a, b) => b.date.localeCompare(a.date))[0].count;
  });

  function addEntry() {
    if (!newEntry.count) return;
    const today = toDateStr(new Date());
    setFollowers(p => [...p, { date: today, network: newEntry.network, count: parseInt(newEntry.count) }]);
    setNewEntry({ network: "instagram", count: "" }); setShowForm(false);
  }

  const igEntries = followers.filter(f => f.network === "instagram").sort((a, b) => a.date.localeCompare(b.date));
  const ttEntries = followers.filter(f => f.network === "tiktok").sort((a, b) => a.date.localeCompare(b.date));
  const maxCount = Math.max(...followers.map(f => f.count), 1);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="relative rounded-2xl overflow-hidden mb-6" style={{ background: "linear-gradient(135deg, #0E1525 0%, #1a2744 50%, #0E1525 100%)" }}>
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #42FEEE33 0%, transparent 60%), radial-gradient(circle at 80% 20%, #42FEEE22 0%, transparent 50%)" }} />
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-5">
            <h1 className="font-bold text-xl text-white flex items-center gap-2"><Users size={22} className="text-[#42FEEE]" /> מעקב עוקבים</h1>
            <button onClick={() => setShowForm(p => !p)} className="flex items-center gap-2 bg-[#42FEEE] text-[#0E1525] text-sm font-bold px-4 py-2 rounded-lg hover:opacity-90">
              <Plus size={16} /> הוסף נתון
            </button>
          </div>
          {showForm && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-5 border border-white/20">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-white/60 mb-1.5">רשת</label>
                  <select value={newEntry.network} onChange={e => setNewEntry(p => ({ ...p, network: e.target.value as Network }))}
                    className="w-full rounded-lg px-3 py-2 text-sm bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#42FEEE]">
                    {ALL_NETWORKS.map(n => <option key={n} value={n} className="text-slate-900">{NET_EMOJI[n]} {NET_LABEL[n]}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-white/60 mb-1.5">מספר עוקבים</label>
                  <input type="number" value={newEntry.count} onChange={e => setNewEntry(p => ({ ...p, count: e.target.value }))}
                    placeholder="6500" className="w-full rounded-lg px-3 py-2 text-sm bg-white/10 border border-white/20 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#42FEEE]" />
                </div>
                <button onClick={addEntry} className="bg-[#42FEEE] text-[#0E1525] font-bold px-4 py-2 rounded-lg text-sm">שמור</button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.entries(netFollowers) as [Network, number][]).map(([net, count]) => {
              const entries = latestByNet[net]!.sort((a, b) => a.date.localeCompare(b.date));
              const growth = entries.length > 1 ? count - entries[entries.length - 2].count : 0;
              return (
                <div key={net} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="text-xl mb-1">{NET_EMOJI[net]}</div>
                  <div className="text-2xl font-bold text-white">{count.toLocaleString()}</div>
                  <div className="text-xs text-white/50 mt-0.5">{NET_LABEL[net]}</div>
                  {growth > 0 && <div className="text-xs text-[#42FEEE] mt-1 font-medium">+{growth.toLocaleString()} ↑</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <h2 className="font-bold text-slate-800 mb-4">גרף צמיחה</h2>
        <div className="flex gap-6">
          {igEntries.length > 1 && (
            <div className="flex-1">
              <div className="text-xs font-semibold text-slate-500 mb-2">📸 אינסטגרם</div>
              <div className="flex items-end gap-1.5 h-24">
                {igEntries.map((e, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-md" style={{ height: `${(e.count / maxCount) * 100}%`, background: "#42FEEE", opacity: 0.7 + (i / igEntries.length) * 0.3 }} />
                    <span className="text-[9px] text-slate-400">{e.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {ttEntries.length > 1 && (
            <div className="flex-1">
              <div className="text-xs font-semibold text-slate-500 mb-2">🎵 טיקטוק</div>
              <div className="flex items-end gap-1.5 h-24">
                {ttEntries.map((e, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-md" style={{ height: `${(e.count / maxCount) * 100}%`, background: "#0E1525", opacity: 0.5 + (i / ttEntries.length) * 0.5 }} />
                    <span className="text-[9px] text-slate-400">{e.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sapir View ───────────────────────────────────────────────────────────────
function SapirView({ videos }: { videos: Video[] }) {
  const today = toDateStr(new Date());
  const todayVids = videos.filter(v => v.publish_date === today);
  const editingVids = videos.filter(v => v.status === "editing");
  const readyVids = videos.filter(v => v.status === "ready");

  return (
    <div className="max-w-sm mx-auto">
      <div className="rounded-2xl p-5 mb-5 text-center" style={{ background: "linear-gradient(135deg, #0E1525, #1a2a4a)" }}>
        <div className="text-3xl mb-2">👋</div>
        <h1 className="text-xl font-bold text-white">היי ספיר!</h1>
        <p className="text-white/50 text-sm mt-1">{new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-4 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#0E1525" }}>
          <span className="text-[#42FEEE] font-bold text-sm">📅 עולה היום</span>
          {todayVids.length > 0 && <span className="bg-[#42FEEE] text-[#0E1525] text-xs px-2 py-0.5 rounded-full font-bold">{todayVids.length}</span>}
        </div>
        {todayVids.length === 0
          ? <div className="p-4 text-sm text-slate-400 text-center">אין תוכן מתוזמן להיום 🎉</div>
          : todayVids.map(v => (
            <div key={v.id} className="p-4 border-b last:border-0 border-slate-50">
              <div className="font-semibold text-slate-800 mb-1">{v.title}</div>
              {v.label && <span className={cn("text-xs px-2 py-0.5 rounded-md border font-medium", LABEL_CONFIG[v.label].color)}>{LABEL_CONFIG[v.label].emoji} {LABEL_CONFIG[v.label].label}</span>}
              <div className="flex items-center gap-2 text-xs text-slate-500 my-2">
                {v.publish_time && <span>⏰ {v.publish_time.slice(0, 5)}</span>}
                {v.networks.map(n => <span key={n}>{NET_EMOJI[n]}</span>)}
              </div>
              <div className="space-y-1.5">
                {["cover_ready", "caption_ready", "cta_clear", "scheduled", "post_on_time"].map(key => {
                  const item = CHECKLIST_ITEMS.find(i => i.key === key);
                  const done = v.checklist[key];
                  return item ? (
                    <div key={key} className={cn("flex items-center gap-2 text-xs rounded-lg p-2", done ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-600")}>
                      <span>{done ? "✅" : "⬜"}</span><span>{item.label}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          ))
        }
      </div>
      {editingVids.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-4 shadow-sm">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">✂️ ממתינים לעריכה</span>
            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold">{editingVids.length}</span>
          </div>
          {editingVids.map(v => (
            <div key={v.id} className="px-4 py-3 border-b last:border-0 border-slate-50 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-800">{v.title}</div>
                <div className="text-xs text-slate-400 mt-0.5">{v.publish_date ? `פרסום: ${formatDate(v.publish_date)} · ${v.publish_time?.slice(0, 5) || ""}` : ""}</div>
              </div>
              {v.drive_link && <a href={v.drive_link} target="_blank" rel="noopener noreferrer" className="text-[#0E1525] bg-[#42FEEE] p-1.5 rounded-lg"><ExternalLink size={14} /></a>}
            </div>
          ))}
        </div>
      )}
      {readyVids.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">✅ מוכן לפרסום</span>
            <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-bold">{readyVids.length}</span>
          </div>
          {readyVids.map(v => (
            <div key={v.id} className="px-4 py-3 border-b last:border-0 border-slate-50">
              <div className="text-sm font-medium text-slate-800 mb-1">{v.title}</div>
              {v.label && <span className={cn("text-xs px-1.5 py-0.5 rounded border font-medium", LABEL_CONFIG[v.label].color)}>{LABEL_CONFIG[v.label].emoji} {LABEL_CONFIG[v.label].label}</span>}
              {v.publish_date && <div className="text-xs text-slate-400 mt-1.5">📅 {new Date(v.publish_date).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })} · {v.publish_time?.slice(0, 5)}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function DemoPage() {
  const [tab, setTab] = useState<Tab>("board");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showAddCol, setShowAddCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [selected, setSelected] = useState<Video | null>(null);
  const [panelTabLabels, setPanelTabLabels] = useState<Record<PanelTab, string>>({
    info: "פרטים", copy: "קופי", checklist: "צ׳קליסט", notes: "הערות", script: "תסריט",
  });

  // ── User ── (loaded after mount to avoid SSR hydration mismatch)
  const [currentUser, setCurrentUser] = useState<string>("");
  const [userLoaded, setUserLoaded] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("cos-user") || "";
    setCurrentUser(saved);
    setUserLoaded(true);
  }, []);
  function selectUser(name: string) {
    localStorage.setItem("cos-user", name);
    setCurrentUser(name);
  }

  // ── Persisted state (Supabase) ──
  const [videos, setVideos] = useState<Video[]>([]);
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);
  const [dbLoaded, setDbLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: vids } = await supabase
        .from("videos").select("*").order("created_at", { ascending: false });
      if (vids && vids.length > 0) setVideos(vids as unknown as Video[]);

      const { data: colData } = await supabase
        .from("kanban_columns").select("data").eq("id", "columns").single();
      if (colData?.data && Array.isArray(colData.data) && (colData.data as Column[]).length > 0)
        setColumns(colData.data as Column[]);

      setDbLoaded(true);
    }
    load();
  }, []);

  useEffect(() => {
    if (!dbLoaded) return;
    const supabase = createClient();
    supabase.from("kanban_columns").upsert({ id: "columns", data: columns }).then(() => {});
  }, [columns, dbLoaded]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragStart(e: DragStartEvent) { setActiveId(e.active.id as string); }
  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const dragged = videos.find(v => v.id === active.id);
    if (!dragged) return;
    const colIds = columns.map(c => c.id);
    const overStatus = colIds.includes(over.id as string) ? over.id as string : videos.find(v => v.id === over.id)?.status;
    if (overStatus && overStatus !== dragged.status) {
      setVideos(p => p.map(v => v.id === dragged.id ? { ...v, status: overStatus } : v));
      const supabase = createClient();
      supabase.from("videos").update({ status: overStatus }).eq("id", dragged.id).then(() => {});
    }
  }
  function onUpdate(updated: Video) {
    setVideos(p => p.map(v => v.id === updated.id ? updated : v));
    setSelected(updated);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = updated;
    supabase.from("videos").update(rest as Record<string, unknown>).eq("id", id).then(() => {});
  }
  function onReschedule(id: string, date: string) {
    setVideos(p => p.map(v => v.id === id ? { ...v, publish_date: date } : v));
    const supabase = createClient();
    supabase.from("videos").update({ publish_date: date }).eq("id", id).then(() => {});
  }
  function onDeleteVideo(id: string) {
    setVideos(p => p.filter(v => v.id !== id));
    setSelected(null);
    const supabase = createClient();
    supabase.from("videos").delete().eq("id", id).then(() => {});
  }
  async function onAddCard(status: string, title: string) {
    const supabase = createClient();
    const { data, error } = await supabase.from("videos").insert([{
      title, description: "", status,
      shoot_date: null, publish_date: null, publish_time: "",
      networks: [], drive_link: "", inspiration_link: "", script: "",
      label: null, copies: {}, checklist: {}, notes: [],
      views: 0, saves: 0, shares: 0,
    }]).select().single();
    if (error) { console.error("onAddCard error:", error); alert("שגיאה ביצירת סרטון: " + error.message); return; }
    if (data) {
      const v = data as unknown as Video;
      setVideos(p => [...p, v]);
      setSelected(v);
    }
  }
  async function addVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const supabase = createClient();
    const { data, error } = await supabase.from("videos").insert([{
      title: newTitle.trim(), description: "", status: "planned",
      shoot_date: null, publish_date: null, publish_time: "",
      networks: [], drive_link: "", inspiration_link: "", script: "",
      label: null, copies: {}, checklist: {}, notes: [],
      views: 0, saves: 0, shares: 0,
    }]).select().single();
    if (error) { console.error("addVideo error:", error); alert("שגיאה ביצירת סרטון: " + error.message); return; }
    if (data) {
      const v = data as unknown as Video;
      setVideos(p => [v, ...p]);
      setNewTitle(""); setShowNew(false); setSelected(v);
    }
  }
  function renameColumn(id: string, label: string) { setColumns(p => p.map(c => c.id === id ? { ...c, label } : c)); }
  function addColumn(e: React.FormEvent) {
    e.preventDefault();
    if (!newColName.trim()) return;
    const customCount = columns.filter(c => !DEFAULT_COLUMNS.find(d => d.id === c.id)).length;
    const style = CUSTOM_COL_STYLES[customCount % CUSTOM_COL_STYLES.length];
    setColumns(p => [...p, { id: `custom_${Date.now()}`, label: newColName.trim(), emoji: "📌", ...style }]);
    setNewColName(""); setShowAddCol(false);
  }
  function renamePanelTab(t: PanelTab, label: string) { setPanelTabLabels(p => ({ ...p, [t]: label })); }

  const navItems: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: "דשבורד",       icon: LayoutDashboard },
    { id: "board",     label: "לוח סרטונים",  icon: Columns3 },
    { id: "calendar",  label: "לוח שנה",      icon: Calendar },
    { id: "analytics", label: "אנליטיקה",     icon: BarChart3 },
    { id: "sapir",     label: "תצוגת ספיר",   icon: Smartphone },
  ];
  const activeVideo = videos.find(v => v.id === activeId);

  // ── User selector screen ──
  if (!userLoaded) return null; // wait for localStorage to load (prevents hydration mismatch)
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl"
        style={{ background: "linear-gradient(135deg, #0E1525 0%, #0d2744 100%)" }}>
        <div className="text-center">
          <div className="mb-3">
            <img src="/logo.png" alt="logo" className="w-16 h-16 mx-auto rounded-2xl object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1 tracking-wide">Content OS</h1>
          <p className="text-slate-400 text-sm mb-10">מי נכנס עכשיו?</p>
          <div className="flex gap-5 justify-center">
            {[
              { name: "נועם", emoji: "🎬", role: "יוצר תוכן" },
              { name: "ספיר", emoji: "✂️", role: "עורכת" },
            ].map(u => (
              <button key={u.name} onClick={() => selectUser(u.name)}
                className="w-40 py-7 rounded-2xl border border-white/10 flex flex-col items-center gap-3 transition-all hover:scale-105 hover:border-[#42FEEE]/40"
                style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)" }}>
                <span className="text-4xl">{u.emoji}</span>
                <span className="text-white font-bold text-lg">{u.name}</span>
                <span className="text-slate-400 text-xs">{u.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100" dir="rtl">

      {/* ── Glassmorphism Sidebar ── */}
      <div className="w-56 shrink-0 p-3 flex flex-col">
        <aside className="flex-1 flex flex-col relative overflow-hidden rounded-3xl border border-white/10"
          style={{
            background: "linear-gradient(170deg, #0d1e3d 0%, #0E1525 45%, #0a1628 100%)",
            boxShadow: "0 8px 32px rgba(14,21,37,0.4), 0 0 0 1px rgba(66,254,238,0.06), inset 0 1px 0 rgba(255,255,255,0.06)",
            backdropFilter: "blur(20px)",
          }}>

          {/* Decorative glow orbs */}
          <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(66,254,238,0.15) 0%, transparent 70%)" }} />
          <div className="absolute top-1/2 -left-12 w-36 h-36 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(66,254,238,0.07) 0%, transparent 70%)" }} />
          <div className="absolute -bottom-12 right-4 w-40 h-40 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(66,254,238,0.10) 0%, transparent 70%)" }} />

          {/* Logo area */}
          <div className="px-5 pt-6 pb-5 border-b border-white/5 relative z-10 flex flex-col items-center">
            <img src="/logo.png" alt="לוגו" className="h-12 w-auto object-contain" />
            <div className="text-[11px] text-white/35 mt-2 tracking-[0.25em] font-medium">תוכן - Noamas</div>
            <button onClick={() => { localStorage.removeItem("cos-user"); setCurrentUser(""); }}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10">
              <span className="text-sm">{currentUser === "נועם" ? "🎬" : "✂️"}</span>
              <span className="text-xs text-white/70 font-medium">{currentUser}</span>
              <span className="text-[10px] text-white/30 mr-1">החלף</span>
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-0.5 relative z-10">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-light tracking-wide w-full transition-all duration-200 text-white",
                  tab === id ? "font-light shadow-lg" : "text-white/50 hover:text-white/90 hover:bg-white/5"
                )}
                style={tab === id ? {
                  background: "rgba(66,254,238,0.15)",
                  color: "#42FEEE",
                  borderRight: "3px solid #42FEEE",
                  paddingRight: "calc(0.75rem - 3px)",
                  boxShadow: "inset 0 0 20px rgba(66,254,238,0.05), 0 2px 10px rgba(66,254,238,0.1)",
                } : {}}>
                <Icon size={16} />{label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-white/5 relative z-10">
            <div className="text-[10px] text-white/15 text-center tracking-widest">גרסת דמו</div>
          </div>
        </aside>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 bg-slate-100 p-6 overflow-y-auto">
        {tab === "dashboard" && <DashboardView videos={videos} columns={columns} />}
        {tab === "calendar"  && <CalendarView  videos={videos} columns={columns} onReschedule={onReschedule} />}
        {tab === "analytics" && <AnalyticsView />}
        {tab === "sapir"     && <SapirView videos={videos} />}

        {tab === "board" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-lg font-bold text-slate-800">לוח סרטונים</h1>
              <button onClick={() => setShowNew(true)}
                className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg hover:opacity-90 shadow-sm"
                style={{ background: "linear-gradient(135deg, #42FEEE, #38e5d7)", color: "#0E1525", boxShadow: "0 4px 12px rgba(66,254,238,0.3)" }}>
                <Plus size={15} /> סרטון חדש
              </button>
            </div>

            {showNew && (
              <form onSubmit={addVideo} className="bg-white border border-slate-200 rounded-xl p-4 mb-4 flex gap-3 shadow-sm">
                <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  placeholder="נושא הסרטון..."
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#42FEEE]" />
                <button type="submit" className="text-sm font-bold px-4 py-2 rounded-lg" style={{ background: "#42FEEE", color: "#0E1525" }}>צור</button>
                <button type="button" onClick={() => setShowNew(false)} className="text-slate-400 hover:text-slate-600 px-3 text-sm">ביטול</button>
              </form>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
              <div className="flex gap-3 overflow-x-auto pb-4 items-start">
                {columns.map(col => (
                  <KanbanColumn key={col.id} col={col} columns={columns}
                    videos={videos.filter(v => v.status === col.id)}
                    onCardClick={setSelected} onRename={renameColumn} onAddCard={onAddCard}
                  />
                ))}
                <div className="shrink-0 self-start">
                  {showAddCol ? (
                    <form onSubmit={addColumn} className="w-[200px] bg-white rounded-xl border-2 border-dashed border-[#42FEEE]/40 p-3">
                      <input autoFocus value={newColName} onChange={e => setNewColName(e.target.value)}
                        placeholder="שם העמודה..."
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2.5 focus:outline-none focus:ring-2 focus:ring-[#42FEEE]" />
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 text-xs font-bold py-1.5 rounded-lg" style={{ background: "#42FEEE", color: "#0E1525" }}>הוסף</button>
                        <button type="button" onClick={() => setShowAddCol(false)} className="text-slate-400 text-xs px-2">ביטול</button>
                      </div>
                    </form>
                  ) : (
                    <button onClick={() => setShowAddCol(true)}
                      className="h-11 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-[#42FEEE] hover:text-[#42FEEE] flex items-center gap-1.5 text-sm font-semibold transition-all px-4 whitespace-nowrap">
                      <Plus size={16} /> עמודה חדשה
                    </button>
                  )}
                </div>
              </div>

              <DragOverlay>
                {activeVideo && (
                  <div className="rotate-2 opacity-90 pointer-events-none">
                    <KanbanCard video={activeVideo} columns={columns} onClick={() => {}} />
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </div>
        )}
      </main>

      {selected && (
        <VideoPanel video={selected} onClose={() => setSelected(null)} onUpdate={onUpdate} onDelete={onDeleteVideo}
          columns={columns} panelTabLabels={panelTabLabels} onRenameTab={renamePanelTab} currentUser={currentUser}
        />
      )}
    </div>
  );
}
