"use client";

import { useEffect, useRef, useState } from "react";
import type { ItemDetail } from "@eq-alla/data";
import { Package2 } from "lucide-react";
import { ItemDetailPreview } from "./item-detail-preview";

type HoveredItem = {
  id: number;
};

type TooltipPosition = {
  left: number;
  top: number;
};

type CursorPosition = {
  x: number;
  y: number;
};

const itemDetailCache = new Map<number, ItemDetail>();

function unavailableCard(message: string) {
  return (
    <div className="inline-block max-w-full rounded-[12px] border border-white/10 bg-[linear-gradient(180deg,rgba(23,29,38,0.96),rgba(14,19,27,0.94))] px-4 py-4 text-[#e6e0d2] shadow-[0_18px_40px_rgba(0,0,0,0.3)] backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b99a67]">Item Preview</p>
      <div className="mt-3 flex items-start gap-3">
        <div className="relative mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-[16px] border border-[#e2c27a]/24 bg-[radial-gradient(circle_at_30%_20%,rgba(239,206,123,0.24),transparent_45%),linear-gradient(180deg,rgba(48,55,67,0.96),rgba(21,26,34,0.94))] shadow-[0_12px_24px_rgba(0,0,0,0.26)]">
          <Package2 className="size-5 text-[#f0d8a0]" strokeWidth={1.8} />
          <div className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border border-[#f4d58f]/45 bg-[radial-gradient(circle_at_30%_30%,rgba(255,248,220,0.98),rgba(236,192,91,0.82))] text-[0.72rem] font-semibold leading-none text-[#3c2a12] shadow-[0_6px_12px_rgba(0,0,0,0.25)]">
            ?
          </div>
        </div>
        <p className="text-sm leading-7 text-[#d7cfbf]">{message}</p>
      </div>
    </div>
  );
}

function getHoveredItemTrigger(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return null;
  }

  const trigger = target.closest("[data-item-tooltip-id]");
  if (!(trigger instanceof HTMLElement)) {
    return null;
  }

  const id = Number(trigger.dataset.itemTooltipId ?? 0);
  if (!id) {
    return null;
  }

  return { trigger, id };
}

function loadingCard() {
  return (
    <div className="inline-block max-w-full rounded-[12px] border border-white/10 bg-[linear-gradient(180deg,rgba(23,29,38,0.96),rgba(14,19,27,0.94))] px-4 py-4 text-[#e6e0d2] shadow-[0_18px_40px_rgba(0,0,0,0.3)] backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b99a67]">Item Preview</p>
      <p className="mt-3 text-sm leading-7 text-[#d7cfbf]">Loading item details...</p>
    </div>
  );
}

export function ItemHoverTooltip() {
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const activeTriggerRef = useRef<HTMLElement | null>(null);
  const activeItemIdRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cursorPositionRef = useRef<CursorPosition | null>(null);
  const [hoveredItem, setHoveredItem] = useState<HoveredItem | null>(null);
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error" | "undiscovered">("idle");

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }

    const updateHoveredTrigger = (trigger: HTMLElement | null, id?: number | null) => {
      if (trigger === activeTriggerRef.current && (id ?? null) === activeItemIdRef.current) {
        return;
      }

      activeTriggerRef.current = trigger;
      activeItemIdRef.current = id ?? null;
      setPosition(null);

      if (!trigger || !id || window.innerWidth < 1100) {
        setHoveredItem(null);
        return;
      }

      setHoveredItem({ id });
    };

    const refreshHoveredAnchor = () => {
      const cursor = cursorPositionRef.current;
      if (!cursor || window.innerWidth < 1100) {
        updateHoveredTrigger(null);
        return;
      }

      const target = document.elementFromPoint(cursor.x, cursor.y);
      const hovered = getHoveredItemTrigger(target);
      if (!hovered) {
        updateHoveredTrigger(null);
        return;
      }

      updateHoveredTrigger(hovered.trigger, hovered.id);
    };

    const handleMouseMove = (event: MouseEvent) => {
      cursorPositionRef.current = { x: event.clientX, y: event.clientY };

      if (window.innerWidth < 1100) {
        updateHoveredTrigger(null);
        return;
      }

      const hovered = getHoveredItemTrigger(event.target);
      if (!hovered) {
        updateHoveredTrigger(null);
        return;
      }

      updateHoveredTrigger(hovered.trigger, hovered.id);
    };

    const handlePointerDown = () => updateHoveredTrigger(null);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        updateHoveredTrigger(null);
      }
    };

    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleEscape, true);
    window.addEventListener("resize", refreshHoveredAnchor);
    window.addEventListener("scroll", refreshHoveredAnchor, true);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleEscape, true);
      window.removeEventListener("resize", refreshHoveredAnchor);
      window.removeEventListener("scroll", refreshHoveredAnchor, true);
    };
  }, []);

  useEffect(() => {
    abortRef.current?.abort();

    if (!hoveredItem) {
      setItem(null);
      setStatus("idle");
      return;
    }

    const cached = itemDetailCache.get(hoveredItem.id);
    if (cached) {
      setItem(cached);
      setStatus("ready");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setItem(null);
    setStatus("loading");

    void (async () => {
      try {
        const response = await fetch(`/api/items/${hoveredItem.id}`, { signal: controller.signal });
        const payload = (await response.json().catch(() => null)) as
          | { data?: ItemDetail; code?: string; error?: string }
          | null;

        if (!response.ok) {
          if (response.status === 403 && payload?.code === "ITEM_UNDISCOVERED") {
            setStatus("undiscovered");
            return;
          }

          throw new Error(`Failed to load item ${hoveredItem.id}`);
        }

        if (controller.signal.aborted || !payload.data) {
          return;
        }

        itemDetailCache.set(hoveredItem.id, payload.data);
        setItem(payload.data);
        setStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error(error);
        setStatus("error");
      }
    })();

    return () => controller.abort();
  }, [hoveredItem]);

  useEffect(() => {
    if (!hoveredItem || !tooltipRef.current || !cursorPositionRef.current) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const tooltip = tooltipRef.current;
      const cursor = cursorPositionRef.current;
      if (!tooltip) {
        return;
      }
      if (!cursor) {
        return;
      }

      const padding = 12;
      const gap = 18;
      const width = tooltip.offsetWidth;
      const height = tooltip.offsetHeight;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      let left = cursor.x + gap;

      if (left + width > viewportWidth - padding) {
        left = cursor.x - width - gap;
      }

      if (left < padding) {
        left = Math.max(padding, viewportWidth - width - padding);
      }

      let top = cursor.y + gap;
      if (top + height > viewportHeight - padding) {
        top = cursor.y - height - gap;
      }

      if (top < padding) {
        top = padding;
      }

      setPosition({ left, top });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [hoveredItem, item, status]);

  if (!hoveredItem) {
    return null;
  }

  return (
    <div
      ref={tooltipRef}
      className="pointer-events-none fixed z-[120] hidden min-[1100px]:inline-block"
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        visibility: position ? "visible" : "hidden",
        maxWidth: "min(650px, calc(100vw - 24px))"
      }}
      aria-hidden="true"
    >
      {status === "ready" && item ? <ItemDetailPreview item={item} /> : null}
      {status === "loading" ? loadingCard() : null}
      {status === "undiscovered"
        ? unavailableCard("This item cannot be previewed yet because it has not been discovered.")
        : null}
      {status === "error" ? (
        unavailableCard("Could not load the item tooltip.")
      ) : null}
    </div>
  );
}
