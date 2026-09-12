import { sql } from "kysely";
import { getDb } from "./db";
import { cacheGetOrResolve } from "./cache";
import { augmentStats, benchItemSchema } from "./aug-bench";
import { bardSkillTypeNames, eqEmuSkillTypeNames, itemElementDamageTypeNames } from "./services";
import { bodyTypeNameMap } from "./body-type-names";
import { raceNames } from "./race-names";

function database() {
  const db = getDb();
  if (!db) throw new Error("Aug Bench requires a server database connection.");
  return db;
}

async function readAugments() {
  const db = database();
  const rows = await sql<Record<string, unknown>>`
    select i.id, i.Name as name, i.icon, i.slots, i.classes, i.races,
      i.itemtype as itemType, i.augtype as augType, i.augrestrict as restriction,
      i.loregroup as loreGroup, i.reqlevel as requiredLevel, i.reclevel as recommendedLevel,
      i.nodrop, coalesce(i.source, '') as source,
      ${sql.join(augmentStats.map(({ key }) => sql.ref(`i.${key}`)))},
      i.focuseffect, i.worneffect, i.proceffect, i.clickeffect,
      i.elemdmgtype, i.skillmodtype, i.extradmgskill, i.bardtype, i.banedmgbody, i.banedmgrace,
      focus.name as focusName, worn.name as wornName, proc.name as procName, click.name as clickName
    from items i
    left join spells_new focus on focus.id = i.focuseffect
    left join spells_new worn on worn.id = i.worneffect
    left join spells_new proc on proc.id = i.proceffect
    left join spells_new click on click.id = i.clickeffect
    where i.itemclass = 0 and exists (select 1 from discovered_items di where di.item_id = i.id)
      and i.augtype > 0
    order by i.Name, i.id
  `.execute(db);
  return rows.rows.map((row) => benchItemSchema.parse({
    ...row, icon: String(row.icon ?? 0), tradeable: Number(row.nodrop) !== 0,
    stats: Object.fromEntries(augmentStats.map(({ key }) => [key, Number(row[key] ?? 0)])),
    bonuses: [
      { label: `${itemElementDamageTypeNames[Number(row.elemdmgtype)] ?? "Elemental"} damage`, value: Number(row.elemdmgamt), unit: "" },
      { label: `${eqEmuSkillTypeNames[Number(row.skillmodtype)] ?? `Skill ${row.skillmodtype}`} modifier`, value: Number(row.skillmodvalue), unit: "%" },
      { label: `${eqEmuSkillTypeNames[Number(row.extradmgskill)] ?? `Skill ${row.extradmgskill}`} damage`, value: Number(row.extradmgamt), unit: "" },
      { label: `${bardSkillTypeNames[Number(row.bardtype)] ?? "Instrument"} modifier`, value: Number(row.bardvalue), unit: "" },
      { label: `Bane damage: ${bodyTypeNameMap[Number(row.banedmgbody)] ?? `Body ${row.banedmgbody}`}`, value: Number(row.banedmgamt), unit: "" },
      { label: `Bane damage: ${raceNames[Number(row.banedmgrace)] ?? `Race ${row.banedmgrace}`}`, value: Number(row.banedmgraceamt), unit: "" }
    ].filter((bonus) => bonus.value !== 0),
    effects: ["focus", "worn", "proc", "click"].flatMap((kind) => {
      const id = Number(row[`${kind}effect`]);
      return id > 0 && id !== 65535 ? [{ kind, id, name: String(row[`${kind}Name`] ?? `Spell ${id}`) }] : [];
    })
  }));
}

export async function getAugmentCatalog() {
  return cacheGetOrResolve("aug-bench:catalog:v3", 60, async () => ({
    data: await readAugments(), retrievedAt: new Date().toISOString()
  }));
}
