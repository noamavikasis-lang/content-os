"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Video, NETWORK_LABELS, Network } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import {
  RotateCcw,
  Archive as ArchiveIcon,
  Undo2,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react";

interface ArchiveViewProps {
  initialReadyToReset: Video[];
  initialArchived: Video[];
}

function monthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("he-IL", { month: "long", year: "numeric" });
}

const UNDO_WINDOW_MS = 10000;

export default function ArchiveView({ initialReadyToReset, initialArchived }: ArchiveViewProps) {
  const [readyToReset, setReadyToReset] = useState<Video[]>(initialReadyToReset);
  const [archivedVideos, setArchivedVideos] = useState<Video[]>(initialArchived);
  const [showArchive, setShowArchive] = useState(false);
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [resetting, setResetting] = useState(false);
  const [undoBatch, setUndoBatch] = useState<{ ids: string[]; count: number } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supabase = createClient();

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const months = useMemo(() => {
    const map = new Map<string, { label: string; videos: Video[] }>();
    for (const v of archivedVideos) {
      const key = monthKey(v.archived_at ?? v.updated_at);
      const label = monthLabel(v.archived_at ?? v.updated_at);
      if (!map.has(key)) map.set(key, { label, videos: [] });
      map.get(key)!.videos.push(v);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, val]) => ({ key, ...val }));
  }, [archivedVideos]);

  const visibleMonths = monthFilter === "all" ? months : months.filter((m) => m.key === monthFilter);

  async function handleReset() {
    if (readyToReset.length === 0 || resetting) return;
    setResetting(true);

    const ids = readyToReset.map((v) => v.id);
    const now = new Date().toISOString();
    const movedVideos = readyToReset.map((v) => ({ ...v, archived: true, archived_at: now }));

    // עדכון אופטימי במסך
    setArchivedVideos((prev) => [...movedVideos, ...prev]);
    setReadyToReset([]);

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoBatch({ ids, count: ids.length });
    undoTimerRef.current = setTimeout(() => setUndoBatch(null), UNDO_WINDOW_MS);

    await supabase
      .from("videos")
      .update({ archived: true, archived_at: now })
      .in("id", ids);

    setResetting(false);
  }

  async function handleUndoBatch() {
    if (!undoBatch) return;
    const { ids } = undoBatch;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoBatch(null);

    let restored: Video[] = [];
    setArchivedVideos((prev) => {
      restored = prev.filter((v) => ids.includes(v.id)).map((v) => ({ ...v, archived: false, archived_at: null }));
      return prev.filter((v) => !ids.includes(v.id));
    });
    setReadyToReset((prev) => [...restored, ...prev]);

    await supabase
      .from("videos")
      .update({ archived: false, archived_at: null })
      .in("id", ids);
  }

  async function handleRestoreOne(video: Video) {
    setArchivedVideos((prev) => prev.filter((v) => v.id !== video.id));
    await supabase
      .from("videos")
      .update({ archived: false, archived_at: null })
      .eq("id", video.id);
  }

  function networkCounts(videos: Video[]) {
    const counts: Partial<Record<Network, number>> = {};
    for (const v of videos) {
      for (const n of v.networks ?? []) {
        counts[n] = (counts[n] ?? 0) + 1;
      }
    }
    return counts;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">ארכיון</h1>
        <p className="text-slate-500 text-sm mt-1">
          איפוס שבועי של תוכן שעלה, ומעקב אחרי כל מה שפורסם לפי חודשים.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* איפוס שבועי */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <RotateCcw size={18} className="text-primary-500" />
            <h2 className="font-semibold text-slate-800">איפוס שבועי</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            {readyToReset.length > 0
              ? `${readyToReset.length} תכנים שכבר עלו מוכנים לאיפוס מהלוח.`
              : "אין כרגע תכנים שעלו וממתינים לאיפוס."}
          </p>
          <button
            onClick={handleReset}
            disabled={readyToReset.length === 0 || resetting}
            className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <RotateCcw size={16} />
            {resetting ? "מאפס..." : "אפס עכשיו"}
          </button>
          <p className="text-xs text-slate-400 mt-2">
            התכנים לא נמחקים — הם רק עוברים לארכיון ואפשר לראות/להחזיר אותם בכל רגע.
          </p>
        </div>

        {/* צפייה בארכיון */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <ArchiveIcon size={18} className="text-primary-500" />
            <h2 className="font-semibold text-slate-800">צפייה בארכיון</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            {archivedVideos.length > 0
              ? `${archivedVideos.length} תכנים בארכיון, מסודרים לפי חודשים.`
              : "הארכיון ריק כרגע."}
          </p>
          <button
            onClick={() => setShowArchive((v) => !v)}
            disabled={archivedVideos.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            {showArchive ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showArchive ? "הסתר ארכיון" : "היכנס לארכיון"}
          </button>
        </div>
      </div>

      {showArchive && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h3 className="font-semibold text-slate-800">תוכן שעלה, לפי חודש</h3>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">כל החודשים</option>
              {months.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>

          {visibleMonths.length === 0 ? (
            <div className="text-sm text-slate-400 py-6 text-center">אין תוכן להצגה.</div>
          ) : (
            <div className="space-y-6">
              {visibleMonths.map((m) => {
                const counts = networkCounts(m.videos);
                return (
                  <div key={m.key}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="font-medium text-sm text-slate-700">{m.label}</span>
                        <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 font-medium">
                          {m.videos.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(counts).map(([net, count]) => (
                          <span
                            key={net}
                            className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700"
                          >
                            {NETWORK_LABELS[net as Network]} · {count}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {m.videos.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between gap-3 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-slate-800 truncate">{v.title}</div>
                            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                              {v.publish_date && <span>עלה: {formatDate(v.publish_date)}</span>}
                              {v.archived_at && <span>· אורכב: {formatDate(v.archived_at)}</span>}
                              {v.networks?.map((n) => (
                                <span key={n} className="bg-white border border-slate-200 rounded px-1.5 py-0.5">
                                  {NETWORK_LABELS[n]}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRestoreOne(v)}
                            title="החזר ללוח"
                            className="shrink-0 flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-2 py-1 rounded-md transition-colors"
                          >
                            <Undo2 size={13} />
                            החזר ללוח
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Undo toast */}
      {undoBatch && (
        <div className="fixed bottom-6 inset-x-0 flex justify-center z-50 px-4">
          <div className="bg-slate-900 text-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-4">
            <span className="text-sm">
              {undoBatch.count} תכנים הועברו לארכיון
            </span>
            <button
              onClick={handleUndoBatch}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Undo2 size={14} />
              בטל
            </button>
            <button
              onClick={() => {
                if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
                setUndoBatch(null);
              }}
              className="text-white/50 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
