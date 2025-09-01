// versioner/release.js

// This is the master script to orchestrate the versioning process.

// Require the individual scripts
const bumpVersion = require('./bump-version');
const syncToFirestore = require('./sync-to-firestore');
const generateChangelog = require('./generate-changelog');

console.log("Running release.js...");

async function runReleaseProcess() {
  try {
    console.log("Step 1: Bumping version and updating service-worker.js...");
    await bumpVersion.run();

    console.log("Step 2: Syncing version to Firestore...");
    await syncToFirestore.run();

    console.log("Step 3: Generating Changelog...");
    await generateChangelog.run();

    console.log("Release process completed successfully!");
  } catch (error) {
    console.error("Release process failed:", error);
    process.exit(1);
  }
}

runReleaseProcess();