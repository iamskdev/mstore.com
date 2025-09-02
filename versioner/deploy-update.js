const fs = require("fs");
const path = require("path");
const readline = require("readline");

// --- Load config ---
const configPath = path.join(__dirname, "versioner.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const versionsPath = path.resolve(__dirname, "..", config.updateIn.jsonFile);
const changelogPath = path.resolve(__dirname, "..", config.updateIn.markdownFile);

// --- Helpers ---
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

function nowISO() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function formatIST(dateStr) {
  const dateObj = new Date(dateStr);
  return dateObj.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).replace("am", "AM").replace("pm", "PM") + " IST";
}

// --- CLI helper ---
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
function ask(question) {
  return new Promise((resolve) => rl.question(question, (ans) => resolve(ans.trim())));
}

// --- Update Changelog ---
function updateChangelog(entry) {
  if (!entry) return;

  const commitShort = entry.commitHash
    ? entry.commitHash.slice(0, config.formatting.markdownHash)
    : "N/A";

  const dateStr = formatIST(entry.audit.deployedAt || entry.audit.createdAt);

  let mdBlock = `## Version ${entry.version} | ${entry.environment}\n\n`;
  mdBlock += `**Title:** \`${entry.title}\`\n`;
  mdBlock += `**Date:** ${dateStr}\n`;
  mdBlock += `**VersionId:** \`${entry.versionId}\`\n`;
  mdBlock += `**Commit:** \`${commitShort}\`\n`;
  mdBlock += `**Status:** ✅ Deployed by ${entry.audit.deployedBy}\n\n`;

  if (entry.rollbackPlan) {
    mdBlock += `**Rollback Plan:** ${entry.rollbackPlan}\n\n`;
  }

  if (entry.breakingChanges) {
    mdBlock += `⚠️ **BREAKING CHANGE detected**\n\n`;
  }

  mdBlock += "---\n\n";

  let old = "";
  if (fs.existsSync(changelogPath)) {
    old = fs.readFileSync(changelogPath, "utf-8");
  }
  fs.writeFileSync(changelogPath, mdBlock + old);
  console.log("📘 CHANGELOG.md updated with deployment info");
}

// --- Main ---
(async function main() {
  console.log("🚀 Deployment Updater\n");

  let versions = loadJSON(versionsPath, []);
  if (!versions.length) {
    console.log("❌ No versions found. Run versioner.js first.");
    rl.close();
    return;
  }

  let latest = versions[0];

  if (latest.status !== "pending") {
    console.log(
      `⚠️ Latest version ${latest.version} is not in "pending" state (current=${latest.status}).`
    );
    console.log("👉 Nothing to deploy or already deployed.\n");
    rl.close();
    return;
  }

  console.log(`Latest Version: ${latest.version} [${latest.versionId}]`);
  console.log(`Title: ${latest.title}`);
  console.log(`Environment: ${latest.environment}\n`);

  // --- Inputs ---
  const deployedBy = await ask("Who is deploying? ");
  const rollbackPlan = await ask("Rollback plan (optional): ");

  // --- Update entry ---
  latest.status = "deployed";
  latest.audit.deployedAt = nowISO();
  latest.audit.deployedBy = deployedBy || "System";
  if (rollbackPlan) latest.rollbackPlan = rollbackPlan;

  versions[0] = latest;
  saveJSON(versionsPath, versions);

  // --- Update changelog ---
  updateChangelog(latest);

  console.log("\n✅ Deployment info updated successfully!");
  console.log(`🎉 Version ${latest.version} deployed by ${latest.audit.deployedBy}`);
  console.log(
    "👉 Next step: If version cycle complete, run 'node versioner/config-updater.js' to switch environment."
  );

  rl.close();
})();