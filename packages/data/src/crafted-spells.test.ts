import { describe, expect, it } from "vitest";
import { parseVictoriaSpellCraftingSource } from "./crafted-spells";

const sampleSource = `
#:: Scribestones ::#
# 150108 : Minor Scribestone   : 51-52 : 26pp
#:: Energy Focii ::#
# 150113 : Depleted Energy Focus I    : 31pp
#:: Other ::#
# 150123 : Power Amplifier  : 249pp
# 150248 : Power Stabilizer : 50pp
#:: Dropped ::#
# 150600 : Ancient Text (Velious Raid Mobs)

%combines = (
  1 => { "item1" => 150108, "item2" => 150113, "item3" => 150123, "item4" => 15702, "class" => "Bard", "level" => 5152, "reward" => 7706 }, # Battlecry of the Vah Shir
  2 => { "item1" => 150108, "item2" => 150113, "item3" => 150248, "item4" => 15745, "class" => "Shadowknight", "level" => 5960, "reward" => 59001 }, # Aria of Innocence
  3 => { "item1" => 150108, "item2" => 150113, "item3" => 150600, "item4" => 7709, "class" => "Bard", "level" => 65, "reward" => 26622 }, # Ancient: Lcea's Lament
);

sub EVENT_SAY {
}
`;

describe("crafted spell parser", () => {
  it("extracts glossary metadata from the Victoria header comments", () => {
    const parsed = parseVictoriaSpellCraftingSource(sampleSource);
    const scribestone = parsed.glossary.find((entry) => entry.id === 150108);
    const amplifier = parsed.glossary.find((entry) => entry.id === 150123);
    const ancientText = parsed.glossary.find((entry) => entry.id === 150600);

    expect(scribestone).toEqual({
      id: 150108,
      name: "Minor Scribestone",
      section: "Scribestones",
      levelRange: "51-52",
      price: "26pp",
      note: undefined
    });
    expect(amplifier?.price).toBe("249pp");
    expect(ancientText?.note).toBeUndefined();
    expect(ancientText?.name).toBe("Ancient Text (Velious Raid Mobs)");
  });

  it("extracts recipes with normalized class names and reward comments", () => {
    const parsed = parseVictoriaSpellCraftingSource(sampleSource);

    expect(parsed.recipes).toHaveLength(3);
    expect(parsed.recipes[0]).toMatchObject({
      key: 1,
      className: "Bard",
      levelCode: 5152,
      rewardName: "Battlecry of the Vah Shir"
    });
    expect(parsed.recipes[1]).toMatchObject({
      className: "Shadow Knight",
      levelCode: 5960
    });
    expect(parsed.recipes[2]?.itemIds.catalyst).toBe(150600);
  });
});
