import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import ArchiveView from "@/components/ArchiveView";
import { Video } from "@/types";

export default async function ArchivePage() {
  const supabase = await createClient();

  const [readyToResetRes, archivedRes] = await Promise.all([
    supabase
      .from("videos")
      .select("*")
      .eq("status", "published")
      .eq("archived", false)
      .order("publish_date", { ascending: false }),
    supabase
      .from("videos")
      .select("*")
      .eq("archived", true)
      .order("archived_at", { ascending: false }),
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <ArchiveView
            initialReadyToReset={(readyToResetRes.data ?? []) as Video[]}
            initialArchived={(archivedRes.data ?? []) as Video[]}
          />
        </div>
      </main>
    </div>
  );
}
