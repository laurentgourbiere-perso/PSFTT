// Lanceur de TournoiBox (application installée), exécuté par le Node.js embarqué.
// Démarre le serveur local s'il ne tourne pas déjà, puis ouvre TournoiBox dans le navigateur.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const HOME = path.join(process.env.LOCALAPPDATA || os.homedir(), "TournoiBox");
const DATA = process.env.TOURNOIBOX_DATA || path.join(HOME, "data");
const PORT = 3210;
const URL = `http://localhost:${PORT}`;

fs.mkdirSync(DATA, { recursive: true });
const logFile = path.join(HOME, "tournoibox.log");
const log = (msg) => fs.appendFileSync(logFile, `${new Date().toISOString()} ${msg}\n`);

async function running() {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/api/health`, { signal: AbortSignal.timeout(1500) });
    return (await r.json()).app === "tournoibox";
  } catch {
    return false;
  }
}

function openBrowser() {
  if (process.env.TOURNOIBOX_NO_BROWSER === "1") return; // tests automatiques, ou PC piloté à distance
  spawn("cmd", ["/c", "start", "", URL], { detached: true, stdio: "ignore", windowsHide: true }).unref();
}

function alert(message) {
  const ps = `Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('${message.replace(/'/g, "''")}', 'TournoiBox')`;
  spawn("powershell", ["-NoProfile", "-Command", ps], { detached: true, stdio: "ignore", windowsHide: true }).unref();
}

// Déjà lancé (double-clic sur l'icône) : on rouvre simplement la page
if (await running()) {
  openBrowser();
  process.exit(0);
}

Object.assign(process.env, {
  PORT: String(PORT),
  HOSTNAME: "127.0.0.1",          // jamais accessible depuis le réseau
  NODE_ENV: "production",
  NEXT_TELEMETRY_DISABLED: "1",
  TOURNOIBOX_DATA: DATA,
  TOURNOIBOX_PACKAGED: "1",
});

process.on("uncaughtException", (e) => {
  log(`Erreur : ${e.stack || e}`);
  if (e.code === "EADDRINUSE") alert(`Le port ${PORT} est déjà utilisé par un autre programme. Fermez-le puis relancez TournoiBox.`);
  else alert("TournoiBox n'a pas pu démarrer. Détails dans " + logFile);
  process.exit(1);
});

log(`Démarrage (données : ${DATA})`);
await import(pathToFileURL(path.join(ROOT, "app", "server.js")).href);

for (let i = 0; i < 120; i++) {
  if (await running()) {
    log("Prêt");
    openBrowser();
    break;
  }
  await new Promise((r) => setTimeout(r, 500));
}
