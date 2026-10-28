#!/bin/bash
# Stage everything, commit, and push. Usage: ./update.sh ["commit message"]
set -e

git add .
if git diff --cached --quiet; then
  echo "Nothing to commit."
  exit 0
fi
git commit -m "${1:-update}"
git push
