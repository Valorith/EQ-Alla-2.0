"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const editableTagNames = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return editableTagNames.has(target.tagName) || target.isContentEditable;
}

function findVisibleSearchInput() {
  const candidates = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="search"]'));

  return candidates.find((input) => !input.disabled && !input.readOnly && input.offsetParent !== null) ?? null;
}

/**
 * Search is the primary action on every route, so give it a keyboard path:
 * "/" or Cmd/Ctrl+K focuses the first visible search field, falling back to the
 * home search when the current page has none. Escape releases the field.
 */
export function useSearchHotkey() {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isTypingTarget(event.target) && event.target instanceof HTMLInputElement) {
        if (event.target.type === "search") {
          event.target.blur();
        }
        return;
      }

      const isSlash = event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey;
      const isCommandK = (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k";

      if (!isSlash && !isCommandK) {
        return;
      }

      // "/" is a legitimate character while typing; Cmd+K should still work there.
      if (isSlash && isTypingTarget(event.target)) {
        return;
      }

      const input = findVisibleSearchInput();

      if (input) {
        event.preventDefault();
        input.focus();
        input.select();
        return;
      }

      event.preventDefault();
      router.push("/");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);
}
