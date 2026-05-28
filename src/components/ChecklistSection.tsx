"use client";

import { useState, useEffect } from "react";
import { Video, ChecklistItem } from "@/types";
import { CHECKLIST_ITEMS, STAGE_LABELS, getRelevantChecklists } from "@/lib/checklist-items";
import { createClient } from "@/lib/supabase/client";
import { CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistSectionProps {
  video: Video;
}

export default function ChecklistSection({ video }: ChecklistSectionProps) {
  const [items, setItems] = useState<Record<string, boolean>>({});
  const supabase = createClient();

  const relevantStages = getRelevantChecklists(video.status);
  const relevantItems = CHECKLIST_ITEMS.filter((i) => relevantStages.includes(i.stage));

  useEffect(() => {
    loadChecklist();
  }, [video.id]);

  async function loadChecklist() {
    const { data } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("video_id", video.id);

    if (data) {
      const map: Record<string, boolean> = {};
      data.forEach((item: ChecklistItem) => { map[item.item_key] = item.checked; });
      setItems(map);
    }
  }

  async function toggleItem(key: string) {
    const newVal = !items[key];
    setItems((prev) => ({ ...prev, [key]: newVal }));

    const existing = await supabase
      .from("checklist_items")
      .select("id")
      .eq("video_id", video.id)
      .eq("item_key", key)
      .single();

    if (existing.data) {
      await supabase
        .from("checklist_items")
        .update({ checked: newVal, checked_at: newVal ? new Date().toISOString() : null })
        .eq("id", existing.data.id);
    } else {
      await supabase.from("checklist_items").insert({
        video_id: video.id,
        item_key: key,
        checked: newVal,
        checked_at: newVal ? new Date().toISOString() : null,
      });
    }
  }

  const checkedCount = relevantItems.filter((i) => items[i.key]).length;
  const totalCount = relevantItems.length;

  if (relevantItems.length === 0) return null;

  const stages = [...new Set(relevantItems.map((i) => i.stage))];

  return (
    <div>
      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>התקדמות</span>
          <span className="font-medium">{checkedCount}/{totalCount}</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-400 rounded-full transition-all duration-300"
            style={{ width: totalCount ? `${(checkedCount / totalCount) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* Items by stage */}
      <div className="space-y-4">
        {stages.map((stage) => {
          const stageItems = relevantItems.filter((i) => i.stage === stage);
          return (
            <div key={stage}>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                {STAGE_LABELS[stage]}
              </h4>
              <div className="space-y-1.5">
                {stageItems.map((item) => {
                  const checked = !!items[item.key];
                  return (
                    <button
                      key={item.key}
                      onClick={() => toggleItem(item.key)}
                      className="flex items-center gap-2.5 w-full text-right hover:bg-slate-50 rounded-lg p-2 transition-colors group"
                    >
                      <span className={cn(
                        "shrink-0 transition-colors",
                        checked ? "text-green-500" : "text-slate-300 group-hover:text-slate-400"
                      )}>
                        {checked ? <CheckSquare size={16} /> : <Square size={16} />}
                      </span>
                      <span className={cn(
                        "text-sm",
                        checked ? "line-through text-slate-400" : "text-slate-700"
                      )}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
