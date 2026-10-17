// Fabrique l'application installable de TournoiBox (à lancer après `next build`, via `npm run package`).
//
// dist/TournoiBox/                 application prête à l'emploi
//   app/                           serveur Next.js autonome
//   node/node.exe                  Node.js embarqué (celui qui a compilé better-sqlite3 : mêmes versions)
//   launcher.mjs, TournoiBox.vbs   lancement sans fenêtre noire
//   install.ps1, uninstall.ps1, tournoibox.ico, version.txt
// dist/TournoiBox-portable.zip     même contenu, à décompresser n'importe où
// dist/TournoiBox-Setup.exe        installateur (IExpress, fourni avec Windows)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const app = path.join(dist, "TournoiBox");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const standalone = path.join(root, ".next", "standalone");

if (process.platform !== "win32") throw new Error("L'installateur se fabrique sous Windows.");
if (!fs.existsSync(path.join(standalone, "server.js"))) throw new Error("Lancez d'abord `next build` (sortie standalone introuvable).");

const step = (msg) => console.log(`• ${msg}`);
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(app, { recursive: true });

step("Serveur autonome");
fs.cpSync(standalone, path.join(app, "app"), { recursive: true });
fs.cpSync(path.join(root, ".next", "static"), path.join(app, "app", ".next", "static"), { recursive: true });
if (fs.existsSync(path.join(root, "public"))) fs.cpSync(path.join(root, "public"), path.join(app, "app", "public"), { recursive: true });
// Aucune donnée de développement ne doit partir avec l'application
fs.rmSync(path.join(app, "app", "data"), { recursive: true, force: true });
fs.rmSync(path.join(app, "app", ".env"), { force: true });

step(`Node.js ${process.version} embarqué`);
fs.mkdirSync(path.join(app, "node"));
fs.copyFileSync(process.execPath, path.join(app, "node", "node.exe"));

step("Lanceur, installation, icône");
const BOM = "\uFEFF"; // PowerShell 5 lit les scripts sans BOM en ANSI : les accents seraient abîmés
for (const f of ["install.ps1", "uninstall.ps1"]) fs.writeFileSync(path.join(app, f), BOM + fs.readFileSync(path.join(root, "packaging", f), "utf8"));
fs.copyFileSync(path.join(root, "packaging", "launcher.mjs"), path.join(app, "launcher.mjs"));
fs.writeFileSync(path.join(app, "TournoiBox.vbs"), fs.readFileSync(path.join(root, "packaging", "TournoiBox.vbs"), "utf8").replace(/[^\x00-\x7F]/g, "e"));
fs.writeFileSync(path.join(app, "tournoibox.ico"), icon());
fs.writeFileSync(path.join(app, "version.txt"), pkg.version);

step("Archive portable");
const zip = path.join(dist, "TournoiBox-portable.zip");
// tar de Windows (bsdtar), pas celui de Git Bash qui ne sait pas faire de zip
const TAR = path.join(process.env.WINDIR ?? "C:\\Windows", "System32", "tar.exe");
execFileSync(TAR, ["-a", "-c", "-f", zip, "-C", app, "."], { stdio: "inherit" });

