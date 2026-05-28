"use client";

import { useState, useEffect } from "react";
import { VideoNote } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { Send } from "lucide-react";

interface NotesSectionProps {
  videoId: string;
}

export default function NotesSection({ videoId }: NotesSectionProps) {
  const [notes, setNotes] = useState<VideoNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [sending, setSending] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadNotes();
  }, [videoId]);

  async function loadNotes() {
    const { data } = await supabase
      .from("video_notes")
      .select("*, profiles(name)")
      .eq("video_id", videoId)
      .order("created_at", { ascending: true });

    if (data) setNotes(data as VideoNote[]);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("video_notes")
      .insert({ video_id: videoId, author_id: user.id, content: newNote.trim() })
      .select("*, profiles(name)")
      .single();

    if (data) setNotes((prev) => [...prev, data as VideoNote]);
    setNewNote("");
    setSending(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Notes list */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">אין הערות עדיין</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-600">
                  {note.profiles?.name ?? "משתמש"}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(note.created_at).toLocaleDateString("he-IL", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{note.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="הוסף הערה..."
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          type="submit"
          disabled={sending || !newNote.trim()}
          className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
