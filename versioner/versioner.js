const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// --- Load config ---
const configPath = path.join(__dirname, "versioner.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const { versioning, formatting, updateIn, meta } = config;

// --- Helper: sequential VersionId generator ---
function generateVersionId(prefix, versions) {
  if (!versions.length) return `${prefix}000000000001`;
  const lastId = versions[0].versionId || `${prefix}000000000000`;
  const num = parseInt(lastId.replace(prefix, ""), 10) + 1;
  return `${prefix}${num.toString().padStart(12, "0")}`;
}

// --- Helper: bump version (SemVer compliant) ---
function bumpVersion(current, type) {
  let [major, minor, patch] = current.split(".").map(Number);
  switch (type) {
    case "major": major++; minor = 0; patch = 0; break;
    case "minor": minor++; patch = 0; break;
    case "patch": patch++; break;
  }
  return `${major}.${minor}.${patch}`;
}

// --- Helper: Git Data Collection ---
function getCommitDetails(forHash = "HEAD") {
  try {
    const delimiter = "--GIT-DELIMITER--";
    const format = ["%H", "%h", "%an", "%ae", "%d"].join(delimiter);
    const gitOutput = execSync(`git show -s --format="${format}" ${forHash}`).toString().trim();
    const [longHash, shortHash, authorName, authorEmail, refs] = gitOutput.split(delimiter);

    const remoteUrl = execSync("git config --get remote.origin.url").toString().trim().replace(/\.git$/, '');
    const branchName = (refs.match(/\(HEAD -> ([^,)]+)/) || [])[1] || null;
    const branchUrl = branchName ? `${remoteUrl}/tree/${branchName}` : null;
    const commitUrl = `${remoteUrl}/commit/${longHash}`;

    const message = execSync(`git show -s --format=%B ${forHash}`).toString().trim();

    return {
      message,
      hash: { long: longHash, short: shortHash, url: commitUrl },
      author: { name: authorName, email: authorEmail },
      branch: { name: branchName, url: branchUrl },
    };
  } catch (e) {
    try {
      const commitMsgFile = path.join(execSync("git rev-parse --git-dir").toString().trim(), "COMMIT_EDITMSG");
      return { message: fs.readFileSync(commitMsgFile, "utf-8").trim(), hash: {}, author: {}, branch: {} };
    } catch (fileError) {
      return { message: "N/A", hash: {}, author: {}, branch: {} };
    }
  }
}

// --- Helper: detect bump type (SemVer compliant) ---
function getBumpType(commitMessage) {
  const firstLine = commitMessage.split("\n")[0].trim();
  const body = commitMessage.split("\n").slice(1).join("\n");

  if (/^revert[: ]/i.test(firstLine)) return "revert";
  if (/BREAKING CHANGE/.test(body) || /!/.test(firstLine.split(":")[0])) return "major";
  if (/^feat[:(]/i.test(firstLine)) return "minor";
  if (/^(fix|perf|refactor|docs|style|chore|test)[:(]/i.test(firstLine)) return "patch";
  return null;
}

// --- Helper: Parse details from commit body (SemVer compliant) ---
function parseCommitBody(commitMessage) {
  const lines = commitMessage.split("\n");
  const firstLine = lines[0].trim();
  const bodyLines = lines.slice(1);

  const details = {
    type: null, scope: null, subject: firstLine,
    changes: { added: [], fixed: [], improved: [] },
    breakingChanges: [], notes: [], tags: [], tickets: [], revertedCommit: null,
  };

  const commitRegex = /^(?<type>\w+)(?:\((?<scope>.*)\))?!?: (?<subject>.*)$/i;
  const match = firstLine.match(commitRegex);
  if (match && match.groups) {
    details.type = match.groups.type.toLowerCase();
    details.scope = match.groups.scope || null;
    details.subject = match.groups.subject;
  }

  const revertMatch = bodyLines.join('\n').match(/This reverts commit (\w+)\./);
  if (revertMatch) details.revertedCommit = revertMatch[1];

  const keyValueRegex = /^-?\s*([a-zA-Z]+):\s*(.*)/i;
  const sectionRegex = /^(Added|Fixed|Improved):\s*$/i; // Regex to identify sections
  let currentSection = null; // To keep track of the current section

  for (const line of bodyLines) {
    const clean = line.trim();

    const sectionMatch = clean.match(sectionRegex);
    if (sectionMatch) {
      currentSection = sectionMatch[1].toLowerCase(); // Set current section
      continue; // Process next line after finding a section header
    }

    if (!clean) {
      // If it's an empty line, and we have an active section,
      // we don't reset currentSection.
      // If it's an empty line and no active section, it's just a separator.
      continue;
    }

    const kvMatch = clean.match(keyValueRegex);
    if (kvMatch) {
      const key = kvMatch[1].toLowerCase();
      const value = kvMatch[2].trim();
      if (['ticket', 'tickets'].includes(key)) details.tickets.push(...value.split(',').map(t => t.trim()));
      else if (['tag', 'tags'].includes(key)) details.tags.push(...value.split(',').map(t => t.trim()));
      else if (['note', 'notes'].includes(key)) details.notes.push(value);
    } else if (clean.startsWith('- ')) {
      // If a bullet point and a section is active, add to that section
      if (currentSection && details.changes[currentSection]) {
        details.changes[currentSection].push(clean.substring(2).trim());
      }
      else {
        // Fallback if no section is active, use commit type or default 'improved'
        let fallbackListKey = 'improved';
        if (details.type === 'feat') fallbackListKey = 'added';
        if (details.type === 'fix') fallbackListKey = 'fixed';
        if (!details.changes[fallbackListKey]) details.changes[fallbackListKey] = [];
        details.changes[fallbackListKey].push(clean.substring(2).trim());
      }
    }
  }

  const breakingChangeMatch = bodyLines.join('\n').match(/BREAKING CHANGE: (.*)/);
  if (breakingChangeMatch) details.breakingChanges.push(breakingChangeMatch[1]);

  return details;
}

// --- Helper: get current ISO time & format IST date ---
const nowISO = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const formatIST = (dateStr) => new Date(dateStr).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }).replace("am", "AM").replace("pm", "PM") + " IST";

// --- Update versions.json ---
function updateJsonFile(commitDetails) {
  const jsonFile = path.resolve(__dirname, "..", updateIn.jsonFile);
  let versions = fs.existsSync(jsonFile) ? JSON.parse(fs.readFileSync(jsonFile, "utf-8")) : [];

  if (versions.some(v => v.commit && v.commit.hash && v.commit.hash.long === commitDetails.hash.long)) {
    console.log("⏩ Commit already exists in versions.json, skipping.");
    return null;
  }

  const bumpType = getBumpType(commitDetails.message);
  if (!bumpType) {
    console.log("ℹ️ No version bump needed for this commit type.");
    return null;
  }

  const parsedBody = parseCommitBody(commitDetails.message);
  const lastEntry = versions.length > 0 ? versions[0] : null;
  let lastVersion = versioning.startVersion;
  if (lastEntry) {
    lastVersion = (typeof lastEntry.version === 'object' && lastEntry.version.new) ? lastEntry.version.new : lastEntry.version;
  }

  const newVersion = bumpVersion(lastVersion, bumpType === 'revert' ? 'patch' : bumpType);
  
  const newEntry = {
    version: { new: newVersion, old: lastVersion, bump: bumpType === 'revert' ? 'patch' : bumpType },
    versionId: generateVersionId(versioning.idPrefix, versions),
    commit: {
        hash: commitDetails.hash,
        author: commitDetails.author,
        branch: commitDetails.branch,
    },
    type: parsedBody.type,
    scope: parsedBody.scope,
    subject: parsedBody.subject,
    revertedCommit: parsedBody.revertedCommit,
    changes: parsedBody.changes,
    breakingChanges: parsedBody.breakingChanges,
    notes: parsedBody.notes,
    tags: parsedBody.tags,
    tickets: parsedBody.tickets,
    metadata: { environment: meta.environment, releaseChannel: meta.releaseChannel },
    status: bumpType === 'revert' ? 'reverted' : 'pending',
    audit: { createdBy: config.audit.createdBy || "System", createdAt: nowISO() },
  };

  if (bumpType === 'revert') {
    newEntry.audit.revertedAt = nowISO();
    newEntry.audit.revertedBy = config.audit.createdBy || "System";
  } else {
    newEntry.audit.deployedAt = null;
    newEntry.audit.deployedBy = null;
  }

  versions.unshift(newEntry);
  fs.writeFileSync(jsonFile, JSON.stringify(versions, null, 2));
  console.log(`✅ versions.json updated for ${bumpType}.`);
  return newEntry;
}

// --- Update CHANGELOG.md ---
function updateMarkdown(entry) {
  if (!entry) return;
  const mdFile = path.resolve(__dirname, "..", updateIn.markdownFile);
  let old = fs.existsSync(mdFile) ? fs.readFileSync(mdFile, "utf-8") : "";
  const commitShort = entry.commit.hash.short;
  const commitUrl = entry.commit.hash.url;

  

  const dateStr = formatIST(entry.audit.createdAt);
  let mdBlock = `## Version ${entry.version.new} | ${entry.metadata.environment}

`;
  mdBlock += `**Type**: [${entry.type}]
`;
  mdBlock += `**Author**: [${entry.commit.author.name}]
`;
  mdBlock += `**Sort Hash**: [${commitShort}]
`;
  if(entry.commit.branch && entry.commit.branch.name) {
    mdBlock += `**Branch**: [${entry.commit.branch.url}]
`;
  }
  mdBlock += `**Date**: [${dateStr}]

`;

  const changeTypes = { added: "### Added", fixed: "### Fixed", improved: "### Improved" };
  for (const [key, header] of Object.entries(changeTypes)) {
    if (entry.changes[key] && entry.changes[key].length > 0) {
      mdBlock += `${header}\n`;
      entry.changes[key].forEach(item => { mdBlock += `- ${item}\n`; });
      mdBlock += `\n`;
    }
  }

  if (entry.breakingChanges && entry.breakingChanges.length > 0) {
      mdBlock += `### ⚠️ BREAKING CHANGES\n`;
      entry.breakingChanges.forEach(item => { mdBlock += `- ${item}\n`; });
      mdBlock += `\n`;
  }

  fs.writeFileSync(mdFile, mdBlock + "---\n\n" + old);
  console.log("✅ CHANGELOG.md updated");
}

// --- Update service-worker.js ---
function updateServiceWorker(entry) {
  if (!updateIn.swFile || !entry) return;
  const swFilePath = path.resolve(__dirname, "..", updateIn.swFile.file);
  if (!fs.existsSync(swFilePath)) return;
  let swContent = fs.readFileSync(swFilePath, "utf-8");
  const versionKeyRegex = new RegExp(`const ${updateIn.swFile.versionKey} = ".*";`);
  swContent = swContent.replace(versionKeyRegex, `const ${updateIn.swFile.versionKey} = "${entry.version.new}";`);
  fs.writeFileSync(swFilePath, swContent);
  console.log("✅ service-worker.js updated");
}

// --- Main ---
(function main() {
  let commitDetails;
  if (process.argv[2] === 'revert' && process.argv[3]) {
    const hashToRevert = process.argv[3];
    console.log("🧪 Running in dummy revert mode for hash:", hashToRevert);
    const versions = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", updateIn.jsonFile), "utf-8"));
    const versionToRevert = versions.find(v => v.commit.hash.long.startsWith(hashToRevert));
    if (!versionToRevert) { console.error("❌ Could not find version to revert."); process.exit(1); }
    const originalSubject = versionToRevert.subject;
    const message = `revert: ${originalSubject}\n\nThis reverts commit ${versionToRevert.commit.hash.long}.`;
    const longDummyHash = "IAMSKDEV_DUMMY_" + Date.now() + Math.random();
    const shortDummyHash = longDummyHash.substring(0, 7);
    commitDetails = { message, hash: { long: longDummyHash, short: shortDummyHash, url: "http://dummy.commit/url" }, author: { name: "Dummy", email: "" }, branch: { name: "dummy-branch", url: "http://dummy.branch/url" } };
  } else if (process.argv[2] === 'commit' && process.argv[3] === '-F' && process.argv[4]) {
    console.log("🧪 Running in dummy commit mode from file:", process.argv[4]);
    const message = fs.readFileSync(process.argv[4], 'utf-8');
    const longDummyHash = "IAMSKDEV_DUMMY_" + Date.now() + Math.random();
    const shortDummyHash = longDummyHash.substring(0, 7);
    commitDetails = { message, hash: { long: longDummyHash, short: shortDummyHash, url: "http://dummy.commit/url" }, author: { name: "Dummy", email: "" }, branch: { name: "dummy-branch", url: "http://dummy.branch/url" } };
  } else {
    commitDetails = getCommitDetails();
  }

  if (!commitDetails || !commitDetails.message || commitDetails.message === "N/A") {
    console.log("Could not retrieve commit message. Aborting.");
    return;
  }

  const newEntry = updateJsonFile(commitDetails);
  if (newEntry) {
    updateMarkdown(newEntry);
    updateServiceWorker(newEntry);
    console.log(`🎉 Version bumped to ${newEntry.version.new} [${newEntry.versionId}]`);
  } else {
    console.log("✅ Commit did not trigger version bump or was a duplicate.");
  }
})();