"use client";

import { useState } from "react";
import {
  Video, VideoStatus, Network,
  ALL_STATUSES, ALL_NETWORKS,
  STATUS_LABELS, STATUS_EMOJI,
  NETWORK_LABELS,
} from "@/types";
import { createClient } from "@/lib/supabase/client";
import CopySection from "./CopySection";
import ChecklistSection from "./ChecklistSection";
import NotesSection from "./NotesSection";
import { X, Trash2, ExternalLink, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "info" | "copy" | "checklist" | "notes";

interface VideoPanelProps {
  video: Video;
  onClose: () => void;
  onUpdate: (v: Video) => void;
  onDelete: (id: string) => void;
}

export default function VideoPanel({ video, onClose, onUpdate, onDelete }: VideoPanelProps) {
  const [tab, setTab] = useState<Tab>("info");
  const [form, setForm] = useState({
    title: video.title,
    description: video.description ?? "",
    shoot_date: video.shoot_date ?? "",
    publish_date: video.publish_date ?? "",
    publish_time: video.publish_time ?? "",
    status: video.status,
    networks: video.networks ?? [],
    drive_link: video.drive_link ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const supabase = createClient();

  function toggleNetwork(net: Network) {
    setForm((prev) => ({
      ...prev,
      networks: prev.networks.includes(net)
        ? prev.networks.filter((n) => n !== net)
        : [...prev.networks, net],
    }));
  }

  async function handleSave() {
    setSaving(true);
    const { data } = await supabase
      .from("videos")
      .update({ ...form, updated_at: new Date().toISOString() })
      .eq("id", video.id)
      .select()
      .single();

    if (data) {
      onUpdate(data as Video);
      setSaveMsg("נשמר!");
      setTimeout(() => setSaveMsg(""), 2000);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("למחוק את הסרטון הזה?")) return;
    setDeleting(true);
    await supabase.from("videos").delete().eq("id", video.id);
    onDelete(video.id);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "info", label: "פרטים" },
    { id: "copy", label: "קופי" },
    { id: "checklist", label: "צ'קליסט" },
    { id: "notes", label: "הערות" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed left-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">{STATUS_EMOJI[form.status]}</span>
            <span className="text-sm font-medium text-slate-500">{STATUS_LABELS[form.status]}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 pb-0 border-b border-slate-100">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2",
                tab === t.id
                  ? "text-primary-600 border-primary-500 bg-primary-50"
                  : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === "info" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">כותרת</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">תיאור</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  placeholder="על מה הסרטון..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">סטטוס</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as VideoStatus }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_EMOJI[s]} {STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">תאריך צילום</label>
                  <input
                    type="date"
                    value={form.shoot_date}
                    onChange={(e) => setForm((p) => ({ ...p, shoot_date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">תאריך פרסום</label>
                  <input
                    type="date"
                    value={form.publish_date}
                    onChange={(e) => setForm((p) => ({ ...p, publish_date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">שעת פרסום</label>
                <input
                  type="time"
                  value={form.publish_time}
                  onChange={(e) => setForm((p) => ({ ...p, publish_time: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">רשתות</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_NETWORKS.map((net) => (
                    <button
                      key={net}
                      type="button"
                      onClick={() => toggleNetwork(net)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                        form.networks.includes(net)
                          ? "bg-primary-500 text-white border-primary-500"
                          : "bg-white text-slate-600 border-slate-200 hover:border-primary-300"
                      )}
                    >
                      {NETWORK_LABELS[net]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  קישור Google Drive
                </label>
                <div className="flex gap-2">
                  <input
                    value={form.drive_link}
                    onChange={(e) => setForm((p) => ({ ...p, drive_link: e.target.value }))}
                    placeholder="https://drive.google.com/..."
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {form.drive_link && (
                    <a
                      href={form.drive_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-500 hover:text-primary-600 p-2 border border-slate-200 rounded-lg"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  שמור שינויים
                </button>
                {saveMsg && <span className="text-xs text-green-600 font-medium">{saveMsg}</span>}
              </div>
            </div>
          )}

          {tab === "copy" && <CopySection video={video} />}
          {tab === "checklist" && <ChecklistSection video={video} />}
          {tab === "notes" && <NotesSection videoId={video.id} />}
        </div>
      </div>
    </>
  );
}
