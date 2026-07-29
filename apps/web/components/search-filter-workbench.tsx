"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input } from "@eq-alla/ui";
import { Check, ChevronDown, ChevronUp, Search, SlidersHorizontal, X } from "lucide-react";
import { SectionCard } from "./catalog-shell";

export type AppliedFilter = {
  key: string;
  label: string;
  onRemove: () => void;
};

type FilterOption = string | { value: string; label: string };

function normalizeOption(option: FilterOption) {
  return typeof option === "string" ? { value: option, label: option } : option;
}

export function FilterWorkbench({
  title,
  description,
  status,
  activeCount,
  expanded,
  onExpandedChange,
  onSearch,
  onClear,
  primary,
  children,
  appliedFilters,
  emptyMessage = "No filters selected. Add a name or open more filters to browse the catalog.",
  className = ""
}: {
  title: string;
  description: string;
  status: string;
  activeCount: number;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSearch: () => void;
  onClear: () => void;
  primary: ReactNode;
  children: ReactNode;
  appliedFilters: AppliedFilter[];
  emptyMessage?: string;
  className?: string;
}) {
  return (
    <SectionCard
      title={
        <span className="grid gap-1">
          <span>{title}</span>
          <span className="font-[var(--font-body)] text-xs font-normal tracking-normal text-[#a99b86]">{description}</span>
        </span>
      }
      className={`eq-filter-workbench relative z-20 ${className}`.trim()}
      allowOverflow
      right={
        <span className="inline-flex items-center gap-2 text-xs font-medium text-[#ccb594]">
          <span className={`size-1.5 rounded-full ${status === "Filters applied" ? "bg-emerald-400" : "bg-[#d7a45f]"}`} />
          {status}
        </span>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
        className="space-y-5"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          {primary}
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button type="submit" className="min-h-11 gap-2 px-5">
              <Search className="size-4" />
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 gap-2 px-4"
              aria-expanded={expanded}
              onClick={() => onExpandedChange(!expanded)}
            >
              <SlidersHorizontal className="size-4" />
              {expanded ? "Fewer filters" : "More filters"}
              {activeCount > 0 ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#d7a45f] px-1.5 py-0.5 text-[10px] font-bold text-[#21160d]">
                  {activeCount}
                </span>
              ) : null}
              {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </Button>
          </div>
        </div>

        {expanded ? <div className="eq-filter-reveal border-t border-white/8 pt-5">{children}</div> : null}

        <div className="flex min-h-8 flex-wrap items-center gap-2 border-t border-white/8 pt-4">
          {appliedFilters.length > 0 ? (
            <>
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9f8e79]">Applied</span>
              {appliedFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={filter.onRemove}
                  className="group inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#d7a45f]/25 bg-[#d7a45f]/9 px-3 py-1 text-xs text-[#ead8b8] transition hover:border-[#d7a45f]/55 hover:bg-[#d7a45f]/14"
                  aria-label={`Remove ${filter.label} filter`}
                >
                  {filter.label}
                  <X className="size-3.5 text-[#bda987] transition group-hover:text-white" />
                </button>
              ))}
              <button
                type="button"
                onClick={onClear}
                className="ml-auto min-h-8 px-2 text-xs font-semibold text-[#c9b18a] transition hover:text-white"
              >
                Clear all
              </button>
            </>
          ) : (
            <p className="text-xs text-[#8f836f]">{emptyMessage}</p>
          )}
        </div>
      </form>
    </SectionCard>
  );
}

export function PrimarySearchField({
  label,
  name,
  value,
  placeholder,
  onChange
}: {
  label: string;
  name: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">{label}</span>
      <span className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#a99b86]" />
        <Input
          name={name}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-12 pl-11 pr-4 text-[15px]"
        />
      </span>
    </label>
  );
}

