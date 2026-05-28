"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Columns3,
  Calendar,
  BarChart3,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "דשבורד", icon: LayoutDashboard },
  { href: "/board", label: "לוח Kanban", icon: Columns3 },
  { href: "/calendar", label: "לוח שנה", icon: Calendar },
  { href: "/analytics", label: "אנליטיקה", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-56 min-h-screen bg-sidebar flex flex-col text-white">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🎬</span>
          <div>
            <div className="font-bold text-sm leading-tight">Content OS</div>
            <div className="text-xs text-white/50">ניהול תוכן</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === href
                ? "bg-primary-500 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors w-full"
        >
          <LogOut size={18} />
          יציאה
        </button>
      </div>
    </aside>
  );
}
