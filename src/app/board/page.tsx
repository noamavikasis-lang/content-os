import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import KanbanBoard from "@/components/KanbanBoard";
import { Video } from "@/types";

export default async function BoardPage() {
  const supabase = await createClient();

  const { data: videos } = await supabase
    .from("videos")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-hidden flex flex-col">
        <KanbanBoard initialVideos={(videos ?? []) as Video[]} />
      </main>
    </div>
  );
}
