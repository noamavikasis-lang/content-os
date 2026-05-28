"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Video, VideoStatus, ALL_STATUSES, STATUS_LABELS, STATUS_EMOJI, STATUS_BG } from "@/types";
import { createClient } from "@/lib/supabase/client";
import VideoCard from "./VideoCard";
import VideoPanel from "./VideoPanel";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

function DroppableColumn({
  status,
  videos,
  onCardClick,
}: {
  status: VideoStatus;
  videos: Video[];
  onCardClick: (v: Video) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 min-w-[220px] max-w-[280px] rounded-xl border-2 transition-colors",
        STATUS_BG[status],
        isOver && "border-primary-400 ring-2 ring-primary-200"
      )}
    >
      <div className="p-3 border-b border-black/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">{STATUS_EMOJI[status]}</span>
            <span className="font-semibold text-sm text-slate-700">{STATUS_LABELS[status]}</span>
          </div>
          <span className="text-xs bg-white/70 text-slate-500 rounded-full px-2 py-0.5 font-medium">
            {videos.length}
          </span>
        </div>
      </div>

      <div className="p-2 space-y-2 kanban-column min-h-[120px]">
        <SortableContext items={videos.map((v) => v.id)} strategy={verticalListSortingStrategy}>
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} onClick={() => onCardClick(video)} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  initialVideos: Video[];
}

export default function KanbanBoard({ initialVideos }: KanbanBoardProps) {
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStatus, setNewStatus] = useState<VideoStatus>("planned");
  const [creating, setCreating] = useState(false);

  const supabase = createClient();

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("videos-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "videos" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setVideos((prev) => [payload.new as Video, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setVideos((prev) =>
            prev.map((v) => (v.id === payload.new.id ? (payload.new as Video) : v))
          );
          setSelectedVideo((prev) =>
            prev?.id === payload.new.id ? (payload.new as Video) : prev
          );
        } else if (payload.eventType === "DELETE") {
          setVideos((prev) => prev.filter((v) => v.id !== payload.old.id));
          setSelectedVideo((prev) => (prev?.id === payload.old.id ? null : prev));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function getColumnVideos(status: VideoStatus) {
    return videos.filter((v) => v.status === status);
  }

  function handleDragStart(event: DragStartEvent) {
    const video = videos.find((v) => v.id === event.active.id);
    setActiveVideo(video ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveVideo(null);
    const { active, over } = event;
    if (!over) return;

    const draggedVideo = videos.find((v) => v.id === active.id);
    if (!draggedVideo) return;

    const overStatus = ALL_STATUSES.includes(over.id as VideoStatus)
      ? (over.id as VideoStatus)
      : videos.find((v) => v.id === over.id)?.status;

    if (!overStatus || overStatus === draggedVideo.status) return;

    setVideos((prev) =>
      prev.map((v) => (v.id === draggedVideo.id ? { ...v, status: overStatus } : v))
    );

    await supabase
      .from("videos")
      .update({ status: overStatus, updated_at: new Date().toISOString() })
      .eq("id", draggedVideo.id);
  }

  async function handleCreateVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { data } = await supabase
      .from("videos")
      .insert({
        title: newTitle.trim(),
        status: newStatus,
        networks: [],
        created_by: user?.id,
      })
      .select()
      .single();

    if (data) {
      setSelectedVideo(data);
    }

    setNewTitle("");
    setShowNewForm(false);
    setCreating(false);
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-800">לוח סרטונים</h1>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          סרטון חדש
        </button>
      </div>

      {/* New video form */}
      {showNewForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm">
          <form onSubmit={handleCreateVideo} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">כותרת הסרטון</label>
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="נושא הסרטון..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">סטטוס</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as VideoStatus)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_EMOJI[s]} {STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={creating || !newTitle.trim()}
              className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {creating ? "..." : "צור"}
            </button>
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="text-slate-400 hover:text-slate-600 text-sm px-3 py-2"
            >
              ביטול
            </button>
          </form>
        </div>
      )}

      {/* Kanban */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
          {ALL_STATUSES.map((status) => (
            <DroppableColumn
              key={status}
              status={status}
              videos={getColumnVideos(status)}
              onCardClick={(v) => setSelectedVideo(v)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeVideo && (
            <div className="opacity-90 rotate-2">
              <VideoCard video={activeVideo} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Video Panel */}
      {selectedVideo && (
        <VideoPanel
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
          onUpdate={(updated) => {
            setVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
            setSelectedVideo(updated);
          }}
          onDelete={(id) => {
            setVideos((prev) => prev.filter((v) => v.id !== id));
            setSelectedVideo(null);
          }}
        />
      )}
    </div>
  );
}
