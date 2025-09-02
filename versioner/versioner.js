const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// --- Load config ---
const configPath = path.join(__dirname, "versioner.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const { versioning, formatting, updateIn, meta } = config;

// --- Helper: sequential VersionId generator ---
function generateVersionId(prefix, versions) {
  if (!versions.length) return `${prefix}0000001`;
  const lastId = versions[0].versionId || `${prefix}0000000`;
  const num = parseInt(lastId.replace(prefix, ""), 10) + 1;
  return `${prefix}${num.toString().padStart(7, "0")}`;
}

// --- Helper: bump version ---
function bumpVersion(current, type, scheme) {
  let [major, minor, patch] = current.split(".").map(Number);

  if (scheme === "major.minor.patch") {
    if (type === "major") {
      major++;
      minor = 0;
      patch = 0;
    } else {
      patch++;
      if (patch > 9) {
        patch = 0;
        minor++;
        if (minor > 9) {
          minor = 0;
          major++;
        }
      }
    }
  }
  return `${major}.${minor}.${patch}`;
}

// --- Helper: get last commit info ---
function getLastCommit() {
  try {
    // Use git show to get the commit message of the current HEAD
    const message = execSync("git show -s --format=%B HEAD").toString().trim();
    const hash = execSync("git rev-parse HEAD").toString().trim();
    return { message, hash };
  } catch (e) {
    // Fallback for when HEAD might not be available (e.g., initial commit)
    // In pre-commit hook, HEAD might not be updated yet.
    // Let's try to get the message from the .git/COMMIT_EDITMSG file
    try {
      const commitMsgFile = path.join(execSync("git rev-parse --git-dir").toString().trim(), "COMMIT_EDITMSG");
      const messageFromFile = fs.readFileSync(commitMsgFile, "utf-8").trim();
      return { message: messageFromFile, hash: "N/A" }; // Hash might not be available yet
    } catch (fileError) {
      return { message: "N/A", hash: "N/A" };
    }
  }
}

// --- Helper: detect bump type ---
function getBumpType(commitMessage) {
  console.log(`DEBUG: getBumpType - commitMessage: ${commitMessage}`); // Added log
  if (/^revert:/i.test(commitMessage)) {
    console.log("DEBUG: getBumpType - returning rollback"); // Added log
    return "rollback";
  }
  if (/BREAKING CHANGE/i.test(commitMessage)) {
    console.log("DEBUG: getBumpType - returning major"); // Added log
    return "major"; // 🚨 only case for major
  }
  if (/^(feat|fix|refactor|perf|improve):/i.test(commitMessage)) {
    console.log("DEBUG: getBumpType - returning patch"); // Added log
    return "patch";
  }
  console.log("DEBUG: getBumpType - returning null (skip)"); // Added log
  return null; // skip docs, style, chore, test
}

// --- Helper: get current ISO time ---
function nowISO() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

// --- Helper: format IST date ---
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

// --- Update versions.json ---
function updateJsonFile(commit) {
  const jsonFile = path.resolve(__dirname, "..", updateIn.jsonFile);
  let versions = [];
  if (fs.existsSync(jsonFile)) {
    versions = JSON.parse(fs.readFileSync(jsonFile, "utf-8"));
  }

  const last = versions[0];
  const bumpType = getBumpType(commit.message);

  if (!bumpType) {
    console.log("ℹ️ No version bump needed for this commit type");
    return null;
  }

  // --- Rollback case ---
  if (bumpType === "rollback") {
    if (!versioning.allowRollback) {
      console.log("❌ Rollback attempt detected but not allowed by config");
      return null;
    }

    if (!last) {
      console.log("⚠️ No previous version to rollback");
      return null;
    }

    last.status = "reverted";
    last.audit.rollbackAt = nowISO();
    last.audit.rollbackBy = config.audit.createdBy || "System";

    fs.writeFileSync(jsonFile, JSON.stringify(versions, null, 2));
    console.log(`🔄 Rollback applied → ${last.version} [${last.versionId}]`);

    return { ...last, rollback: true };
  }

  // --- Normal bump case ---
  const newVersion = bumpVersion(
    last ? last.version : versioning.startVersion,
    bumpType,
    versioning.scheme
  );

  const newEntry = {
    title: commit.message.split("\n")[0] || "Auto bump version",
    commitHash: commit.hash,
    version: newVersion,
    versionId: generateVersionId(versioning.idPrefix, versions),
    environment: meta.environment,
    releaseChannel: meta.releaseChannel,
    status: "pending",
    tags: [],
    tickets: [],
    breakingChanges: /BREAKING CHANGE/i.test(commit.message),
    rollbackPlan: "",
    added: [],
    fixed: [],
    improved: [],
    notes: [],
    audit: {
      createdBy: config.audit.createdBy || "System",
      createdAt: nowISO(),
      verifiedBy: null,
      verificationDate: null,
      deployedAt: null,
      deployedBy: null,
    },
  };

  versions.unshift(newEntry);
  fs.writeFileSync(jsonFile, JSON.stringify(versions, null, 2));
  console.log("✅ versions.json updated");

  return newEntry;
}

// --- Update CHANGELOG.md ---
function updateMarkdown(entry) {
  if (!entry) return;

  const mdFile = path.resolve(__dirname, "..", updateIn.markdownFile);

  const commitShort = entry.commitHash
    ? entry.commitHash.slice(0, formatting.markdownHash)
    : "N/A";

  const dateStr = formatIST(entry.audit.createdAt || nowISO());

  let mdBlock = `## Version ${entry.version} | ${entry.environment}\n\n`;
  mdBlock += `**Title:** \`${entry.title}\`\n`;
  mdBlock += `**Date:** ${dateStr}\n`;
  mdBlock += `**VersionId:** \`${entry.versionId}\`\n`;
  mdBlock += `**Commit:** \`${commitShort}\`\n\n`;

  if (entry.breakingChanges) {
    mdBlock += `⚠️ **BREAKING CHANGE detected**\n\n`;
  }
  if (entry.rollback) {
    mdBlock += `🔄 **Rollback applied to this version**\n\n`;
  }

  mdBlock += "---\n\n";

  let old = "";
  if (fs.existsSync(mdFile)) {
    old = fs.readFileSync(mdFile, "utf-8");
  }
  fs.writeFileSync(mdFile, mdBlock + old);
  console.log("✅ CHANGELOG.md updated");
}

// --- Main ---
(function main() {
  const commit = getLastCommit();
  const newEntry = updateJsonFile(commit);

  if (newEntry) {
    updateMarkdown(newEntry);
    if (newEntry.rollback) {
      console.log(`✅ Rollback recorded for ${newEntry.version}`);
    } else {
      console.log(
        `🎉 Version bumped to ${newEntry.version} [${newEntry.versionId}]`
      );
    }
  } else {
    console.log("✅ Commit did not trigger version bump");
    process.exit(0); // Exit successfully if no bump
  }
})();