step("Installateur");
const setup = path.join(dist, "setup");
fs.mkdirSync(setup);
fs.copyFileSync(zip, path.join(setup, "TournoiBox.zip"));
fs.copyFileSync(path.join(app, "install.ps1"), path.join(setup, "install.ps1"));
fs.writeFileSync(path.join(setup, "install.cmd"), '@powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" -Zip "%~dp0TournoiBox.zip"\r\n');
const exe = path.join(dist, "TournoiBox-Setup.exe");
const sed = [
  "[Version]", "Class=IEXPRESS", "SEDVersion=3",
  "[Options]", "PackagePurpose=InstallApp", "ShowInstallProgramWindow=0", "HideExtractAnimation=1", "UseLongFileName=1", "InsideCompressed=0",
  "CAB_FixedSize=0", "CAB_ResvCodeSigning=0", "RebootMode=N", "InstallPrompt=%InstallPrompt%", "DisplayLicense=%DisplayLicense%",
  "FinishMessage=%FinishMessage%", "TargetName=%TargetName%", "FriendlyName=%FriendlyName%", "AppLaunched=%AppLaunched%",
  "PostInstallCmd=%PostInstallCmd%", "AdminQuietInstCmd=%AdminQuietInstCmd%", "UserQuietInstCmd=%UserQuietInstCmd%", "SourceFiles=SourceFiles",
  "[Strings]", "InstallPrompt=", "DisplayLicense=", "FinishMessage=", `TargetName=${exe}`, `FriendlyName=TournoiBox ${pkg.version}`,
  "AppLaunched=cmd /c install.cmd", "PostInstallCmd=<None>", "AdminQuietInstCmd=", "UserQuietInstCmd=",
  "FILE0=\"TournoiBox.zip\"", "FILE1=\"install.ps1\"", "FILE2=\"install.cmd\"",
  "[SourceFiles]", `SourceFiles0=${setup}\\`,
  "[SourceFiles0]", "%FILE0%=", "%FILE1%=", "%FILE2%=",
].join("\r\n");
fs.writeFileSync(path.join(setup, "setup.sed"), sed);
execFileSync(path.join(process.env.WINDIR ?? "C:\\Windows", "System32", "iexpress.exe"), ["/N", "/Q", path.join(setup, "setup.sed")], { stdio: "inherit" });
if (!fs.existsSync(exe)) throw new Error("IExpress n'a pas produit l'installateur");
fs.rmSync(setup, { recursive: true, force: true });

const mb = (f) => `${(fs.statSync(f).size / 1024 / 1024).toFixed(0)} Mo`;
console.log(`\nTerminé :\n  ${exe} (${mb(exe)})\n  ${zip} (${mb(zip)})`);

/** Icône 64×64 dessinée pixel par pixel : la boîte violette et le trophée vert du logo. */
function icon() {
  const S = 64;
  const px = Buffer.alloc(S * S * 4); // BGRA, de bas en haut
  const put = (x, y, [r, g, b]) => { const i = ((S - 1 - y) * S + x) * 4; px[i] = b; px[i + 1] = g; px[i + 2] = r; px[i + 3] = 255; };
  const purple = [124, 92, 255], lilac = [182, 163, 255], lime = [198, 242, 78], dark = [80, 60, 170];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    // Trophée : coupe arrondie en bas, pied
    const cup = y >= 6 && y <= 18 && x >= 22 && x <= 41 && (y <= 12 || Math.hypot(x - 31.5, y - 12) <= 10);
    const stem = y > 18 && y <= 30 && x >= 29 && x <= 34;
    // Couvercle trapézoïdal puis corps de la boîte
    const lid = y >= 22 && y <= 30 && x >= 12 - (y - 22) * 0.75 && x <= 51 + (y - 22) * 0.75;
    const body = y > 30 && y <= 58 && x >= 6 && x <= 57;
    const slot = y >= 41 && y <= 45 && x >= 19 && x <= 44;
    if (body) put(x, y, slot ? dark : purple);
    else if (lid) put(x, y, lilac);
    if (cup || stem) put(x, y, lime);
  }
  const andMask = Buffer.alloc((S / 8) * S); // tout visible : la transparence vient du canal alpha
  const bmp = Buffer.alloc(40);
  bmp.writeUInt32LE(40, 0); bmp.writeInt32LE(S, 4); bmp.writeInt32LE(S * 2, 8); bmp.writeUInt16LE(1, 12); bmp.writeUInt16LE(32, 14);
  bmp.writeUInt32LE(px.length + andMask.length, 20);
  const image = Buffer.concat([bmp, px, andMask]);
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  header.writeUInt8(S, 6); header.writeUInt8(S, 7); header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
  header.writeUInt32LE(image.length, 14); header.writeUInt32LE(22, 18);
  return Buffer.concat([header, image]);
}
