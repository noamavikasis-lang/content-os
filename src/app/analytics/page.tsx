"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/client";
import { Video, Analytics, AccountStats, LinkCandidate, Network, ALL_NETWORKS, NETWORK_LABELS } from "@/types";
import { BarChart3, TrendingUp, Plus, Save, Loader2, Users, Eye, Link2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AnalyticsWithVideo extends Analytics {
  videos?: { title: string };
}

interface CandidateWithVideo extends LinkCandidate {
  videos?: { title: string; publish_date: string | null };
}

/** Signed percentage change, or null when there is no baseline to compare against. */
function pctChange(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function Delta({ value, suffix = "%" }: { value: number | null; suffix?: string }) {
  if (value === null) return <span className="text-xs text-slate-400">אין השוואה</span>;
  const up = value > 0;
  const flat = Math.abs(value) < 0.05;
  return (
    <span className={`text-xs font-semibold inline-flex items-center gap-0.5 ${flat ? "text-slate-400" : up ? "text-green-600" : "text-red-500"}`}>
      {!flat && (up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />)}
      {Math.abs(value) >= 100 ? Math.round(Math.abs(value)) : Math.abs(value).toFixed(1)}
      {suffix}
    </span>
  );
}

export default function AnalyticsPage() {
  const [publishedVideos, setPublishedVideos] = useState<Video[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsWithVideo[]>([]);
  const [accountStats, setAccountStats] = useState<AccountStats[]>([]);
  const [candidates, setCandidates] = useState<CandidateWithVideo[]>([]);
  const [linking, setLinking] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    video_id: "",
    network: "instagram" as Network,
    views: "",
    saves: "",
    shares: "",
    comments: "",
    new_followers: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [videosRes, analyticsRes, accountRes, candidatesRes] = await Promise.all([
      supabase.from("videos").select("*").eq("status", "published").order("publish_date", { ascending: false }),
      supabase.from("analytics").select("*, videos(title)").order("recorded_at", { ascending: false }).limit(50),
      supabase.from("account_stats").select("*").order("period_start", { ascending: false }).limit(2),
      supabase
        .from("instagram_link_candidates")
        .select("*, videos(title, publish_date)")
        .order("media_timestamp", { ascending: false }),
    ]);
    setPublishedVideos((videosRes.data ?? []) as Video[]);
    setAnalyticsData((analyticsRes.data ?? []) as AnalyticsWithVideo[]);
    setAccountStats((accountRes.data ?? []) as AccountStats[]);
    setCandidates((candidatesRes.data ?? []) as CandidateWithVideo[]);
  }

  /** Attaches a post to a video, then drops every candidate offered for that video. */
  async function handleLink(candidate: CandidateWithVideo) {
    setLinking(candidate.id);
    await supabase
      .from("videos")
      .update({ instagram_media_id: candidate.media_id, instagram_permalink: candidate.permalink })
      .eq("id", candidate.video_id);
    await supabase.from("instagram_link_candidates").delete().eq("video_id", candidate.video_id);
    await loadData();
    setLinking(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.video_id) return;
    setSaving(true);

    await supabase.from("analytics").insert({
      video_id: form.video_id,
      network: form.network,
      views: parseInt(form.views) || 0,
      saves: parseInt(form.saves) || 0,
      shares: parseInt(form.shares) || 0,
      comments: parseInt(form.comments) || 0,
      new_followers: parseInt(form.new_followers) || 0,
      notes: form.notes || null,
    });

    await loadData();
    setShowForm(false);
    setForm({ video_id: "", network: "instagram", views: "", saves: "", shares: "", comments: "", new_followers: "", notes: "" });
    setSaving(false);
  }

  // Aggregate stats
  const totalViews = analyticsData.reduce((s, a) => s + (a.views || 0), 0);
  const totalSaves = analyticsData.reduce((s, a) => s + (a.saves || 0), 0);
  const totalShares = analyticsData.reduce((s, a) => s + (a.shares || 0), 0);

  // Best performing
  const byVideo: Record<string, { title: string; views: number; saves: number }> = {};
  analyticsData.forEach((a) => {
    if (!byVideo[a.video_id]) {
      byVideo[a.video_id] = { title: a.videos?.title ?? "—", views: 0, saves: 0 };
    }
    byVideo[a.video_id].views += a.views || 0;
    byVideo[a.video_id].saves += a.saves || 0;
  });
  const topVideos = Object.entries(byVideo)
    .sort(([, a], [, b]) => b.views - a.views)
    .slice(0, 5);

  const [latest, previous] = accountStats;

  // Candidates arrive flat; the UI shows one block per video with its options side by side.
  const candidatesByVideo = candidates.reduce<Record<string, CandidateWithVideo[]>>((acc, c) => {
    (acc[c.video_id] ||= []).push(c);
    return acc;
  }, {});

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 size={22} className="text-primary-500" />
              אנליטיקה
            </h1>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} />
              הזנת נתונים
            </button>
          </div>

          {/* Account-level figures, synced weekly from Instagram */}
          {latest && (
            <div className="mb-8">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-semibold text-slate-700 text-sm">נתוני החשבון</h2>
                <span className="text-xs text-slate-400">
                  שבוע {formatDate(latest.period_start)} · מתעדכן אוטומטית מאינסטגרם
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                    <Users size={13} /> עוקבים
                  </div>
                  <div className="text-2xl font-bold text-slate-800">{latest.followers.toLocaleString()}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {latest.followers_gained !== null && latest.followers_lost !== null ? (
                      <>
                        <span className="text-green-600 font-semibold">+{latest.followers_gained}</span>
                        {" · "}
                        <span className="text-red-500 font-semibold">−{latest.followers_lost}</span>
                      </>
                    ) : (
                      "אין פירוט"
                    )}
                  </div>
                </div>
                {[
                  { label: "צפיות", value: latest.views, prev: previous?.views, icon: <Eye size={13} /> },
                  { label: "חשיפה", value: latest.reach, prev: previous?.reach, icon: <TrendingUp size={13} /> },
                  { label: "אינטראקציות", value: latest.interactions, prev: previous?.interactions, icon: <BarChart3 size={13} /> },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                      {s.icon} {s.label}
                    </div>
                    <div className="text-2xl font-bold text-slate-800">{s.value.toLocaleString()}</div>
                    <div className="mt-1">
                      <Delta value={pctChange(s.value, s.prev)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts the sync could not attach with certainty */}
          {Object.keys(candidatesByVideo).length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8">
              <h2 className="font-semibold text-amber-900 mb-1 flex items-center gap-2">
                <Link2 size={18} />
                ממתין לקישור
              </h2>
              <p className="text-xs text-amber-700 mb-4">
                באותו תאריך עלה יותר מפוסט אחד, אז הסנכרון לא ניחש. בחר את הפוסט הנכון.
              </p>
              <div className="space-y-4">
                {Object.entries(candidatesByVideo).map(([videoId, options]) => (
                  <div key={videoId} className="bg-white rounded-lg border border-amber-100 p-3">
                    <div className="text-sm font-medium text-slate-800 mb-2">
                      {options[0].videos?.title ?? "—"}
                      {options[0].videos?.publish_date && (
                        <span className="text-xs text-slate-400 font-normal mr-2">
                          {formatDate(options[0].videos.publish_date)}
                        </span>
                      )}
                    </div>
                    <div className="grid gap-2">
                      {options.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleLink(c)}
                          disabled={linking !== null}
                          className="flex items-center gap-3 text-right p-2 rounded-lg border border-slate-200 hover:border-primary-500 hover:bg-primary-50 disabled:opacity-50 transition-colors"
                        >
                          {c.thumbnail_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.thumbnail_url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                          )}
                          <span className="flex-1 text-xs text-slate-700 line-clamp-2">
                            {c.caption?.replace(/\s+/g, " ").slice(0, 80) || "ללא כיתוב"}
                          </span>
                          {linking === c.id ? (
                            <Loader2 size={14} className="animate-spin text-primary-500 shrink-0" />
                          ) : (
                            <span className="text-xs text-primary-600 font-medium shrink-0">זה הפוסט</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "סה\"כ צפיות", value: totalViews.toLocaleString(), emoji: "👁️" },
              { label: "סה\"כ שמירות", value: totalSaves.toLocaleString(), emoji: "🔖" },
              { label: "סה\"כ שיתופים", value: totalShares.toLocaleString(), emoji: "🔗" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4">
                <div className="text-2xl mb-2">{s.emoji}</div>
                <div className="text-2xl font-bold text-slate-800">{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Top performing */}
          {topVideos.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 p-5 mb-6">
              <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-green-500" />
                תכנים מוצלחים
              </h2>
              <div className="space-y-3">
                {topVideos.map(([id, data], i) => (
                  <div key={id} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-400 w-5">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-800">{data.title}</div>
                      <div className="text-xs text-slate-400">
                        {data.views.toLocaleString()} צפיות · {data.saves.toLocaleString()} שמירות
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form */}
          {showForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-sm">
              <h3 className="font-semibold text-slate-700 mb-4">הזנת נתוני ביצועים</h3>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">סרטון</label>
                    <select
                      value={form.video_id}
                      onChange={(e) => setForm((p) => ({ ...p, video_id: e.target.value }))}
                      required
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">בחר סרטון...</option>
                      {publishedVideos.map((v) => (
                        <option key={v.id} value={v.id}>{v.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">רשת</label>
                    <select
                      value={form.network}
                      onChange={(e) => setForm((p) => ({ ...p, network: e.target.value as Network }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {ALL_NETWORKS.map((n) => (
                        <option key={n} value={n}>{NETWORK_LABELS[n]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: "views", label: "צפיות" },
                    { key: "saves", label: "שמירות" },
                    { key: "shares", label: "שיתופים" },
                    { key: "comments", label: "תגובות" },
                    { key: "new_followers", label: "עוקבים חדשים" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
                      <input
                        type="number"
                        min="0"
                        value={form[key as keyof typeof form]}
                        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">הערות</label>
                  <input
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Hook שעבד, נושא מוצלח..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    שמור
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="text-slate-500 hover:text-slate-700 text-sm px-4 py-2.5"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* History */}
          {analyticsData.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100">
              <div className="p-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-700">היסטוריית נתונים</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {analyticsData.map((a) => (
                  <div key={a.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{a.videos?.title ?? "—"}</div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                        {NETWORK_LABELS[a.network]} · {formatDate(a.recorded_at)}
                        {a.source === "instagram" && (
                          <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-medium">
                            אוטומטי
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs text-slate-500">
                      <span>👁️ {(a.views || 0).toLocaleString()}</span>
                      <span>🔖 {(a.saves || 0).toLocaleString()}</span>
                      <span>🔗 {(a.shares || 0).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analyticsData.length === 0 && !showForm && (
            <div className="text-center py-12 text-slate-400">
              <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">עדיין אין נתוני ביצועים</p>
              <p className="text-xs mt-1">לחץ "הזנת נתונים" אחרי שסרטון עולה</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
