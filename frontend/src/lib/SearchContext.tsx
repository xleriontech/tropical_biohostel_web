"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface SearchContextType {
  openSearch: boolean;
  setOpenSearch: (open: boolean) => void;
  initialQuery?: string;
  setInitialQuery: (q?: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [openSearch, setOpenSearch] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string | undefined>();
  return (
    <SearchContext.Provider value={{ openSearch, setOpenSearch, initialQuery, setInitialQuery }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
}
