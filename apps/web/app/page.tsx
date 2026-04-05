"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@eq-alla/ui";
import { Search } from "lucide-react";
import { SearchClient } from "./search/search-client";

export default function HomePage() {
  return (
    <Suspense fallback={<HomePageBody query="" />}>
      <HomePageWithSearchParams />
    </Suspense>
  );
}

function HomePageWithSearchParams() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";

  return <HomePageBody query={query} />;
}

function HomePageBody({ query }: { query: string }) {
  const [isFocused, setIsFocused] = useState(false);
  const hasResults = query.trim().length > 0;

  useEffect(() => {
    document.body.classList.add("eq-home-page");

    if (isFocused) {
      document.body.classList.add("eq-home-search-focused");
    } else {
      document.body.classList.remove("eq-home-search-focused");
    }

    return () => {
      document.body.classList.remove("eq-home-page", "eq-home-search-focused");
    };
  }, [isFocused]);

  return (
    <div className={hasResults ? "space-y-8 px-4 pb-8 pt-8 sm:px-6 lg:px-8" : undefined}>
      <section
        className={
          hasResults
            ? "eq-home-stage flex justify-center"
            : "eq-home-stage flex min-h-[calc(100dvh-7rem)] justify-center px-4 pt-10 sm:px-8 sm:pt-14 xl:pt-18"
        }
      >
        <form action="/" className="w-full max-w-3xl space-y-5">
          <div className="flex justify-center">
            <div className="flex items-end gap-2">
              <span className="eq-wordmark text-[3rem] font-semibold leading-none text-[#f3c54f] sm:text-[3.6rem]">EQ Alla</span>
              <span className="pb-1.5 text-sm font-semibold uppercase tracking-[0.18em] text-[#f0d8a0]/80 sm:pb-2 sm:text-[0.95rem]">2.0</span>
            </div>
          </div>
          <div className="eq-home-search relative">
            <Search className="eq-home-search-icon pointer-events-none absolute left-5 top-1/2 z-10 size-5 -translate-y-1/2 text-white/46" />
            <Input
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Search Items, NPCs, etc..."
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="h-16 rounded-[30px] border-white/18 bg-white/10 pl-14 pr-5 text-base text-white shadow-[0_22px_60px_rgba(7,10,15,0.2),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-[24px] placeholder:text-white/52 focus:border-white/24 focus:bg-white/14 focus:shadow-[0_0_0_4px_rgba(255,255,255,0.08)]"
            />
          </div>
        </form>
      </section>

      {hasResults ? (
        <div className="xl:pl-[306px]">
          <SearchClient initialQuery={query} />
        </div>
      ) : null}
    </div>
  );
}
