// versioner/generate-changelog.js

const fs = require('fs');
const path = require('path');

async function runGenerateChangelog() {
    console.log("Running generate-changelog.js...");

    const versionsJsonPath = path.resolve(__dirname, '../localstore/jsons/versions.json');
    const changelogPath = path.resolve(__dirname, '../docs/CHANGELOG.md'); // CHANGELOG.md will be saved in the docs folder

    let versions = [];
    try {
        const versionsJsonContent = fs.readFileSync(versionsJsonPath, 'utf8');
        versions = JSON.parse(versionsJsonContent);
    } catch (error) {
        console.error('Error reading or parsing versions.json:', error);
        process.exit(1);
    }

    if (versions.length === 0) {
        console.log("No versions found in versions.json to generate changelog.");
        return;
    }

    let changelogContent = "# Changelog\n\n";

    // Sort versions in descending order for changelog
    versions.sort((a, b) => {
        const [aMajor, aMinor, aPatch] = a.version.split('.').map(Number);
        const [bMajor, bMinor, bPatch] = b.version.split('.').map(Number);
        if (aMajor !== bMajor) return bMajor - aMajor;
        if (aMinor !== bMinor) return bMinor - aMinor;
        return bPatch - aPatch;
    });

    for (const entry of versions) {
        const deploymentDate = entry.audit && entry.audit.deploymentDate ? entry.audit.deploymentDate : entry.audit.createdAt;
        const dateIST = new Date(deploymentDate).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        changelogContent += `## ${entry.version} | ${entry.environment}\n`;
        changelogContent += `**Date:** ${dateIST} IST  \n`;
        changelogContent += `**VersionId:** ${entry.versionId}  \n\n`;

        if (entry.added && entry.added.length > 0) {
            changelogContent += "### Added\n";
            entry.added.forEach(item => changelogContent += `- ${item}\n`);
            changelogContent += "\n";
        }
        if (entry.fixed && entry.fixed.length > 0) {
            changelogContent += "### Fixed\n";
            entry.fixed.forEach(item => changelogContent += `- ${item}\n`);
            changelogContent += "\n";
        }
        if (entry.improved && entry.improved.length > 0) {
            changelogContent += "### Improved\n";
            entry.improved.forEach(item => changelogContent += `- ${item}\n`);
            changelogContent += "\n";
        }
        if (entry.notes && entry.notes.length > 0) {
            changelogContent += "### Notes\n";
            entry.notes.forEach(item => changelogContent += `- ${item}\n`);
            changelogContent += "\n";
        }
        changelogContent += "---\n\n"; // Add divider after each entry
    }

    fs.writeFileSync(changelogPath, changelogContent, 'utf8');
    console.log(`CHANGELOG.md generated successfully at ${changelogPath}`);
}

module.exports = {
    run: runGenerateChangelog
};