export function FilterGroup({
  title,
  description,
  icon,
  children,
  className = ""
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-b border-white/8 pb-5 last:border-0 last:pb-0 ${className}`.trim()}>
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-[#d7a45f]/20 bg-[#d7a45f]/8 text-[#e3b873]">
          {icon}
        </span>
        <div>
          <h4 className="text-sm font-semibold text-[#f1e8d6]">{title}</h4>
          <p className="mt-0.5 text-xs leading-5 text-[#918572]">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function FilterField({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid content-start gap-2 text-sm">
      <span className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">{label}</span>
        {hint ? <span className="text-[10px] text-[#847968]">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

export function FilterSelect({
  label,
  name,
  value,
  options,
  anyLabel = "Any",
  onChange
}: {
  label: string;
  name: string;
  value: string;
  options: FilterOption[];
  anyLabel?: string;
  onChange: (value: string) => void;
}) {
  return (
    <FilterField label={label}>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm text-[#e8dfcf] outline-none transition hover:border-white/18 focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_rgba(215,164,95,0.12)]"
      >
        <option value="" className="bg-[#1a1d23] text-[#e8dfcf]">
          {anyLabel}
        </option>
        {options.map(normalizeOption).map((option) => (
          <option key={option.value} value={option.value} className="bg-[#1a1d23] text-[#e8dfcf]">
            {option.label}
          </option>
        ))}
      </select>
    </FilterField>
  );
}

export function NumberFilter({
  label,
  name,
  value,
  placeholder,
  min = 0,
  onChange
}: {
  label: string;
  name: string;
  value: string;
  placeholder: string;
  min?: number;
  onChange: (value: string) => void;
}) {
  return (
    <FilterField label={label}>
      <Input
        name={name}
        type="number"
        inputMode="numeric"
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </FilterField>
  );
}

export function SegmentedFilter({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">{label}</span>
      <div role="group" aria-label={label} className="grid h-11 grid-cols-3 rounded-xl border border-white/10 bg-black/20 p-1">
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value || "any"}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={`whitespace-nowrap rounded-lg px-2 text-xs font-semibold transition ${
                active
                  ? "bg-[#d7a45f] text-[#21160d] shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
                  : "text-[#aa9c86] hover:bg-white/5 hover:text-white"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MultiSelectDropdown({
  label,
  name,
  values,
  options,
  onChange
}: {
  label: string;
  name: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? options.filter((option) => option.toLowerCase().includes(normalized)) : options;
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const toggleValue = (option: string) => {
    onChange(values.includes(option) ? values.filter((value) => value !== option) : [...values, option]);
  };

  return (
    <div ref={containerRef} className="relative grid content-start gap-2 text-sm">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">{label}</span>
      <button
        type="button"
        name={name}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 text-left text-sm text-[var(--foreground)] outline-none transition hover:border-white/18 focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_rgba(215,164,95,0.12)]"
      >
        <span className={values.length === 0 ? "text-[var(--muted)]" : ""}>
          {values.length === 0 ? "Any" : values.length <= 2 ? values.join(", ") : `${values.length} selected`}
        </span>
        <ChevronDown className={`size-4 text-[var(--muted)] transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div className="absolute top-full z-40 mt-2 w-full min-w-56 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[#191b21]/98 shadow-[0_18px_44px_rgba(0,0,0,0.42)] backdrop-blur-xl">
          <div className="space-y-2 border-b border-[var(--border)] p-3">
            {options.length > 8 ? (
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Find ${label.toLowerCase()}...`}
                className="h-9"
                autoFocus
              />
            ) : null}
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              <span>{values.length === 0 ? "Any" : `${values.length} selected`}</span>
              {values.length > 0 ? (
                <button type="button" className="font-semibold text-[#d7a45f] hover:text-[#f0c98a]" onClick={() => onChange([])}>
                  Clear
                </button>
              ) : null}
            </div>
          </div>
          <div role="listbox" aria-multiselectable="true" className="max-h-64 overflow-y-auto py-1">
            {filteredOptions.map((option) => {
              const checked = values.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={checked}
                  onClick={() => toggleValue(option)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[var(--foreground)] transition hover:bg-white/7"
                >
                  <span
                    className={`grid size-4 shrink-0 place-items-center rounded border ${
                      checked ? "border-[#d7a45f] bg-[#d7a45f] text-[#21160d]" : "border-white/20 bg-black/20"
                    }`}
                  >
                    {checked ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
            {filteredOptions.length === 0 ? <p className="px-4 py-5 text-center text-xs text-[#8f836f]">No matching options</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
