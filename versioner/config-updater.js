const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// --- Load Config ---
const configPath = path.join(__dirname, "versioner.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const { versioning, formatting, updateIn, meta } = config;

// --- Helper: Load/Save JSON ---
function loadJSON(file, fallback = []) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
  } catch (e) {
    console.error(`❌ Failed to read ${file}:`, e.message);
  }
  return fallback;
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// --- Helper: Version ID generator ---
function generateVersionId(prefix, versions) {
  if (!versions.length) return `${prefix}0000001`;
  const lastId = versions[0].versionId || `${prefix}0000000`;
  const num = parseInt(lastId.replace(prefix, ""), 10) + 1;
  return `${prefix}${num.toString().padStart(7, "0")}`;
}

// --- Helper: bump version ---
function bumpVersion(current, type) {
  let [major, minor, patch] = current.split(".").map(Number);

  if (type === "major") {
    major++;
    minor = 0;
    patch = 0;
  } else {
    patch++; // ✅ always patch bump otherwise
  }

  return `${major}.${minor}.${patch}`;
}

// --- Helper: Get last commit ---
function getLastCommit() {
  try {
    const message = execSync("git log -1 --pretty=%B").toString().trim();
    const hash = execSync("git rev-parse HEAD").toString().trim();
    return { message, hash };
  } catch {
    return { message: "N/A", hash: "N/A" };
  }
}

// --- Commit Type → bump/skip ---
function getBumpType(commitMessage) {
  if (/BREAKING CHANGE/i.test(commitMessage)) return "major";

  if (/^(feat|fix|improve|refactor|test)(\(.+\))?:/i.test(commitMessage)) {
    return "patch";
  }

  if (/^(docs|chore|style)(\(.+\))?:/i.test(commitMessage)) {
    return "skip";
  }

  return "patch"; // fallback
}

// --- Format Date ---
function formatIST(dateStr) {
  const dateObj = new Date(dateStr);
  let formatted = dateObj.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return formatted.replace("am", "AM").replace("pm", "PM") + " IST";
}
function nowISO() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

// --- Update versions.json ---
function updateJsonFile(commit, bumpType) {
  const jsonFile = path.resolve(__dirname, "..", updateIn.jsonFile);
  let versions = loadJSON(jsonFile);

  const last = versions[0];
  const currentVersion = last ? last.version : versioning.startVersion;

  // cycle complete check
  if (currentVersion === versioning.maxVersion) {
    console.log(
      `🎯 Version cycle complete (${versioning.maxVersion})!\n👉 Run "node versioner/config-updater.js" to switch environment.`
    );
    process.exit(1); // ❌ block commit
  }

  if (bumpType === "skip") {
    console.log(`ℹ️ Commit type = docs/chore → Version bump skipped`);
    return null;
  }

  const newVersion = bumpVersion(currentVersion, bumpType);

  const newEntry = {
    title: commit.message.split("\n")[0] || "Auto bump version",
    commitHash: commit.hash,
    version: newVersion,
    versionId: generateVersionId(versioning.idPrefix, versions),
    environment: meta.environment,
    releaseChannel: meta.releaseChannel,
    status: "pending",
    breakingChanges: bumpType === "major",
    audit: {
      createdBy: config.audit.createdBy || "System",
      createdAt: nowISO(),
    },
  };

  versions.unshift(newEntry);
  saveJSON(jsonFile, versions);
  console.log("✅ versions.json updated");

  return newEntry;
}

// --- Update CHANGELOG.md ---
function updateMarkdown(newEntry) {
  if (!newEntry) return;
  const mdFile = path.resolve(__dirname, "..", updateIn.markdownFile);

  const commitShort = newEntry.commitHash
    ? newEntry.commitHash.slice(0, formatting.markdownHash)
    : "N/A";

  const dateStr = formatIST(newEntry.audit.createdAt);

  let mdBlock = `## Version ${newEntry.version} | ${newEntry.environment}\n\n`;
  mdBlock += `**Title:** \`${newEntry.title}\`\n`;
  mdBlock += `**Date:** ${dateStr}\n`;
  mdBlock += `**VersionId:** \`${newEntry.versionId}\`\n`;
  mdBlock += `**Commit:** \`${commitShort}\`\n\n`;

  if (newEntry.breakingChanges) {
    mdBlock += `🚨 **BREAKING CHANGE detected**\n\n`;
  }

  mdBlock += "---\n\n";

  let old = "";
  if (fs.existsSync(mdFile)) {
    old = fs.readFileSync(mdFile, "utf-8");
  }
  fs.writeFileSync(mdFile, mdBlock + old);
  console.log("✅ CHANGELOG.md updated");
}

// --- Update Service Worker ---
function updateServiceWorker(newEntry) {
  if (!newEntry) return;

  const swPath = path.resolve(__dirname, "..", updateIn.swFile.file);
  if (!fs.existsSync(swPath)) {
    console.log("⚠️ Service worker not found → skipped");
    return;
  }

  let swContent = fs.readFileSync(swPath, "utf-8");
  swContent = swContent.replace(
    new RegExp(`${updateIn.swFile.versionKey}\\s*=.*`, "g"),
    `${updateIn.swFile.versionKey} = "${newEntry.version}";`
  );
  swContent = swContent.replace(
    new RegExp(`${updateIn.swFile.environmentKey}\\s*=.*`, "g"),
    `${updateIn.swFile.environmentKey} = "${newEntry.environment}";`
  );
  fs.writeFileSync(swPath, swContent);
  console.log("✅ service-worker.js updated");
}

// --- Main ---
(function main() {
  const commit = getLastCommit();
  const bumpType = getBumpType(commit.message);
  const newEntry = updateJsonFile(commit, bumpType);

  if (newEntry) {
    updateMarkdown(newEntry);
    updateServiceWorker(newEntry);
    console.log(
      `🎉 Version bumped to ${newEntry.version} [${newEntry.versionId}]`
    );
  }
})();