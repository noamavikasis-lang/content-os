"use client";

import { useState } from "react";
import { Video, STATUS_EMOJI, STATUS_LABELS, STATUS_COLORS } from "@/types";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS_HE = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const MONTHS_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

interface CalendarViewProps {
  videos: Video[];
  onVideoClick?: (v: Video) => void;
}

export default function CalendarView({ videos, onVideoClick }: CalendarViewProps) {
  const [current, setCurrent] = useState(new Date());

  const year = current.getFullYear();
  const month = current.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Offset: Sunday = 0
  const startOffset = firstDay.getDay();

  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => new Date(year, month, i + 1)),
  ];

  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  function getVideosForDate(date: Date): Video[] {
    const dateStr = date.toISOString().split("T")[0];
    return videos.filter((v) => v.publish_date === dateStr);
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <button
          onClick={() => setCurrent(new Date(year, month - 1))}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ChevronRight size={18} />
        </button>
        <h2 className="font-semibold text-slate-800">
          {MONTHS_HE[month]} {year}
        </h2>
        <button
          onClick={() => setCurrent(new Date(year, month + 1))}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {DAYS_HE.map((d) => (
          <div key={d} className="text-center py-2 text-xs font-medium text-slate-400">
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) {
            return <div key={`empty-${i}`} className="min-h-[80px] border-b border-l border-slate-50" />;
          }

          const dateStr = date.toISOString().split("T")[0];
          const isToday = dateStr === today;
          const dayVideos = getVideosForDate(date);

          return (
            <div
              key={dateStr}
              className={cn(
                "min-h-[80px] border-b border-l border-slate-100 p-1.5",
                isToday && "bg-primary-50"
              )}
            >
              <div className={cn(
                "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1",
                isToday
                  ? "bg-primary-500 text-white"
                  : "text-slate-500"
              )}>
                {date.getDate()}
              </div>

              {dayVideos.slice(0, 3).map((v) => (
                <button
                  key={v.id}
                  onClick={() => onVideoClick?.(v)}
                  className={cn(
                    "w-full text-right text-xs px-1.5 py-0.5 rounded mb-0.5 border truncate block transition-opacity hover:opacity-80",
                    STATUS_COLORS[v.status]
                  )}
                  title={v.title}
                >
                  {STATUS_EMOJI[v.status]} {v.title}
                </button>
              ))}
              {dayVideos.length > 3 && (
                <div className="text-xs text-slate-400 px-1">+{dayVideos.length - 3} עוד</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
