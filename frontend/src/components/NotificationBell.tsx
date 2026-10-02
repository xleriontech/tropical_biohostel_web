"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

export default function NotificationBell() {
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notificaciones/count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setCount((await res.json()).count);
    } catch {}
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <a href="/admin/reservas" className="relative inline-block p-1 text-foreground hover:text-primary transition-colors">
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </a>
  );
}
