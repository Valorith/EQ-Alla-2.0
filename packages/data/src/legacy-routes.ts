export function resolveLegacyRoute(
  pathname: string,
  searchParams: URLSearchParams
): string | null {
  if (pathname === "/task.php") {
    const id = searchParams.get("id");
    return id ? `/tasks/${id}` : "/tasks";
  }

  if (pathname === "/spawngroup.php") {
    const id = searchParams.get("id");
    return id ? `/spawngroups/${id}` : "/zones";
  }

  const route = searchParams.get("a");

  if (!route) {
    return null;
  }

  switch (route) {
    case "items":
      return withQuery("/items", searchParams, ["q", "name", "class", "slot", "tradeable"]);
    case "item": {
      const id = searchParams.get("id");
      const name = searchParams.get("name");
      if (id) return `/items/${id}`;
      if (name) return `/items?q=${encodeURIComponent(name)}`;
      return "/items";
    }
    case "spells":
      return withQuery("/spells", searchParams, ["q", "class", "level"]);
    case "spell":
      return searchParams.get("id") ? `/spells/${searchParams.get("id")}` : "/spells";
    case "npcs":
      return withQuery("/npcs", searchParams, ["q", "zone"]);
    case "advanced_npcs":
      return withQuery("/npcs/advanced", searchParams, [
        "name",
        "minLevel",
        "maxLevel",
        "race",
        "named"
      ]);
    case "npc": {
      const id = searchParams.get("id");
      const name = searchParams.get("name");
      if (id) return `/npcs/${id}`;
      if (name) return `/npcs?q=${encodeURIComponent(name)}`;
      return "/npcs";
    }
    case "factions":
      return withQuery("/factions", searchParams, ["q"]);
    case "faction":
      return searchParams.get("id") ? `/factions/${searchParams.get("id")}` : "/factions";
    case "pets":
      return withQuery("/pets", searchParams, ["q"]);
    case "pet":
      return searchParams.get("id") ? `/pets/${searchParams.get("id")}` : "/pets";
    case "recipes":
      return withQuery("/recipes", searchParams, ["q", "tradeskill"]);
    case "recipe":
      return searchParams.get("id") ? `/recipes/${searchParams.get("id")}` : "/recipes";
    case "tasks":
      return "/tasks";
    case "zones":
      return "/zones";
    case "zonelist":
      return "/zones/by-era";
    case "zones_by_level":
      return "/zones/by-level";
    case "zone_era": {
      const era = searchParams.get("era");
      return era ? `/zones/by-era/${encodeURIComponent(era)}` : "/zones/by-era";
    }
    case "zone": {
      const zone = searchParams.get("name");
      const mode = searchParams.get("mode");
      if (!zone) return "/zones";
      if (mode) return `/zones/${encodeURIComponent(zone)}?mode=${encodeURIComponent(mode)}`;
      return `/zones/${encodeURIComponent(zone)}`;
    }
    case "zone_named": {
      const zone = searchParams.get("name");
      return zone ? `/zones/${encodeURIComponent(zone)}/named` : "/zones";
    }
    case "global_search":
      return withQuery("/search", searchParams, ["q"]);
    default:
      return null;
  }
}

function withQuery(path: string, searchParams: URLSearchParams, keys: string[]) {
  const next = new URLSearchParams();

  for (const key of keys) {
    const value = searchParams.get(key);
    if (value) {
      next.set(key, value);
    }
  }

  const serialized = next.toString();
  return serialized ? `${path}?${serialized}` : path;
}
