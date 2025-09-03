const fs = require("fs");
const path = require("path");
const readline = require("readline");

// --- CLI Helper ---
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
function ask(question) {
  return new Promise((resolve) => rl.question(question, (ans) => resolve(ans.trim())));
}

// --- JSON Helpers ---
function loadJSON(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch (e) {
    console.error(`❌ Failed to read or parse ${filePath}:`, e.message);
    return null;
  }
  return null;
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// --- Time Helper ---
function nowISO() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

// --- Main Execution ---
(async function main() {
  const configPath = path.join(__dirname, "versioner.json");
  let config = loadJSON(configPath);

  if (!config) {
    console.error("❌ Could not load versioner.json. Aborting.");
    rl.close();
    return;
  }

  console.log("🚀 versioner.json Config Updater");
  console.log("This script will update the meta and audit info in versioner.json.");
  console.log("Press Enter to skip any field you don't want to change.");
  console.log("---");

  // 1. Get new values for meta block
  const newProject = await ask(`- Project Name (current: ${config.meta.project}): `);
  const newEnv = await ask(`- Environment (current: ${config.meta.environment}): `);
  const newChannel = await ask(`- Release Channel (current: ${config.meta.releaseChannel}): `);
  
  // 2. Get new value for audit block
  const modifiedBy = await ask(`- Config modified by (current: ${config.audit.modifyBy}): `);

  // Check if any input was provided
  const isProjectChanged = newProject && newProject !== config.meta.project;
  const isEnvChanged = newEnv && newEnv !== config.meta.environment;
  const isChannelChanged = newChannel && newChannel !== config.meta.releaseChannel;
  const isModifiedByChanged = modifiedBy && modifiedBy !== config.audit.modifyBy;

  if (!isProjectChanged && !isEnvChanged && !isChannelChanged && !isModifiedByChanged) {
      console.log("\nℹ️ No changes provided. Exiting.");
      rl.close();
      return;
  }

  // Apply changes to the config object
  if (isProjectChanged) config.meta.project = newProject;
  if (isEnvChanged) config.meta.environment = newEnv;
  if (isChannelChanged) config.meta.releaseChannel = newChannel;
  
  // Always update audit trail if any change was made
  config.audit.modifyAt = nowISO();
  config.audit.modifyBy = modifiedBy || config.audit.modifyBy; // Keep old name if new one is empty

  // Save the updated config
  saveJSON(configPath, config);
  console.log("\n✅ versioner.json has been successfully updated.");
  
  rl.close();
})();
