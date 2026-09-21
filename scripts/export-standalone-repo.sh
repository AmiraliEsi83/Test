#!/usr/bin/env bash
set -e

# ==============================================================================
# HARSI AI Trading Platform — Standalone Repository Migration Script
#
# This script bundles and copies ONLY the HARSI AI Trading Platform code into a
# completely clean, independent directory ready to push to a separate GitHub repo
# (such as AmiraliEsi83/harsi-trading or AmiraliEsi83/harsi-ai-trading).
#
# Usage:
#   ./scripts/export-standalone-repo.sh /path/to/target/directory
# Example:
#   ./scripts/export-standalone-repo.sh ~/harsi-trading
# ==============================================================================

TARGET_DIR="${1:-../harsi-trading}"

echo "=================================================="
echo "Exporting HARSI Platform to: $TARGET_DIR"
echo "=================================================="

mkdir -p "$TARGET_DIR"

# Copy package management & configuration files
cp package.json "$TARGET_DIR/"
cp package-lock.json "$TARGET_DIR/" 2>/dev/null || true
cp tsconfig.json "$TARGET_DIR/"
cp jest.config.cjs "$TARGET_DIR/"
cp .env.example "$TARGET_DIR/"
cp .gitignore "$TARGET_DIR/" 2>/dev/null || true
cp docker-compose.yml "$TARGET_DIR/"
cp README.md "$TARGET_DIR/"

# Copy core apps & packages
echo "Copying apps/..."
cp -R apps "$TARGET_DIR/"
rm -rf "$TARGET_DIR/apps/web/dist" "$TARGET_DIR/apps/api/dist"

echo "Copying packages/..."
cp -R packages "$TARGET_DIR/"
rm -rf "$TARGET_DIR"/packages/*/dist

echo "Copying prisma schema & tests..."
cp -R prisma "$TARGET_DIR/"
cp -R tests "$TARGET_DIR/"

echo "Cleaning up node_modules in target if any..."
rm -rf "$TARGET_DIR/node_modules" "$TARGET_DIR"/apps/*/node_modules "$TARGET_DIR"/packages/*/node_modules

echo "=================================================="
echo "HARSI Standalone Repository successfully exported!"
echo "Location: $TARGET_DIR"
echo ""
echo "To publish to your new GitHub repository:"
echo "  cd $TARGET_DIR"
echo "  git init"
echo "  git add ."
echo "  git commit -m \"feat: initial release of HARSI AI Trading Platform\""
echo "  git branch -M main"
echo "  git remote add origin https://github.com/AmiraliEsi83/harsi-trading.git"
echo "  git push -u origin main"
echo "=================================================="
