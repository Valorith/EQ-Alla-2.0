import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

function parseArgs(argv) {
  const args = {
    baseUrl: "http://localhost:3000",
    excludeFile: undefined,
    pass: 1,
    sampleSize: 120,
    startIndex: 0,
    totalPasses: 5
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case "--base-url":
        args.baseUrl = next;
        index += 1;
        break;
      case "--pass":
        args.pass = Number(next);
        index += 1;
        break;
      case "--exclude-file":
        args.excludeFile = next;
        index += 1;
        break;
      case "--sample-size":
        args.sampleSize = Number(next);
        index += 1;
        break;
      case "--start-index":
        args.startIndex = Number(next);
        index += 1;
        break;
      case "--total-passes":
        args.totalPasses = Number(next);
        index += 1;
        break;
      default:
        break;
    }
  }

  return args;
}

function excludedIdsFromFile(file) {
  if (!file || !fs.existsSync(file)) {
    return new Set();
  }

  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = Array.isArray(parsed) ? parsed : parsed.sample;
  if (!Array.isArray(rows)) {
    return new Set();
  }

  return new Set(rows.map((row) => Number(row.id)).filter((id) => Number.isFinite(id) && id > 0));
}

function parseEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) {
    return out;
  }

  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }

  return out;
}

function loadEnv() {
  const cwd = process.cwd();
  return {
    ...parseEnvFile(path.join(cwd, "env")),
    ...parseEnvFile(path.join(cwd, ".env")),
    ...parseEnvFile(path.join(cwd, ".env.local")),
    ...process.env
  };
}

function decodeHtml(text) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(text) {
  return decodeHtml(text.replace(/<[^>]*>/g, " "));
}

function extractSpellEffects(html) {
  const sectionMatch = html.match(/Spell Effects<\/h3><\/div><ul[^>]*>(.*?)<\/ul>/s);
  if (!sectionMatch) {
    return [];
  }

  const effects = [];
  for (const match of sectionMatch[1].matchAll(/<li><span[^>]*>(.*?)<\/span><\/li>/g)) {
    const cleaned = stripTags(match[1]);
    if (cleaned) {
      effects.push(cleaned);
    }
  }

  return [...new Set(effects)];
}

function selectSample(ids, pass, sampleSize, totalPasses) {
  const shift = (Math.max(1, pass) - 1) / Math.max(1, totalPasses);
  const sample = [];
  const seen = new Set();

  for (let index = 0; sample.length < sampleSize && index < ids.length * 2; index += 1) {
    const ratio = (index + shift) / sampleSize;
    const sourceIndex = Math.min(ids.length - 1, Math.floor((ratio % 1) * ids.length));
    const id = ids[sourceIndex];
    if (!seen.has(id)) {
      seen.add(id);
      sample.push(id);
    }
  }

  return sample;
}

function hasFallbackEffectText(effectTexts) {
  return effectTexts.some((text) =>
    /\b(?:Effect|Spell|Item) \d+\b/.test(text) ||
    /\brestriction \d+\b/i.test(text)
  );
}

