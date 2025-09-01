// versioner/bump-version.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define the ordered list of environments
const ENVIRONMENTS = ['dev', 'test', 'staging', 'beta', 'production', 'hotfix'];

// This script will:
// 1. Read the latest version from versions.json.
// 2. Determine the next semantic version based on Git commit types.
// 3. Generate a new versionId.
// 4. Create a new version JSON object, populating all fields, including the audit object.
// 5. Update APP_VERSION and APP_ENVIRONMENT in service-worker.js.
// 6. Add this new entry to versions.json.

async function runBumpVersion() { // Removed environment parameter
    console.log("Running bump-version.js...");

    // Define paths
    const versionsJsonPath = path.resolve(__dirname, '../localstore/jsons/versions.json');
    const serviceWorkerPath = path.resolve(__dirname, '../service-worker.js');

    // 1. Read versions.json
    let versions = [];
    try {
        const versionsJsonContent = fs.readFileSync(versionsJsonPath, 'utf8');
        versions = JSON.parse(versionsJsonContent);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('versions.json not found, starting with an empty array.');
            versions = [];
        } else {
            console.error('Error reading or parsing versions.json:', error);
            process.exit(1);
        }
    }

    // 2. Get latest version and determine next version
    let latestVersion = { version: "0.0.0", versionId: "VRN0000000", environment: "dev" }; // Default environment for first run
    if (versions.length > 0) {
        latestVersion = versions[versions.length - 1];
    }

    let [major, minor, patch] = latestVersion.version.split('.').map(Number);
    let bumpType = 'patch'; // Default to patch bump

    const addedChanges = [];
    const fixedChanges = [];
    const improvedChanges = [];
    const otherNotes = []; // For messages that don't fit feat/fix/perf

    // Analyze Git commits since last version
    const lastCommitHash = latestVersion.audit ? latestVersion.audit.commitHash : null;
    let gitLogCommand = 'git log --pretty=format:%s --no-merges'; // Added --no-merges
    if (lastCommitHash && lastCommitHash !== "0000000000000000000000000000000000000000") { // Use a more generic initial hash
        gitLogCommand += ` ${lastCommitHash}..HEAD`;
    }

    const gitLog = execSync(gitLogCommand, { encoding: 'utf8' });
    const commitMessages = gitLog.split('\n').filter(Boolean);

    for (const msg of commitMessages) {
        const lowerMsg = msg.toLowerCase(); // Convert to lowercase for easier matching

        if (lowerMsg.includes('breaking change')) {
            bumpType = 'major';
            // newVersionEntry.breakingChanges = true; // This will be set later in newVersionEntry
            otherNotes.push(`BREAKING CHANGE: ${msg}`); // Add to notes as well
            break; // Major change implies highest bump, so break
        } else if (lowerMsg.startsWith('feat:')) {
            bumpType = bumpType === 'major' ? 'major' : 'minor'; // Feat is minor, unless already major
            addedChanges.push(msg.substring(5).trim()); // Remove 'feat:' prefix
        } else if (lowerMsg.startsWith('fix:')) {
            bumpType = bumpType === 'major' || bumpType === 'minor' ? bumpType : 'patch'; // Fix is patch, unless already minor/major
            fixedChanges.push(msg.substring(4).trim()); // Remove 'fix:' prefix
        } else if (lowerMsg.startsWith('perf:')) {
            improvedChanges.push(msg.substring(5).trim()); // Remove 'perf:' prefix
        } else {
            // For other types like docs, chore, refactor, test, build, ci, or general messages
            otherNotes.push(msg);
        }
    }

    if (bumpType === 'major') {
        major++;
        minor = 0;
        patch = 0;
    } else if (bumpType === 'minor') {
        minor++;
        patch = 0;
    } else {
        patch++;
    }

    // Handle 9.9.9 reset
    let shouldAdvanceEnvironment = false; // Flag to control environment advancement
    if (major > 9 || minor > 9 || patch > 9) {
        major = 0;
        minor = 0;
        patch = 1; // Reset to 0.0.1
        shouldAdvanceEnvironment = true; // Set flag to advance environment
    }
    const newVersion = `${major}.${minor}.${patch}`;

    // Determine the next environment based on version recycling
    let nextEnvironment = latestVersion.environment; // Default to current environment

    if (shouldAdvanceEnvironment) {
        let currentEnvIndex = ENVIRONMENTS.indexOf(latestVersion.environment);
        if (currentEnvIndex === -1 || currentEnvIndex === ENVIRONMENTS.length - 1) {
            // If current environment is not found or is the last one, loop back to the first (dev)
            nextEnvironment = ENVIRONMENTS[0];
        } else {
            nextEnvironment = ENVIRONMENTS[currentEnvIndex + 1];
        }
    }

    // 3. Generate new versionId
    let newVersionIdNum = 1; // Default for first version
    if (versions.length > 0) {
        newVersionIdNum = Number(latestVersion.versionId.replace('VRN', '')) + 1;
    }
    
    const newVersionId = `VRN${String(newVersionIdNum).padStart(7, '0')}`;

    // 4. Get Git commit hash and message
    const currentCommitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const currentCommitMessage = execSync('git log -1 --pretty=format:"%s"', { encoding: 'utf8' }).trim();

    // 5. Create new version entry
    const newVersionEntry = {
        version: newVersion,
        versionId: newVersionId,
        environment: nextEnvironment, // Use the determined next environment
        releaseChannel: "beta", // Default, can be overridden
        status: "pending", // Initial status
        tags: [],
        tickets: [],
        breakingChanges: bumpType === 'major', // Set breakingChanges based on bumpType
        rollbackPlan: "",
        added: addedChanges, // Use populated array
        fixed: fixedChanges, // Use populated array
        improved: improvedChanges, // Use populated array
        notes: otherNotes, // Use populated array
        audit: {
            commitHash: currentCommitHash,
            createdBy: "Automated Script (Gemini)", // Or get from Git config user.name
            createdAt: new Date().toISOString(),
            deployedBy: null,
            deploymentDate: null,
            verifiedBy: null,
            verificationDate: null,
            lastModifiedBy: "Automated Script (Gemini)",
            lastModifiedAt: new Date().toISOString()
        }
    };

    // 6. Update APP_VERSION and APP_ENVIRONMENT in service-worker.js
    let serviceWorkerContent = fs.readFileSync(serviceWorkerPath, 'utf8');

    const oldAppVersionLine = /const APP_VERSION = ".*";/;
    const newAppVersionLine = `const APP_VERSION = "${newVersion}";`;
    serviceWorkerContent = serviceWorkerContent.replace(oldAppVersionLine, newAppVersionLine);

    const oldAppEnvironmentLine = /const APP_ENVIRONMENT = ".*";/;
    const newAppEnvironmentLine = `const APP_ENVIRONMENT = "${newVersionEntry.environment}";`;
    serviceWorkerContent = serviceWorkerContent.replace(oldAppEnvironmentLine, newAppEnvironmentLine);

    fs.writeFileSync(serviceWorkerPath, serviceWorkerContent, 'utf8');
    console.log(`Updated service-worker.js with APP_VERSION: ${newVersion} and APP_ENVIRONMENT: ${newVersionEntry.environment}`);

    // 7. Write new version entry to versions.json
    versions.push(newVersionEntry);
    fs.writeFileSync(versionsJsonPath, JSON.stringify(versions, null, 2), 'utf8');
    console.log(`New version entry ${newVersion} added to versions.json`);

    console.log("bump-version.js finished successfully.");
}

module.exports = {
    run: runBumpVersion
};