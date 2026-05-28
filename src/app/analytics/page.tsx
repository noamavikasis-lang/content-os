"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/client";
import { Video, Analytics, Network, ALL_NETWORKS, NETWORK_LABELS } from "@/types";
import { BarChart3, TrendingUp, Plus, Save, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AnalyticsWithVideo extends Analytics {
  videos?: { title: string };
}

export default function AnalyticsPage() {
  const [publishedVideos, setPublishedVideos] = useState<Video[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsWithVideo[]>([]);
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
    const [videosRes, analyticsRes] = await Promise.all([
      supabase.from("videos").select("*").eq("status", "published").order("publish_date", { ascending: false }),
      supabase.from("analytics").select("*, videos(title)").order("recorded_at", { ascending: false }).limit(50),
    ]);
    setPublishedVideos((videosRes.data ?? []) as Video[]);
    setAnalyticsData((analyticsRes.data ?? []) as AnalyticsWithVideo[]);
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
                      <div className="text-xs text-slate-400 mt-0.5">
                        {NETWORK_LABELS[a.network]} · {formatDate(a.recorded_at)}
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
