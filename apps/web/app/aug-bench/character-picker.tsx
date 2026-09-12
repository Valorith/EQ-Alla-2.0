"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { benchCharacterProfileSchema, benchCharacterSearchSchema, type BenchCharacter, type BenchCharacterProfile } from "@eq-alla/data/aug-bench";
import { itemClassNames } from "@eq-alla/data/item-search-filters";

export function CharacterPicker({ onLoad }: { onLoad: (profile: BenchCharacterProfile) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BenchCharacter[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controllerRef = useRef<AbortController | null>(null);
  const disclosureRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  async function request(id?: number) {
    controllerRef.current?.abort();
    const controller = new AbortController(); controllerRef.current = controller;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/aug-bench/characters?${id ? `id=${id}` : `q=${encodeURIComponent(query.trim())}`}`, {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)])
      });
      if (!response.ok) throw new Error("Character request failed");
      const data: unknown = await response.json();
      if (controller.signal.aborted) return;
      if (id) {
        onLoad(benchCharacterProfileSchema.parse(data));
        if (disclosureRef.current) disclosureRef.current.open = false;
      } else setResults(benchCharacterSearchSchema.parse(data).data);
    } catch {
      if (!controller.signal.aborted) setError("Could not load character data. Please retry.");
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }

  return <details className="ab-character-search" ref={disclosureRef}>
    <summary><Search size={15} /> Load character equipment</summary>
    <form onSubmit={(event) => { event.preventDefault(); void request(); }}>
      <label>Character name<input value={query} minLength={2} maxLength={64} pattern="[A-Za-z]{2,64}" required placeholder="First two letters or more…" onChange={(event) => {
        controllerRef.current?.abort(); setBusy(false); setQuery(event.target.value); setResults(null); setError("");
      }} /></label><button disabled={busy} type="submit">{busy ? "Loading…" : "Search"}</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {results && <div className="ab-character-results" aria-label="Character search results">
      {!results.length && <p>No matching characters. Try the start of another name.</p>}
      {results.map((character) => <button key={character.id} disabled={busy} onClick={() => void request(character.id)}>
        <strong>{character.name}</strong><span>Level {character.level} {itemClassNames[character.classId - 1]}</span><span>Load →</span>
      </button>)}
    </div>}
  </details>;
}
