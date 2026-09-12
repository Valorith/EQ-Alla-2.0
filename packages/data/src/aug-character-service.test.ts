import { describe, expect, it } from "vitest";
import { sql } from "kysely";
import { getDb } from "./db";
import { getAugmentCatalog } from "./aug-bench-service";
import { getBenchCharacterProfile, searchBenchCharacters } from "./aug-character-service";
import { benchPlanSchema, planFromCharacter } from "./aug-bench";

describe("Aug Bench live character equipment", () => {
  it("loads authoritative equipment and socket types without exposing account data or hidden augments", async () => {
    const db = getDb();
    if (!db) throw new Error("Live database required");
    const candidates = await sql<{ id: number; name: string }>`select c.id, c.name from character_data c
      where c.class between 1 and 16 and c.level between 1 and 255 and exists
      (select 1 from inventory v where v.character_id=c.id and v.slot_id between 0 and 22)
      order by c.id limit 1`.execute(db);
    const character = candidates.rows[0];
    expect(character).toBeDefined();
    const matches = await searchBenchCharacters(character.name.slice(0, 2));
    expect(matches.data.length).toBeGreaterThan(0);
    expect(matches.data.length).toBeLessThanOrEqual(12);
    expect(matches.data.every((row) => row.name.toLowerCase().startsWith(character.name.slice(0, 2).toLowerCase()))).toBe(true);
    const profile = await getBenchCharacterProfile(character.id);
    expect(profile).not.toBeNull();
    if (!profile) throw new Error("Profile required");
    expect(Object.keys(profile.character).sort()).toEqual(["classId", "id", "level", "name", "raceId"]);
    const rows = await sql<{ slotId: number; id: number; type1: number; type6: number }>`
      select v.slot_id as slotId, i.id, i.augslot1type as type1, i.augslot6type as type6
      from inventory v join items i on i.id=v.item_id where v.character_id=${character.id}
      and v.slot_id between 0 and 22 and v.item_id>0 order by v.slot_id`.execute(db);
    expect(profile.equipment.map(({ slotId, id }) => ({ slotId, id }))).toEqual(rows.rows.map(({ slotId, id }) => ({ slotId, id })));
    for (const row of rows.rows) {
      const gear = profile.equipment.find((item) => item.slotId === row.slotId);
      expect(gear?.sockets.find((socket) => socket.index === 1)?.type ?? 0).toBe([20, 21].includes(row.type1) ? 0 : row.type1);
      expect(gear?.sockets.find((socket) => socket.index === 6)?.type ?? 0).toBe([20, 21].includes(row.type6) ? 0 : row.type6);
    }
    expect(profile.equipment.flatMap((gear) => gear.sockets).some((socket) => [20, 21].includes(socket.type))).toBe(false);
    const catalog = await getAugmentCatalog();
    const discovered = new Set(catalog.data.map((item) => item.id));
    expect(profile.equipment.flatMap((gear) => gear.sockets).every((socket) => socket.installedAugmentId === null || discovered.has(socket.installedAugmentId))).toBe(true);
    const plan = planFromCharacter(profile);
    expect(benchPlanSchema.parse(JSON.parse(JSON.stringify(plan)))).toEqual(plan);
  }, 20000);
  it("rejects wildcard and injection searches and returns no profile for a missing character", async () => {
    expect(await searchBenchCharacters("%" )).toEqual({ data: [] });
    expect(await searchBenchCharacters("' OR 1=1")).toEqual({ data: [] });
    expect(await getBenchCharacterProfile(4294967295)).toBeNull();
  }, 20000);
});
