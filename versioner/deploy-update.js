const fs = require("fs");
const path = require("path");

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

// --- Update Deployment Changelog ---
function updateChangelog(deployedVersions, deployedBy, rollbackPlan) {
  if (!deployedVersions.length) return;

  const dateStr = formatIST(deployedVersions[0].audit.deployedAt);

  let mdBlock = `## Deployment Update\n\n`;
  mdBlock += `**Status:** ✅ Deployed by ${deployedBy}\n`;
  mdBlock += `**Deployed At:** ${dateStr}\n\n`;

  if (rollbackPlan) {
    mdBlock += `**Rollback Plan:** ${rollbackPlan} (added ${dateStr})\n\n`;
  }

  mdBlock += `**Included Versions:**\n`;
  deployedVersions.forEach(v => {
    if (v.status === "reverted") {
      mdBlock += `- ${v.version} [${v.versionId}] - ❌ Reverted (${v.title})\n`;
    } else {
      mdBlock += `- ${v.version} [${v.versionId}] - ${v.title}\n`;
    }
  });

  mdBlock += "\n---\n\n";

  let old = "";
  if (fs.existsSync(changelogPath)) {
    old = fs.readFileSync(changelogPath, "utf-8");
  }
  fs.writeFileSync(changelogPath, mdBlock + old);

  console.log("📘 CHANGELOG.md updated with deployment info");
}

// --- Main ---
(function main() {
  console.log("🚀 Deployment Updater\n");

  let versions = loadJSON(versionsPath, []);
  if (!versions.length) {
    console.log("❌ No versions found. Run versioner.js first.");
    return;
  }

  // --- Inputs from command line arguments ---
  const deployedBy = process.argv[2] || config.updateIn.updaterName || "System (Automated)";
  const rollbackPlan = process.argv[3] || "";

  // --- Filter pending versions ---
  const pendingVersions = versions.filter(v => v.status === "pending");

  if (!pendingVersions.length) {
    console.log("👉 No pending versions to deploy.\n");
    return;
  }

  console.log(`Found ${pendingVersions.length} pending versions to deploy...\n`);

  // --- Update all pending versions ---
  pendingVersions.forEach(v => {
    v.status = "deployed";
    v.audit.deployedAt = nowISO();
    v.audit.deployedBy = deployedBy;
    if (rollbackPlan) v.rollbackPlan = rollbackPlan;
  });

  // Save updated versions.json
  saveJSON(versionsPath, versions);

// --- Update changelog with all deployed versions ---
  updateChangelog(pendingVersions, deployedBy, rollbackPlan);

  // Check if repo has any reverted versions in history
  if (versions.some(v => v.status === "reverted")) {
  console.log("⚠️ Some versions in history were marked as reverted.");
  fs.appendFileSync(changelogPath, `⚠️ Note: Some versions in history were reverted.\n\n`);
}

  console.log("\n✅ Deployment info updated successfully!");
  console.log(`🎉 ${pendingVersions.length} version(s) deployed by ${deployedBy}`);
})();