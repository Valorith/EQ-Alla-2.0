import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const webRoot = path.join(repoRoot, "apps", "web");
const standaloneRoot = path.join(webRoot, ".next", "standalone");
const staticSourceRoot = path.join(webRoot, ".next", "static");
const publicSourceRoot = path.join(webRoot, "public");
const launcherSource = path.join(repoRoot, "scripts", "windows-server-launcher.cjs");
const distRoot = path.join(repoRoot, "dist", "windows-server");
const runtimeRoot = path.join(distRoot, "runtime");
const staticTargetRoot = path.join(runtimeRoot, "apps", "web", ".next", "static");
const publicTargetRoot = path.join(runtimeRoot, "apps", "web", "public");
const envExampleSource = path.join(repoRoot, ".env.example");
const envExampleTarget = path.join(distRoot, ".env.example");
const launcherScriptTarget = path.join(distRoot, "launcher.cjs");
const notesTarget = path.join(distRoot, "README.txt");
const seaConfigTarget = path.join(distRoot, "sea-config.json");
const exeTarget = path.join(distRoot, "EQ-Alla-2.0-Server.exe");

function runCommand(command, args) {
  execFileSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit"
  });
}

async function writeNotes() {
  const lines = [
    "EQ Alla 2.0 Windows Server Package",
    "",
    "1. Copy .env.example to .env, or place an env/.env file in this folder.",
    "2. Update the DB connection values and public site URL.",
    "3. Run EQ-Alla-2.0-Server.exe.",
    "",
    "The server reads env files from this folder first, then from the current working directory.",
    "Default listener: http://0.0.0.0:3000"
  ];

  await fs.writeFile(notesTarget, `${lines.join("\n")}\n`, "utf8");
}

async function buildRuntimePackage() {
  runCommand(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build", "-w", "@eq-alla/web"]);

  await fs.rm(distRoot, { recursive: true, force: true });
  await fs.mkdir(distRoot, { recursive: true });
  await fs.cp(standaloneRoot, runtimeRoot, { recursive: true });
  await fs.cp(staticSourceRoot, staticTargetRoot, { recursive: true, force: true });
  await fs.cp(publicSourceRoot, publicTargetRoot, { recursive: true, force: true });
  await fs.copyFile(envExampleSource, envExampleTarget);
  await fs.copyFile(launcherSource, launcherScriptTarget);
  await writeNotes();
}

async function buildWindowsExecutable() {
  const seaConfig = {
    main: launcherSource,
    output: exeTarget,
    mainFormat: "commonjs",
    disableExperimentalSEAWarning: true
  };

  await fs.writeFile(seaConfigTarget, JSON.stringify(seaConfig, null, 2), "utf8");
  runCommand(process.execPath, ["--experimental-sea-config", seaConfigTarget]);
  await fs.rm(seaConfigTarget, { force: true });
}

await buildRuntimePackage();

if (process.platform === "win32") {
  await buildWindowsExecutable();
  console.log(`\nWindows package ready at ${distRoot}`);
  console.log(`Executable: ${exeTarget}`);
} else {
  console.log(`\nWindows runtime package ready at ${distRoot}`);
  console.log("Run this same command on a Windows machine to generate EQ-Alla-2.0-Server.exe.");
}