function calculateSpellEffectValue(formula, base, max, tick, level) {
  if (formula === 0) {
    return base;
  }

  if (formula === 100) {
    if (max > 0 && base > max) {
      return max;
    }
    return base;
  }

  let change = 0;

  switch (formula) {
    case 101:
      change = level / 2;
      break;
    case 102:
      change = level;
      break;
    case 103:
      change = level * 2;
      break;
    case 104:
      change = level * 3;
      break;
    case 105:
      change = level * 4;
      break;
    case 107:
      change = -tick;
      break;
    case 108:
      change = -2 * tick;
      break;
    case 109:
      change = level / 4;
      break;
    case 110:
      change = level / 6;
      break;
    case 111:
      if (level > 16) change = (level - 16) * 6;
      break;
    case 112:
      if (level > 24) change = (level - 24) * 8;
      break;
    case 113:
      if (level > 34) change = (level - 34) * 10;
      break;
    case 114:
      if (level > 44) change = (level - 44) * 15;
      break;
    case 115:
      if (level > 15) change = (level - 15) * 7;
      break;
    case 116:
      if (level > 24) change = (level - 24) * 10;
      break;
    case 117:
      if (level > 34) change = (level - 34) * 13;
      break;
    case 118:
      if (level > 44) change = (level - 44) * 20;
      break;
    case 119:
      change = level / 8;
      break;
    case 120:
      change = -5 * tick;
      break;
    case 121:
      change = level / 3;
      break;
    case 122:
      change = -12 * tick;
      break;
    case 123:
      change = (Math.abs(max) - Math.abs(base)) / 2;
      break;
    case 124:
      if (level > 50) change = level - 50;
      break;
    case 125:
      if (level > 50) change = (level - 50) * 2;
      break;
    case 126:
      if (level > 50) change = (level - 50) * 3;
      break;
    case 127:
      if (level > 50) change = (level - 50) * 4;
      break;
    case 128:
      if (level > 50) change = (level - 50) * 5;
      break;
    case 129:
      if (level > 50) change = (level - 50) * 10;
      break;
    case 130:
      if (level > 50) change = (level - 50) * 15;
      break;
    case 131:
      if (level > 50) change = (level - 50) * 20;
      break;
    case 132:
      if (level > 50) change = (level - 50) * 25;
      break;
    case 139:
      if (level > 30) change = (level - 30) / 2;
      break;
    case 140:
      if (level > 30) change = level - 30;
      break;
    case 141:
      if (level > 30) change = (3 * (level - 30)) / 2;
      break;
    case 142:
      if (level > 30) change = 2 * (level - 60);
      break;
    case 143:
      change = (3 * level) / 4;
      break;
    case 3000:
      return base;
    default:
      if (formula > 0 && formula < 1000) {
        change = level * formula;
      }

      if (formula >= 1000 && formula < 2000) {
        change = tick * (formula - 1000) * -1;
      }

      if (formula >= 2000 && formula < 3000) {
        change = level * (formula - 2000);
      }

      if (formula >= 4000 && formula < 5000) {
        change = -tick * (formula - 4000);
      }
      break;
  }

  let value = Math.abs(base) + change;

  if (max !== 0 && value > Math.abs(max)) {
    value = Math.abs(max);
  }

  if (base < 0) {
    value = -value;
  }

  return Math.trunc(value);
}

function hasScaledEffect(row) {
  for (let slot = 1; slot <= 12; slot += 1) {
    const effectId = Number(row[`effectid${slot}`] ?? 254);
    const base = Number(row[`effect_base_value${slot}`] ?? 0);
    const max = Number(row[`max${slot}`] ?? 0);
    const formula = Number(row[`formula${slot}`] ?? 100);

    if (
      effectId <= 0 ||
      effectId === 10 ||
      effectId === 32 ||
      effectId === 109 ||
      effectId === 148 ||
      effectId === 149 ||
      effectId === 254 ||
      base === 0
    ) {
      continue;
    }

    const minimumValue = calculateSpellEffectValue(formula, base, max, 1, 1);
    const maximumValue = calculateSpellEffectValue(formula, base, max, 1, 60);

    if (minimumValue !== maximumValue) {
      return true;
    }
  }

  return false;
}

function hasDisplayableSpellEffect(row) {
  for (let slot = 1; slot <= 12; slot += 1) {
    const effectId = Number(row[`effectid${slot}`] ?? 254);
    const base = Number(row[`effect_base_value${slot}`] ?? 0);
    const formula = Number(row[`formula${slot}`] ?? 100);

    if (effectId <= 0 || effectId === 254) {
      continue;
    }

    if (effectId === 10 && base === 0 && formula === 100) {
      continue;
    }

    return true;
  }

  return false;
}

function missingScalingRange(row, effectTexts) {
  if (!hasScaledEffect(row)) {
    return false;
  }

  return !effectTexts.some((text) => text.includes("(lvl 1)") && text.includes("(lvl 60)"));
}

function unresolvedEffectIds(row, effectTexts) {
  const unresolved = new Set();

  for (const text of effectTexts) {
    for (const match of text.matchAll(/\bEffect (\d+)\b/g)) {
      unresolved.add(Number(match[1]));
    }
  }

  if (unresolved.size > 0) {
    return [...unresolved];
  }

  const directFallback = [];
  for (let slot = 1; slot <= 12; slot += 1) {
    const effectId = Number(row[`effectid${slot}`] ?? 254);
    if (effectId > 0 && effectId !== 254 && effectTexts.some((text) => text.includes(`Effect ${effectId}`))) {
      directFallback.push(effectId);
    }
  }

  return [...new Set(directFallback)];
}

async function fetchSpellPage(baseUrl, spellId) {
  const response = await fetch(`${baseUrl}/spells/${spellId}`);
  return response.text();
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;
      results[current] = await worker(items[current], current);
    }
  }));

  return results;
}

