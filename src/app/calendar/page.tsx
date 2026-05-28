import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import CalendarView from "@/components/CalendarView";
import { Video } from "@/types";

export default async function CalendarPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: videos } = await supabase
    .from("videos")
    .select("*")
    .not("publish_date", "is", null)
    .order("publish_date");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-bold text-slate-800 mb-6">לוח שנה</h1>
          <CalendarView videos={(videos ?? []) as Video[]} />
        </div>
      </main>
    </div>
  );
}
