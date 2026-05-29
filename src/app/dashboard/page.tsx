import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import { Video, STATUS_LABELS, STATUS_EMOJI, STATUS_COLORS, NETWORK_LABELS } from "@/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

function VideoRow({ video }: { video: Video }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-xl">{STATUS_EMOJI[video.status]}</span>
        <div>
          <div className="font-medium text-slate-800 text-sm">{video.title}</div>
          {video.networks?.length > 0 && (
            <div className="text-xs text-slate-400 mt-0.5">
              {video.networks.map((n) => NETWORK_LABELS[n]).join(", ")}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[video.status]}`}>
          {STATUS_LABELS[video.status]}
        </span>
        {video.publish_date && (
          <span className="text-xs text-slate-400">{formatDate(video.publish_date)}</span>
        )}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [todayRes, readyRes, upcomingRes, totalRes] = await Promise.all([
    supabase.from("videos").select("*").eq("publish_date", today),
    supabase.from("videos").select("*").eq("status", "ready").order("publish_date"),
    supabase.from("videos").select("*")
      .gt("publish_date", today)
      .lte("publish_date", nextWeek)
      .order("publish_date")
      .limit(5),
    supabase.from("videos").select("id, status"),
  ]);

  const todayVideos = (todayRes.data ?? []) as Video[];
  const readyVideos = (readyRes.data ?? []) as Video[];
  const upcomingVideos = (upcomingRes.data ?? []) as Video[];
  const allVideos = (totalRes.data ?? []) as Video[];

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const thisWeekPublished = allVideos.filter((v) => v.status === "published").length;

  const statCards = [
    { label: "סה\"כ סרטונים", value: allVideos.length, emoji: "🎬" },
    { label: "בעריכה", value: allVideos.filter((v) => v.status === "editing").length, emoji: "✂️" },
    { label: "מוכן לעלות", value: readyVideos.length, emoji: "✅" },
    { label: "פורסמו", value: thisWeekPublished, emoji: "🚀" },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800">שלום! 👋</h1>
            <p className="text-slate-500 mt-1">
              {new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {statCards.map((card) => (
              <div key={card.label} className="bg-white rounded-xl border border-slate-100 p-4">
                <div className="text-2xl mb-2">{card.emoji}</div>
                <div className="text-2xl font-bold text-slate-800">{card.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{card.label}</div>
              </div>
            ))}
          </div>

          {/* Today */}
          <section className="mb-6">
            <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span>📅</span> עולה היום
              {todayVideos.length > 0 && (
                <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-bold">
                  {todayVideos.length}
                </span>
              )}
            </h2>
            {todayVideos.length === 0 ? (
              <div className="text-sm text-slate-400 bg-white rounded-xl border border-slate-100 p-4">
                אין תוכן מתוזמן להיום
              </div>
            ) : (
              <div className="space-y-2">
                {todayVideos.map((v) => <VideoRow key={v.id} video={v} />)}
              </div>
            )}
          </section>

          {/* Ready to publish */}
          {readyVideos.length > 0 && (
            <section className="mb-6">
              <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <span>✅</span> מוכן לפרסום
                <span className="bg-green-100 text-green-600 text-xs px-2 py-0.5 rounded-full font-bold">
                  {readyVideos.length}
                </span>
              </h2>
              <div className="space-y-2">
                {readyVideos.slice(0, 5).map((v) => <VideoRow key={v.id} video={v} />)}
              </div>
            </section>
          )}

          {/* Upcoming */}
          <section>
            <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span>📆</span> עולה בשבוע הקרוב
            </h2>
            {upcomingVideos.length === 0 ? (
              <div className="text-sm text-slate-400 bg-white rounded-xl border border-slate-100 p-4">
                אין תוכן מתוזמן לשבוע הקרוב
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingVideos.map((v) => <VideoRow key={v.id} video={v} />)}
              </div>
            )}
          </section>

          <div className="mt-8 text-center">
            <Link
              href="/board"
              className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600 text-sm font-medium"
            >
              עבור ללוח הסרטונים ←
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
