import { sql } from "kysely";
import { getDb } from "./db";
import { benchCharacterProfileSchema, benchCharacterSchema, isOrnamentationType } from "./aug-bench";
import { getAugmentCatalog } from "./aug-bench-service";

function database() {
  const db = getDb();
  if (!db) throw new Error("Character equipment requires a database connection.");
  return db;
}

export async function searchBenchCharacters(query: string) {
  if (!/^[a-z]{2,64}$/i.test(query)) return { data: [] };
  const result = await sql`select id, name, level, class as classId, race as raceId
    from character_data where name like ${`${query}%`} order by name, id limit 12`.execute(database());
  return { data: result.rows.map((row) => benchCharacterSchema.parse(row)) };
}

export async function getBenchCharacterProfile(id: number) {
  const db = database();
  const character = await sql`select id, name, level, class as classId, race as raceId
    from character_data where id = ${id}`.execute(db);
  if (!character.rows.length) return null;
  const [inventory, catalog] = await Promise.all([
    sql<Record<string, unknown>>`select v.slot_id as slotId, i.id, i.Name as name, i.icon, i.itemtype as itemType,
      ${sql.join([1, 2, 3, 4, 5, 6].flatMap((index) => [sql.ref(`i.augslot${index}type`), sql.ref(`i.augslot${index}visible`)]))},
      v.augment_one, v.augment_two, v.augment_three, v.augment_four, v.augment_five, v.augment_six
      from inventory v left join items i on i.id = v.item_id
      where v.character_id = ${id} and v.slot_id between 0 and 22 and v.item_id > 0 order by v.slot_id`.execute(db),
    getAugmentCatalog()
  ]);
  const discovered = new Set(catalog.data.map((item) => item.id));
  const augmentColumns = ["one", "two", "three", "four", "five", "six"];
  return benchCharacterProfileSchema.parse({
    character: character.rows[0], retrievedAt: new Date().toISOString(),
    unavailableEquipment: inventory.rows.filter((row) => !row.id).length,
    equipment: inventory.rows.filter((row) => row.id).map((row) => ({
      slotId: Number(row.slotId), id: Number(row.id), name: String(row.name), icon: String(row.icon), itemType: Number(row.itemType),
      sockets: augmentColumns.flatMap((column, offset) => {
        const index = offset + 1;
        const type = Number(row[`augslot${index}type`]);
        if (type <= 0 || isOrnamentationType(type)) return [];
        const installed = Number(row[`augment_${column}`]);
        return [{ index, type, visible: Boolean(Number(row[`augslot${index}visible`])),
          installedAugmentId: discovered.has(installed) ? installed : null,
          unavailable: installed > 0 && !discovered.has(installed) }];
      })
    }))
  });
}
