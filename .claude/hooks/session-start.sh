#!/usr/bin/env bash
# SessionStart hook — แสดง main sync + project status ตอน session เริ่ม
# Config ใน .claude/settings.json
# กฎ: เร็ว (<3s) + read-only + ไม่ block session

set -e
cd "$(dirname "$0")/../.." || exit 0

# Skip ถ้าไม่ใช่ git repo
[ ! -d .git ] && exit 0

# Fetch quietly ใน background — ไม่ block (timeout 5s)
timeout 5 git fetch origin --quiet 2>/dev/null &
FETCH_PID=$!
wait "$FETCH_PID" 2>/dev/null || true

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
HEAD=$(git rev-parse --short HEAD 2>/dev/null || echo "?")
MAIN_HEAD=$(git rev-parse --short origin/main 2>/dev/null || echo "?")
PENDING=$(git log origin/main..HEAD --oneline 2>/dev/null | wc -l | tr -d ' ')
UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

echo "━━━ Horatad ecosystem · session start ━━━"
echo "branch    : $BRANCH @ $HEAD"
echo "main      : $MAIN_HEAD"

if [ "$PENDING" != "0" ]; then
  echo "⚠ commits ค้างยังไม่ ff main: $PENDING"
  git log origin/main..HEAD --oneline 2>/dev/null | head -5 | sed 's/^/   /'
else
  echo "✓ main = HEAD (synced)"
fi

if [ "$UNCOMMITTED" != "0" ]; then
  echo "⚠ uncommitted files: $UNCOMMITTED"
fi

# Project handoffs ล่าสุด (1 บรรทัด/project)
if [ -d handoffs ]; then
  echo ""
  echo "Latest handoffs:"
  for P in HORATAD BIBLE JULIAN NOK PLATFORM CIA REORG BIG; do
    LATEST=$(ls -1 handoffs/${P}_[0-9]*_v[0-9]*.md 2>/dev/null | sort -r | head -1)
    if [ -n "$LATEST" ]; then
      P_COUNT=$(grep -c '^\[ \]' "$LATEST" 2>/dev/null | head -1)
      B_COUNT=$(grep -c '\[BLOCKED\]' "$LATEST" 2>/dev/null | head -1)
      P_COUNT=${P_COUNT:-0}
      B_COUNT=${B_COUNT:-0}
      printf "  %-9s %s  (pending=%s blocked=%s)\n" "$P" "${LATEST#handoffs/}" "$P_COUNT" "$B_COUNT"
    fi
  done
fi

echo ""
echo "Tip: \`node scripts/admin/big_status.mjs\` สำหรับ overview เต็ม"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
