"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  TrendingUp, Users, Eye, Bookmark, Share2, MessageCircle,
  Sparkles, Loader2, ArrowUpRight, ArrowDownRight, Lightbulb, ExternalLink,
} from "lucide-react";

const ACCENT = "#42FEEE";
const INK = "#0E1525";

type Label = "viral" | "broad" | "niche" | "carousel" | null;

const LABEL_TEXT: Record<string, string> = {
  viral: "ויראלי",
  broad: "רחב",
  niche: "נישתי",
  carousel: "קרוסלה",
  untagged: "ללא תיוג",
};

interface VideoRow {
  id: string;
  title: string;
  label: Label;
  publish_date: string | null;
  instagram_permalink: string | null;
  instagram_thumbnail_url: string | null;
}

interface AnalyticsRow {
  video_id: string;
  views: number;
  saves: number;
  shares: number;
  comments: number;
  period_start: string | null;
}

interface AccountRow {
  period_start: string;
  followers: number;
  followers_gained: number | null;
  followers_lost: number | null;
  reach: number;
  views: number;
  interactions: number;
}

/** A video joined to its most recent performance snapshot. */
interface Perf extends VideoRow {
  views: number;
  saves: number;
  shares: number;
  comments: number;
  /** Saves and shares per 1,000 views — the reach-independent quality signals. */
  savesPer1k: number;
  sharesPer1k: number;
}

interface LabelStat {
  label: string;
  count: number;
  avgViews: number;
  savesPer1k: number;
  sharesPer1k: number;
}

interface Idea {
  title: string;
  hook: string;
  based_on: string;
  goal: "views" | "saves" | "shares";
}

interface IdeasResponse {
  verdict: { keep_doing: string; stop_doing: string; why: string };
  ideas: Idea[];
}

const fmt = (n: number) => Math.round(n).toLocaleString("he-IL");

