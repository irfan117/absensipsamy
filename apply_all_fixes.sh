#!/bin/bash
set -e

echo "=== Applying All Bugumentor.md Fixes ==="
echo ""

# Backup files
echo "Creating backups..."
cp src/services/api.ts src/services/api.ts.backup
cp server/services/data.service.ts server/services/data.service.ts.backup
cp server/controllers/index.ts server/controllers/index.ts.backup
cp server/routes/upload.ts server/routes/upload.ts.backup
echo "✓ Backups created"
echo ""

echo "All fixes ready to apply. Run individual fix scripts or apply manually."
echo "Backup files created with .backup extension"
