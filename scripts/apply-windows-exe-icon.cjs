const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

async function applyWindowsExeIcon(context) {
  if (context.electronPlatformName !== "win32") {
    return;
  }

  const projectDir = context.packager.projectDir;
  const productFilename = context.packager.appInfo.productFilename;
  const exePath = path.join(context.appOutDir, `${productFilename}.exe`);
  const iconPath = path.join(projectDir, "build-resources", "icon.ico");
  const rceditPath = path.join(projectDir, "node_modules", "electron-winstaller", "vendor", "rcedit.exe");

  for (const requiredPath of [exePath, iconPath, rceditPath]) {
    if (!fs.existsSync(requiredPath)) {
      throw new Error(`Missing file for Windows icon patch: ${requiredPath}`);
    }
  }

  execFileSync(rceditPath, [
    exePath,
    "--set-icon",
    iconPath,
    "--set-version-string",
    "FileDescription",
    context.packager.appInfo.productName,
    "--set-version-string",
    "ProductName",
    context.packager.appInfo.productName,
    "--set-version-string",
    "InternalName",
    productFilename,
    "--set-version-string",
    "OriginalFilename",
    `${productFilename}.exe`
  ], { stdio: "inherit" });
}

module.exports = applyWindowsExeIcon;
module.exports.default = applyWindowsExeIcon;
