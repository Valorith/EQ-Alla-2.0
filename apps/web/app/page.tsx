"use client";

import { useEffect, useState } from "react";
import { Input } from "@eq-alla/ui";
import { Search } from "lucide-react";

export default function HomePage() {
  const [isFocused, setIsFocused] = useState(false);

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
    <section className="eq-home-stage flex min-h-[calc(100vh-7rem)] justify-center px-4 pt-10 sm:px-8 sm:pt-14 xl:pt-18">
      <form action="/search" className="w-full max-w-3xl">
        <div className="eq-home-search relative">
          <Search className="eq-home-search-icon pointer-events-none absolute left-5 top-1/2 z-10 size-5 -translate-y-1/2 text-white/46" />
          <Input
            name="q"
            type="search"
            placeholder="Search Items, NPCs, etc..."
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="h-16 rounded-[30px] border-white/18 bg-white/10 pl-14 pr-5 text-base text-white shadow-[0_22px_60px_rgba(7,10,15,0.2),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-[24px] placeholder:text-white/52 focus:border-white/24 focus:bg-white/14 focus:shadow-[0_0_0_4px_rgba(255,255,255,0.08)]"
          />
        </div>
      </form>
    </section>
  );
}