async function main() {
  const args = parseArgs(process.argv);
  const env = loadEnv();

  const connection = await mysql.createConnection({
    database: env.EQ_DB_NAME || env.MYSQLDATABASE,
    host: env.EQ_DB_HOST || env.MYSQLHOST,
    password: env.EQ_DB_PASSWORD || env.MYSQLPASSWORD,
    port: Number(env.EQ_DB_PORT || env.MYSQLPORT || 3306),
    user: env.EQ_DB_USER || env.MYSQLUSER
  });

  const [spellRows] = await connection.query(`
    select id,
           name,
           effectid1, effectid2, effectid3, effectid4, effectid5, effectid6, effectid7, effectid8, effectid9, effectid10, effectid11, effectid12,
           effect_base_value1, effect_base_value2, effect_base_value3, effect_base_value4, effect_base_value5, effect_base_value6,
           effect_base_value7, effect_base_value8, effect_base_value9, effect_base_value10, effect_base_value11, effect_base_value12,
           max1, max2, max3, max4, max5, max6, max7, max8, max9, max10, max11, max12,
           formula1, formula2, formula3, formula4, formula5, formula6, formula7, formula8, formula9, formula10, formula11, formula12
    from spells_new
    where effectid1 <> 254 or effectid2 <> 254 or effectid3 <> 254 or effectid4 <> 254 or effectid5 <> 254 or effectid6 <> 254
       or effectid7 <> 254 or effectid8 <> 254 or effectid9 <> 254 or effectid10 <> 254 or effectid11 <> 254 or effectid12 <> 254
    order by id asc
  `);

  const sampleIds = selectSample(spellRows.map((row) => row.id), args.pass, args.sampleSize, args.totalPasses);
  const excludedIds = excludedIdsFromFile(args.excludeFile);
  const eligibleRows = spellRows.filter((row) => !excludedIds.has(Number(row.id)));
  const eligibleIds = eligibleRows.map((row) => row.id);
  const selectedIds = args.excludeFile
    ? eligibleIds.slice(Math.max(0, args.startIndex), Math.max(0, args.startIndex) + args.sampleSize)
    : sampleIds;
  const sampledRows = selectedIds.map((id) => eligibleRows.find((row) => row.id === id) ?? spellRows.find((row) => row.id === id)).filter(Boolean);

  const audits = await mapWithConcurrency(sampledRows, 8, async (row) => {
    const html = await fetchSpellPage(args.baseUrl, row.id);
    const effectTexts = extractSpellEffects(html);
    const issues = [];

    if (effectTexts.length === 0 && hasDisplayableSpellEffect(row)) {
      issues.push("missing_effect_section");
    }
    if (hasFallbackEffectText(effectTexts)) {
      issues.push("fallback_text");
    }
    if (missingScalingRange(row, effectTexts)) {
      issues.push("missing_scaling_range");
    }

    return {
      effectTexts,
      id: row.id,
      issues,
      name: row.name,
      unresolvedEffectIds: unresolvedEffectIds(row, effectTexts)
    };
  });

  const failures = audits.filter((audit) => audit.issues.length > 0);
  const issueCounts = new Map();
  const unresolvedEffectCounts = new Map();

  for (const failure of failures) {
    for (const issue of failure.issues) {
      issueCounts.set(issue, (issueCounts.get(issue) ?? 0) + 1);
    }
    for (const effectId of failure.unresolvedEffectIds) {
      unresolvedEffectCounts.set(effectId, (unresolvedEffectCounts.get(effectId) ?? 0) + 1);
    }
  }

  const passRate = sampledRows.length === 0
    ? 100
    : Number((((sampledRows.length - failures.length) / sampledRows.length) * 100).toFixed(2));

  console.log(JSON.stringify({
    excludedCount: excludedIds.size,
    pass: args.pass,
    passRate,
    sampleSize: sampledRows.length,
    failures: failures.length,
    issueCounts: Object.fromEntries([...issueCounts.entries()].sort((a, b) => b[1] - a[1])),
    topUnresolvedEffectIds: [...unresolvedEffectCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([effectId, count]) => ({ count, effectId })),
    sample: audits.map((audit) => ({
      id: audit.id,
      issues: audit.issues,
      name: audit.name,
      texts: audit.effectTexts,
      unresolvedEffectIds: audit.unresolvedEffectIds
    }))
  }, null, 2));

  await connection.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
