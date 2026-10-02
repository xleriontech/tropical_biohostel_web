"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSearch } from "@/lib/SearchContext";

function SearchRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setOpenSearch, setInitialQuery } = useSearch();

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setInitialQuery(q);
    }
    setOpenSearch(true);
    router.replace("/");
  }, []);

  return (
    <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
      Redirigiendo...
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchRedirect />
    </Suspense>
  );
}
