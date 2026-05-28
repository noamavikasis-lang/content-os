"use client";

import { useState, useEffect } from "react";
import { Video, Copy, Network, ALL_NETWORKS, NETWORK_LABELS } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const NETWORK_EMOJI: Record<Network, string> = {
  instagram: "📸",
  tiktok: "🎵",
  youtube_short: "▶️",
  youtube: "🎥",
  facebook: "👥",
};

interface CopySectionProps {
  video: Video;
}

export default function CopySection({ video }: CopySectionProps) {
  const [activeNetwork, setActiveNetwork] = useState<Network>("instagram");
  const [copies, setCopies] = useState<Record<Network, Copy | null>>({
    instagram: null,
    tiktok: null,
    youtube_short: null,
    youtube: null,
    facebook: null,
  });
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const supabase = createClient();

  useEffect(() => {
    loadCopies();
  }, [video.id]);

  useEffect(() => {
    const copy = copies[activeNetwork];
    setCaption(copy?.caption ?? "");
    setHashtags(copy?.hashtags ?? "");
  }, [activeNetwork, copies]);

  async function loadCopies() {
    const { data } = await supabase.from("copies").select("*").eq("video_id", video.id);
    if (data) {
      const map: Record<Network, Copy | null> = {
        instagram: null,
        tiktok: null,
        youtube_short: null,
        youtube: null,
        facebook: null,
      };
      data.forEach((c: Copy) => { map[c.network] = c; });
      setCopies(map);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: video.title,
          description: video.description,
          network: activeNetwork,
        }),
      });
      const data = await res.json();
      if (data.caption) setCaption(data.caption);
      if (data.hashtags) setHashtags(data.hashtags);
    } catch {
      alert("שגיאה ביצירת קופי");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    const existing = copies[activeNetwork];
    if (existing) {
      await supabase.from("copies").update({
        caption,
        hashtags,
        ai_generated: false,
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      const { data } = await supabase.from("copies").insert({
        video_id: video.id,
        network: activeNetwork,
        caption,
        hashtags,
        ai_generated: false,
      }).select().single();
      if (data) setCopies((prev) => ({ ...prev, [activeNetwork]: data }));
    }
    setSaving(false);
    setSaveMsg("נשמר!");
    setTimeout(() => setSaveMsg(""), 2000);
    await loadCopies();
  }

  const networks = video.networks?.length ? video.networks : ALL_NETWORKS;

  return (
    <div>
      {/* Network Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {networks.map((net) => {
          const hasCopy = !!copies[net]?.caption;
          return (
            <button
              key={net}
              onClick={() => setActiveNetwork(net)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                activeNetwork === net
                  ? "bg-primary-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {NETWORK_EMOJI[net]}
              {NETWORK_LABELS[net]}
              {hasCopy && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
            </button>
          );
        })}
      </div>

      {/* Editor */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-600">Caption</label>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-violet-500 to-primary-500 text-white px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity font-medium"
            >
              {generating ? (
                <><Loader2 size={12} className="animate-spin" /> כותב...</>
              ) : (
                <><Sparkles size={12} /> כתוב עם AI</>
              )}
            </button>
          </div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={5}
            placeholder="כתוב קופי לפוסט..."
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="text-xs text-slate-400 mt-0.5">{caption.length} תווים</div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Hashtags</label>
          <input
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="#hashtag1 #hashtag2"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            שמור
          </button>
          {saveMsg && <span className="text-xs text-green-600 font-medium">{saveMsg}</span>}
        </div>
      </div>
    </div>
  );
}
