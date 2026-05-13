"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

const NAV = [
  {
    section: "Inbox",
    items: [
      { href: "/inbox", icon: "📋", label: "All Messages" },
      { href: "/inbox?channel=gmail", icon: "✉️", label: "Gmail" },
      { href: "/inbox?channel=whatsapp", icon: "💬", label: "WhatsApp" },
      { href: "/inbox?channel=instagram", icon: "📸", label: "Instagram" },
    ],
  },
  {
    section: "Manage",
    items: [
      { href: "/leads", icon: "👥", label: "Leads" },
      { href: "/knowledge-base", icon: "🧠", label: "Knowledge Base" },
    ],
  },
  {
    section: "Settings",
    items: [{ href: "/settings", icon: "⚙️", label: "Settings" }],
  },
];

function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <nav className="flex-1 py-[14px] px-[10px] overflow-y-auto">
      {NAV.map((group) => (
        <div key={group.section} className="mb-5">
          <div className="text-[9px] font-semibold text-dpw-muted tracking-[0.1em] uppercase px-[10px] mb-1">
            {group.section}
          </div>

          {group.items.map((item) => {
            const [itemPath, itemQuery] = item.href.split("?");
            const itemChannel = itemQuery
              ? new URLSearchParams(itemQuery).get("channel")
              : null;
            const currentChannel = searchParams.get("channel");

            const active = itemChannel
              ? pathname.startsWith(itemPath) && currentChannel === itemChannel
              : pathname.startsWith(itemPath) && !currentChannel;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-[10px] px-[10px] py-2 rounded-md mb-[1px] text-[12px] font-sans transition-all duration-100 ${
                  active
                    ? "font-semibold text-dpw-gold bg-[rgba(184,150,12,0.12)]"
                    : "font-normal text-dpw-mid bg-transparent"
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export default function Sidebar() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [initial, setInitial] = useState("U");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then((result: Awaited<ReturnType<typeof supabase.auth.getUser>>) => {
        const user = result.data?.user;
        if (user?.email) {
          setEmail(user.email);
          setInitial(user.email[0].toUpperCase());
        }
      });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="w-[220px] flex-shrink-0 bg-dpw-dark flex flex-col font-sans">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-dpw-border">
        <div className="font-serif text-[15px] font-semibold text-white leading-[1.2] mb-1">
          Dream Paris Wedding
        </div>

        <div className="text-[10px] text-dpw-muted tracking-[0.08em] mb-[10px]">
          AI COMMAND CENTRE
        </div>

        <div className="inline-flex items-center gap-[5px] bg-[rgba(45,122,78,0.18)] rounded-xl px-[10px] py-[3px] text-[10px] text-[#4dbb80]">
          <span className="w-[5px] h-[5px] rounded-full bg-[#4dbb80]" />
          AI Active
        </div>
      </div>

      {/* Nav */}
      <Suspense fallback={<nav className="flex-1 py-[14px] px-[10px]" />}>
        <SidebarNav />
      </Suspense>

      {/* Footer */}
      <div className="px-[16px] py-[14px] border-t border-dpw-border flex items-center gap-[10px]">
        <div className="w-[30px] h-[30px] rounded-full bg-dpw-gold flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0">
          {initial}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-[#c8b88a] font-medium truncate">
            {email || "…"}
          </div>

          <button
            onClick={handleLogout}
            className="text-[10px] text-dpw-muted bg-transparent border-0 p-0 cursor-pointer font-sans"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
