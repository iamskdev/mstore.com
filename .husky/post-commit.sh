#!/bin/sh
#
# This is a Git hook that runs AFTER a commit is successfully made.
# It is managed by 'husky'. DO NOT RENAME THIS FILE.
#
# Its purpose is to:
# 1. Run the versioner.js script to automatically bump the version.
# 2. Amend the last commit to include the version files (config.json, versions.json, etc.).
# 3. Revert the dataSource in config.json back to 'emulator' for local development.
#

# If we are already amending a commit, exit to prevent an infinite loop.
if [ -n "$GIT_AMENDING_COMMIT" ]; then
  exit 0
fi

# Set a flag to indicate that we are now in the process of amending a commit.
export GIT_AMENDING_COMMIT=1

# Run versioner.js and capture its output
OUTPUT=$(node versioner/versioner.js)
EXIT_CODE=$?

# Print the output from versioner.js
echo "$OUTPUT"

# If the commit message doesn't trigger a version bump (e.g., "docs: update readme")...
if echo "$OUTPUT" | grep -q "Commit did not trigger version bump"; then
  # ...still revert the dataSource to 'emulator' just in case it was changed, then exit.
  node -e "const fs = require('fs'); const path = 'source/settings/config.json'; let c = JSON.parse(fs.readFileSync(path, 'utf-8')); if(c.source && c.source.data === 'firebase') { c.source.data = 'emulator'; fs.writeFileSync(path, JSON.stringify(c, null, 2)); console.log('⏪ dataSource reverted to emulator for local development.'); }"
  exit 0
fi

# If versioner.js script failed, print an error and exit.
if [ $EXIT_CODE -ne 0 ]; then
  echo "Error: versioner.js failed with exit code $EXIT_CODE"
  exit $EXIT_CODE
fi

# If a version bump happened, add the changed files (config, versions, changelog) to the staging area...
git add source/settings/config.json versions.json CHANGELOG.md
# ...and amend the previous commit to include them. --no-edit keeps the original commit message.
git commit --amend --no-edit --allow-empty

# IMPORTANT: After the commit is finalized with dataSource='firebase', revert it back to 'emulator'.
# This ensures the local development environment is not affected. This change will NOT be committed.
node -e "const fs = require('fs'); const path = 'source/settings/config.json'; let c = JSON.parse(fs.readFileSync(path, 'utf-8')); c.source.data = 'emulator'; fs.writeFileSync(path, JSON.stringify(c, null, 2)); console.log('⏪ dataSource reverted to emulator for local development.');"

echo "✅ Post-commit hook finished."