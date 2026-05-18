"use client";

import { useEffect } from "react";
import { Button } from "@eq-alla/ui";
import { ArchiveBoundaryContent } from "../components/archive-boundary-content";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const detail =
    process.env.NODE_ENV === "development" ? (
      <p className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 font-mono text-xs leading-6 text-[#d7cfbf]">
        {error.message}
        {error.digest ? <span className="mt-2 block text-[#9f8e79]">Digest: {error.digest}</span> : null}
      </p>
    ) : (
      <p>
        The archive hit an unexpected problem while loading this page. You can try again, search for what you need, or
        browse another section.
      </p>
    );

  return (
    <ArchiveBoundaryContent
      eyebrow="Archive Disrupted"
      title="Something went wrong loading this page"
      description="A temporary error interrupted this request. Your connection and the rest of the site should still be fine."
      actions={
        <Button type="button" variant="outline" onClick={reset}>
          Try again
        </Button>
      }
      detail={detail}
    />
  );
}
