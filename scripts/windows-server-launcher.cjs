const fs = require("node:fs");
const path = require("node:path");
const moduleApi = require("node:module");

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

function loadEnvFiles(baseDir) {
  for (const filename of [".env.local", ".env", "env.local", "env"]) {
    const candidate = path.join(baseDir, filename);
    if (!fs.existsSync(candidate)) {
      continue;
    }

    parseEnvFile(fs.readFileSync(candidate, "utf8"));
  }
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

loadEnvFiles(packageRoot);

const currentWorkingDirectory = process.cwd();
if (currentWorkingDirectory !== packageRoot) {
  loadEnvFiles(currentWorkingDirectory);
}

process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.HOSTNAME = process.env.HOSTNAME || process.env.EQ_HOSTNAME || "0.0.0.0";
process.env.PORT = process.env.PORT || process.env.EQ_PORT || "3000";

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
