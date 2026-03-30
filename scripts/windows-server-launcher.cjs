const fs = require("node:fs");
const path = require("node:path");
const moduleApi = require("node:module");
const defaultEnvTemplate = `EQ_USE_MOCK_DATA=false
EQ_SITE_NAME=EQ Alla 2.0
EQ_SITE_URL=https://eqalla.example.com
EQ_SITE_HOST=eqalla.example.com
PORT=3000

EQ_DB_HOST=127.0.0.1
EQ_DB_PORT=3306
EQ_DB_NAME=peq
EQ_DB_USER=app_user
EQ_DB_PASSWORD=change-me

EQ_REDIS_URL=redis://redis:6379
`;

function parseEnvFile(contents) {
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function findEnvFile(baseDir) {
  for (const filename of [".env.local", ".env", "env.local", "env"]) {
    const candidate = path.join(baseDir, filename);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function loadEnvFiles(baseDir) {
  for (const filename of [".env.local", ".env", "env.local", "env"]) {
    const candidate = path.join(baseDir, filename);
    if (!fs.existsSync(candidate)) {
      continue;
    }

    parseEnvFile(fs.readFileSync(candidate, "utf8"));
  }
}

function ensureEnvFile(baseDir) {
  const existing = findEnvFile(baseDir);
  if (existing) {
    return existing;
  }

  const templatePath = path.join(baseDir, ".env.example");
  const envPath = path.join(baseDir, ".env");
  const contents = fs.existsSync(templatePath)
    ? fs.readFileSync(templatePath, "utf8")
    : defaultEnvTemplate;

  fs.writeFileSync(envPath, contents, "utf8");
  return null;
}

function resolvePackageRoot() {
  if (process.env.EQ_PACKAGE_ROOT) {
    return path.resolve(process.env.EQ_PACKAGE_ROOT);
  }

  if (process.execPath.toLowerCase().endsWith(".exe")) {
    return path.dirname(process.execPath);
  }

  return path.resolve(__dirname, "..", "dist", "windows-server");
}

const packageRoot = resolvePackageRoot();
const runtimeRoot = path.join(packageRoot, "runtime");
const serverPath = path.join(runtimeRoot, "apps", "web", "server.js");
const currentWorkingDirectory = process.cwd();
const createdEnvFromTemplate = !ensureEnvFile(packageRoot);

loadEnvFiles(packageRoot);

if (currentWorkingDirectory !== packageRoot) {
  loadEnvFiles(currentWorkingDirectory);
}

process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.HOSTNAME = process.env.HOSTNAME || process.env.EQ_HOSTNAME || "0.0.0.0";
process.env.PORT = process.env.PORT || process.env.EQ_PORT || "3000";

if (createdEnvFromTemplate) {
  console.log("EQ Alla 2.0");
  console.log(`Created ${path.join(packageRoot, ".env")} from the bundled example.`);
  console.log("Update the database and site settings in that file, then run the launcher again.");
  process.exit(0);
}

if (!fs.existsSync(serverPath)) {
  console.error("EQ Alla 2.0 runtime was not found.");
  console.error(`Expected server entrypoint: ${serverPath}`);
  process.exit(1);
}

console.log("EQ Alla 2.0");
console.log(`Serving from ${packageRoot}`);
console.log(`Listening on http://${process.env.HOSTNAME}:${process.env.PORT}`);

process.chdir(runtimeRoot);
const runtimeRequire = moduleApi.createRequire(serverPath);
runtimeRequire(serverPath);