function pct(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[11px] text-white/40">אין השוואה</span>;
  const up = value > 0;
  return (
    <span className={`text-[11px] font-bold inline-flex items-center gap-0.5 ${up ? "text-[#42FEEE]" : "text-red-300"}`}>
      {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

/** One ranked list — the same shape reused for views / saves / shares. */
function Leaderboard({
  title, icon, posts, metric, hint,
}: {
  title: string;
  icon: React.ReactNode;
  posts: Perf[];
  metric: (p: Perf) => number;
  hint: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
      </div>
      <p className="text-[11px] text-slate-400 mb-3">{hint}</p>
      <div className="space-y-2.5">
        {posts.map((p, i) => (
          <div key={p.id} className="flex items-start gap-2.5">
            <span className="text-xs font-bold text-slate-300 w-4 shrink-0 pt-0.5">{i + 1}</span>
            {p.instagram_thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.instagram_thumbnail_url} alt=""
                className="w-11 h-11 rounded-lg object-cover shrink-0 bg-slate-100" />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-slate-100 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-slate-800 leading-snug line-clamp-2">
                {p.title}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                {p.label && (
                  <span className="bg-slate-100 px-1.5 py-px rounded text-[10px]">
                    {LABEL_TEXT[p.label] ?? p.label}
                  </span>
                )}
                {p.instagram_permalink && (
                  <a href={p.instagram_permalink} target="_blank" rel="noreferrer"
                    className="hover:text-slate-600 inline-flex items-center gap-0.5">
                    <ExternalLink size={9} /> לפוסט
                  </a>
                )}
              </div>
            </div>
            <span className="text-sm font-bold shrink-0" style={{ color: INK }}>
              {fmt(metric(p))}
            </span>
          </div>
        ))}
        {!posts.length && <div className="text-xs text-slate-400">אין נתונים בתקופה הזו</div>}
      </div>
    </div>
  );
}

export default function ContentDashboard() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([]);
  const [account, setAccount] = useState<AccountRow[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [ideas, setIdeas] = useState<IdeasResponse | null>(null);
  const [thinking, setThinking] = useState(false);
  const [ideasError, setIdeasError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const [v, a, s] = await Promise.all([
        supabase.from("videos").select("id,title,label,publish_date,instagram_permalink,instagram_thumbnail_url").eq("status", "published"),
        supabase.from("analytics").select("video_id,views,saves,shares,comments,period_start").eq("source", "instagram"),
        supabase.from("account_stats").select("*").order("period_start", { ascending: false }).limit(2),
      ]);
      setVideos((v.data ?? []) as VideoRow[]);
      setAnalytics((a.data ?? []) as AnalyticsRow[]);
      setAccount((s.data ?? []) as AccountRow[]);
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Join each video to its newest snapshot, then scope to the selected window. */
  const perf = useMemo<Perf[]>(() => {
    const newest = new Map<string, AnalyticsRow>();
    for (const row of analytics) {
      const prev = newest.get(row.video_id);
      if (!prev || (row.period_start ?? "") > (prev.period_start ?? "")) newest.set(row.video_id, row);
    }
    const cutoff = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
    return videos
      .filter((v) => v.publish_date && v.publish_date >= cutoff && newest.has(v.id))
      .map((v) => {
        const m = newest.get(v.id)!;
        return {
          ...v,
          views: m.views,
          saves: m.saves,
          shares: m.shares,
          comments: m.comments,
          savesPer1k: m.views ? (m.saves / m.views) * 1000 : 0,
          sharesPer1k: m.views ? (m.shares / m.views) * 1000 : 0,
        };
      });
  }, [videos, analytics, days]);

  const labelStats = useMemo<LabelStat[]>(() => {
    const groups = new Map<string, Perf[]>();
    for (const p of perf) {
      const key = p.label ?? "untagged";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    return [...groups.entries()]
      .map(([label, items]) => {
        const views = items.reduce((s, p) => s + p.views, 0);
        return {
          label,
          count: items.length,
          avgViews: views / items.length,
          // Aggregate rates, not averages of rates — one viral post shouldn't be
          // outweighed by a post with 12 views and a freak save.
          savesPer1k: views ? (items.reduce((s, p) => s + p.saves, 0) / views) * 1000 : 0,
          sharesPer1k: views ? (items.reduce((s, p) => s + p.shares, 0) / views) * 1000 : 0,
        };
      })
      .sort((a, b) => b.avgViews - a.avgViews);
  }, [perf]);

  const totals = useMemo(() => ({
    views: perf.reduce((s, p) => s + p.views, 0),
    saves: perf.reduce((s, p) => s + p.saves, 0),
    shares: perf.reduce((s, p) => s + p.shares, 0),
    comments: perf.reduce((s, p) => s + p.comments, 0),
  }), [perf]);

  const [latest, previous] = account;
  const byViews = [...perf].sort((a, b) => b.views - a.views).slice(0, 5);
  const bySaves = [...perf].filter((p) => p.saves > 0).sort((a, b) => b.savesPer1k - a.savesPer1k).slice(0, 5);
  const byShares = [...perf].filter((p) => p.shares > 0).sort((a, b) => b.sharesPer1k - a.sharesPer1k).slice(0, 5);

  const bestForSaves = labelStats.length ? [...labelStats].sort((a, b) => b.savesPer1k - a.savesPer1k)[0] : null;
  const bestForReach = labelStats.length ? labelStats[0] : null;

  async function generateIdeas() {
    setThinking(true);
    setIdeasError(null);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days,
          labelStats,
          topPosts: byViews.map((p) => ({
            title: p.title, label: p.label, views: p.views,
            saves: p.saves, shares: p.shares, comments: p.comments,
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "נכשל");
      setIdeas(await res.json());
    } catch (e) {
      setIdeasError(e instanceof Error ? e.message : "משהו נשבר");
    } finally {
      setThinking(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Account hero */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${INK} 0%, #1a2744 50%, ${INK} 100%)` }}>
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `radial-gradient(circle at 20% 50%, ${ACCENT}33 0%, transparent 60%), radial-gradient(circle at 80% 20%, ${ACCENT}22 0%, transparent 50%)` }} />
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-5">
            <h1 className="font-bold text-xl text-white flex items-center gap-2">
              <TrendingUp size={22} style={{ color: ACCENT }} /> דשבורד תוכן
            </h1>
            <div className="flex gap-1 bg-white/10 rounded-lg p-1">
              {[7, 30, 90].map((d) => (
                <button key={d} onClick={() => { setDays(d); setIdeas(null); }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-md transition-colors ${
                    days === d ? "text-[#0E1525]" : "text-white/60 hover:text-white"
                  }`}
                  style={days === d ? { background: ACCENT } : undefined}>
                  {d} ימים
                </button>
              ))}
            </div>
          </div>

          {latest ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-1.5 text-[11px] text-white/50 mb-1.5"><Users size={12} /> עוקבים</div>
                <div className="text-2xl font-bold text-white">{fmt(latest.followers)}</div>
                <div className="text-[11px] mt-1">
                  {latest.followers_gained !== null && latest.followers_lost !== null ? (
                    <>
                      <span style={{ color: ACCENT }} className="font-bold">+{latest.followers_gained}</span>
                      <span className="text-white/30"> · </span>
                      <span className="text-red-300 font-bold">−{latest.followers_lost}</span>
                    </>
                  ) : <span className="text-white/40">אין פירוט</span>}
                </div>
              </div>
              {[
                { label: "צפיות", value: latest.views, prev: previous?.views, icon: <Eye size={12} /> },
                { label: "חשיפה", value: latest.reach, prev: previous?.reach, icon: <TrendingUp size={12} /> },
                { label: "אינטראקציות", value: latest.interactions, prev: previous?.interactions, icon: <MessageCircle size={12} /> },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-1.5 text-[11px] text-white/50 mb-1.5">{s.icon} {s.label}</div>
                  <div className="text-2xl font-bold text-white">{fmt(s.value)}</div>
                  <div className="mt-1"><Delta value={pct(s.value, s.prev)} /></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-white/50 text-sm">אין עדיין נתוני חשבון — הסנכרון השבועי ימלא אותם.</div>
          )}
        </div>
      </div>

      {/* Totals for the selected window */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "צפיות", value: totals.views, icon: <Eye size={14} className="text-slate-400" /> },
          { label: "שמירות", value: totals.saves, icon: <Bookmark size={14} className="text-slate-400" /> },
          { label: "שיתופים", value: totals.shares, icon: <Share2 size={14} className="text-slate-400" /> },
          { label: "תגובות", value: totals.comments, icon: <MessageCircle size={14} className="text-slate-400" /> },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">{s.icon} {s.label}</div>
            <div className="text-xl font-bold text-slate-800">{fmt(s.value)}</div>
          </div>
        ))}
      </div>

      {/* What worked — three different definitions of "worked" */}
      <div className="grid md:grid-cols-3 gap-3">
        <Leaderboard title="הכי הרבה צפיות" hint="הוק חזק — הצליח לעצור אנשים"
          icon={<Eye size={15} className="text-slate-500" />}
          posts={byViews} metric={(p) => p.views} />
        <Leaderboard title="הכי נשמר" hint="תוכן ערך — שמירות ל-1000 צפיות"
          icon={<Bookmark size={15} className="text-slate-500" />}
          posts={bySaves} metric={(p) => p.savesPer1k} />
        <Leaderboard title="הכי שותף" hint="תוכן זהות — שיתופים ל-1000 צפיות"
          icon={<Share2 size={15} className="text-slate-500" />}
          posts={byShares} metric={(p) => p.sharesPer1k} />
      </div>

      {/* Content type comparison */}
      {labelStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-1">איזה סוג תוכן עובד לך</h2>
          <p className="text-xs text-slate-400 mb-4">
            שמירות ושיתופים מחושבים ל-1000 צפיות, כדי שסרטון ויראלי אחד לא יעוות את התמונה
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-slate-400 font-medium">
                <th className="text-right pb-2">סוג</th>
                <th className="pb-2">כמות</th>
                <th className="pb-2">צפיות בממוצע</th>
                <th className="pb-2">שמירות/1000</th>
                <th className="pb-2">שיתופים/1000</th>
              </tr>
            </thead>
            <tbody>
              {labelStats.map((l) => (
                <tr key={l.label} className="border-t border-slate-50">
                  <td className="py-2.5 font-medium text-slate-800">{LABEL_TEXT[l.label] ?? l.label}</td>
                  <td className="py-2.5 text-center text-slate-400">{l.count}</td>
                  <td className="py-2.5 text-center font-bold text-slate-800">{fmt(l.avgViews)}</td>
                  <td className="py-2.5 text-center" style={{ color: l.label === bestForSaves?.label ? INK : "#94a3b8", fontWeight: l.label === bestForSaves?.label ? 700 : 400 }}>
                    {l.savesPer1k.toFixed(1)}
                  </td>
                  <td className="py-2.5 text-center text-slate-500">{l.sharesPer1k.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {bestForReach && bestForSaves && (
            <div className="mt-4 pt-4 border-t border-slate-50 text-[13px] text-slate-600 leading-relaxed">
              <strong>{LABEL_TEXT[bestForReach.label] ?? bestForReach.label}</strong> מביא לך הכי הרבה עיניים
              ({fmt(bestForReach.avgViews)} צפיות בממוצע), אבל <strong>{LABEL_TEXT[bestForSaves.label] ?? bestForSaves.label}</strong> הוא
              מה שאנשים באמת שומרים ({bestForSaves.savesPer1k.toFixed(1)} שמירות ל-1000 צפיות
              {bestForReach.label !== bestForSaves.label && ` מול ${bestForReach.savesPer1k.toFixed(1)}`}).
              {bestForReach.label !== bestForSaves.label
                ? " כלומר האחד מרחיב את הקהל והשני בונה ערך — צריך את שניהם, לא לבחור."
                : " אותו סוג תוכן עושה את שתי העבודות."}
            </div>
          )}
        </div>
      )}

      {/* AI: verdict + ideas */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Lightbulb size={17} className="text-amber-500" /> מה להמשיך, מה להפסיק, ומה לצלם
          </h2>
          <button onClick={generateIdeas} disabled={thinking || perf.length < 3}
            className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg disabled:opacity-40 transition-opacity"
            style={{ background: ACCENT, color: INK }}>
            {thinking ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {ideas ? "רענן" : "נתח"}
          </button>
        </div>

        {perf.length < 3 && (
          <p className="text-xs text-slate-400">צריך לפחות 3 סרטונים עם נתונים בתקופה הזו.</p>
        )}
        {ideasError && <p className="text-xs text-red-500">{ideasError}</p>}
        {!ideas && !thinking && perf.length >= 3 && (
          <p className="text-xs text-slate-400">
            לחץ &quot;נתח&quot; כדי לקבל קריאה על הנתונים ו-5 רעיונות לסרטונים שמבוססים על מה שכבר עבד.
          </p>
        )}

        {ideas && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="rounded-xl p-3.5 bg-emerald-50 border border-emerald-100">
                <div className="text-[11px] font-bold text-emerald-700 mb-1">להמשיך</div>
                <div className="text-[13px] text-slate-700 leading-relaxed">{ideas.verdict.keep_doing}</div>
              </div>
              <div className="rounded-xl p-3.5 bg-red-50 border border-red-100">
                <div className="text-[11px] font-bold text-red-700 mb-1">להפסיק</div>
                <div className="text-[13px] text-slate-700 leading-relaxed">{ideas.verdict.stop_doing}</div>
              </div>
            </div>
            <p className="text-[13px] text-slate-500 leading-relaxed">{ideas.verdict.why}</p>

            <div className="space-y-2.5 pt-1">
              {ideas.ideas.map((idea, i) => (
                <div key={i} className="border border-slate-100 rounded-xl p-3.5">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="font-bold text-slate-800 text-sm">{idea.title}</div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0 bg-slate-100 text-slate-500">
                      {idea.goal === "views" ? "צפיות" : idea.goal === "saves" ? "שמירות" : "שיתופים"}
                    </span>
                  </div>
                  <div className="text-[13px] text-slate-700 mb-1.5">
                    <span className="text-slate-400">הוק: </span>&ldquo;{idea.hook}&rdquo;
                  </div>
                  <div className="text-[11px] text-slate-400">{idea.based_on}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
