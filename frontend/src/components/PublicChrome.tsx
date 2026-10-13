"use client";

import { usePathname } from "next/navigation";
import NavBar from "./NavBar";
import Footer from "./Footer";
import MobileNav from "./MobileNav";
import SearchModal from "./SearchModal";
import ChatWidget from "./ChatWidget";
import DonarFloat from "./DonarFloat";

/** Chrome público. En /admin* se oculta para no chocar con el panel fijo. */
export default function PublicChrome({ slot }: { slot: "top" | "bottom" }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  if (slot === "top") return <NavBar />;
  return (
    <>
      <Footer />
      <MobileNav />
      <SearchModal />
      <ChatWidget />
      <DonarFloat />
    </>
  );
}
