#!/bin/sh
# This file is the entry point for the post-commit hook.
# It executes the main logic script.

node "$(dirname "$0")/../versioner/versioner.js"