#!/usr/bin/env bash
# julian_data_repo_migrate.sh
# ย้าย data files จาก horatad/horatad → horatad/julian-data repo
#
# Prerequisites:
#   1. สร้าง repo horatad/julian-data บน GitHub ก่อน (Settings: public, no init)
#      → https://github.com/new  name=julian-data  organization=horatad
#   2. รัน script นี้จาก root ของ horatad/horatad repo
#
# Usage: bash scripts/admin/julian_data_repo_migrate.sh
#
# สิ่งที่ script ทำ:
#   1. Clone horatad/julian-data เป็น /tmp/julian-data-repo
#   2. Copy data files ไปที่ clone
#   3. Initial commit + push → horatad/julian-data
#   4. Remove data files จาก horatad/horatad (git rm)
#   5. Add data/ ลง .gitignore
#   6. Commit + push main repo

set -euo pipefail

MAIN_REPO_ROOT="$(git rev-parse --show-toplevel)"
DATA_REPO_URL="https://github.com/horatad/julian-data.git"
DATA_REPO_CLONE="/tmp/julian-data-repo"
DATA_FILES=(
  "data/julian_all.json"
  "data/julian_events.jsonl"
  "data/julian_ml_features.jsonl"
)

echo "════════════════════════════════════════"
echo " JULIAN Data Repo Migration"
echo "════════════════════════════════════════"
echo "Main repo: $MAIN_REPO_ROOT"
echo "Data repo: $DATA_REPO_URL"
echo ""

# ── 1. Clone data repo (must already exist on GitHub) ───────────────────────
echo "Step 1: Clone horatad/julian-data..."
rm -rf "$DATA_REPO_CLONE"
git clone "$DATA_REPO_URL" "$DATA_REPO_CLONE" || {
  echo ""
  echo "❌ Clone failed — สร้าง repo horatad/julian-data บน GitHub ก่อน:"
  echo "   https://github.com/new"
  echo "   - Name: julian-data"
  echo "   - Public"
  echo "   - Add README: YES (ต้องมี initial commit)"
  exit 1
}

# ── 2. Copy data files ────────────────────────────────────────────────────────
echo "Step 2: Copy data files..."
cd "$DATA_REPO_CLONE"
mkdir -p .

for f in "${DATA_FILES[@]}"; do
  src="$MAIN_REPO_ROOT/$f"
  dst="$(basename $f)"
  if [ -f "$src" ]; then
    cp "$src" "$dst"
    echo "  Copied: $f → $dst ($(du -sh "$dst" | cut -f1))"
  else
    echo "  Skip: $f (not found)"
  fi
done

# Copy checkpoint files
for cp_file in "$MAIN_REPO_ROOT/workers/julian_events_checkpoint.json" \
               "$MAIN_REPO_ROOT/workers/julian_mb_checkpoint.json" \
               "$MAIN_REPO_ROOT/workers/julian_p3447_checkpoint.json"; do
  if [ -f "$cp_file" ]; then
    cp "$cp_file" "$(basename $cp_file)"
    echo "  Copied checkpoint: $(basename $cp_file)"
  fi
done

# ── 3. Initial commit + push to data repo ────────────────────────────────────
echo "Step 3: Commit + push to horatad/julian-data..."
git config user.name  "JULIAN Bot"
git config user.email "julian-bot@horatad.com"
git add .
git status

RECORD_COUNT=0
if [ -f "julian_all.json" ]; then
  RECORD_COUNT=$(node -e "try{const d=JSON.parse(require('fs').readFileSync('julian_all.json','utf8')); console.log(d.length)}catch(e){console.log(0)}")
fi

git commit -m "JULIAN data: initial migration from horatad/horatad — ${RECORD_COUNT} records"
git push origin main || git push origin HEAD
echo "✅ Pushed to horatad/julian-data"

# ── 4. Remove data files from main repo ──────────────────────────────────────
echo "Step 4: Remove data files from main repo..."
cd "$MAIN_REPO_ROOT"

for f in "${DATA_FILES[@]}"; do
  if [ -f "$f" ]; then
    git rm --cached "$f" 2>/dev/null || true
    echo "  Removed from git index: $f"
  fi
done

# Add to .gitignore
echo "Step 5: Update .gitignore..."
GITIGNORE="$MAIN_REPO_ROOT/.gitignore"
touch "$GITIGNORE"

DATA_PATTERNS=(
  "data/julian_all.json"
  "data/julian_events.jsonl"
  "data/julian_ml_features.jsonl"
)

for pat in "${DATA_PATTERNS[@]}"; do
  if ! grep -qF "$pat" "$GITIGNORE"; then
    echo "$pat" >> "$GITIGNORE"
    echo "  Added to .gitignore: $pat"
  fi
done

# ── 6. Commit main repo changes ───────────────────────────────────────────────
echo "Step 6: Commit main repo changes..."
git config user.name  "JULIAN Bot"
git config user.email "julian-bot@horatad.com"
git add .gitignore
git diff --cached --quiet || git commit -m "JULIAN: ย้าย data files ไป horatad/julian-data repo

- data/julian_all.json, events.jsonl, ml_features.jsonl ย้ายแล้ว
- เพิ่ม patterns ลง .gitignore
- Workflows อัปเดตแล้ว: checkout data repo ใน data/ directory

วิธี dev local:
  git clone https://github.com/horatad/julian-data data
  (แล้ว data/julian_all.json จะมีอยู่ที่เดิม)"

echo ""
echo "════════════════════════════════════════"
echo "✅ Migration complete!"
echo ""
echo "Next steps:"
echo "  1. git push origin HEAD:main  (push main repo changes)"
echo "  2. Verify workflows on GitHub Actions"
echo "  3. Dev local: git clone https://github.com/horatad/julian-data data"
echo "════════════════════════════════════════"
