"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Video, STATUS_COLORS, NETWORK_LABELS } from "@/types";
import { formatDateShort } from "@/lib/utils";
import { GripVertical, Link as LinkIcon, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoCardProps {
  video: Video;
  onClick: () => void;
}

export default function VideoCard({ video, onClick }: VideoCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: video.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white rounded-xl border border-slate-200 p-3.5 cursor-pointer card-transition select-none",
        isDragging && "opacity-50 shadow-2xl rotate-1"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} />
        </button>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-slate-900 leading-snug line-clamp-2 mb-2">
            {video.title}
          </h3>

          {/* Networks */}
          {video.networks && video.networks.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {video.networks.slice(0, 3).map((net) => (
                <span
                  key={net}
                  className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                >
                  {net === "instagram" ? "📸" : net === "tiktok" ? "🎵" : net === "youtube_short" ? "▶️" : net === "youtube" ? "🎥" : "👥"}
                </span>
              ))}
              {video.networks.length > 3 && (
                <span className="text-xs text-slate-400">+{video.networks.length - 3}</span>
              )}
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            {video.publish_date ? (
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {formatDateShort(video.publish_date)}
              </span>
            ) : (
              <span />
            )}
            {video.drive_link && (
              <span className="text-primary-500">
                <LinkIcon size={11} />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
