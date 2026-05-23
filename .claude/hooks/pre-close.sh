#!/usr/bin/env bash
# Stop hook — ตรวจก่อนปิด session ว่ามี work ที่ลืม push ไม่
# Config ใน .claude/settings.json
# Output: stderr → Claude เห็น + ทำงานต่อได้
# กฎ: ไม่ block ปิด session (ใช้ exit 0 เสมอ) — แค่แจ้ง

set +e
cd "$(dirname "$0")/../.." || exit 0
[ ! -d .git ] && exit 0

# Fetch origin quietly
timeout 5 git fetch origin --quiet 2>/dev/null || true

PENDING=$(git log origin/main..HEAD --oneline 2>/dev/null | wc -l | tr -d ' ')
UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")

ISSUES=0

if [ "$UNCOMMITTED" != "0" ]; then
  echo "⚠ pre-close: $UNCOMMITTED uncommitted files ยังไม่ commit" >&2
  git status --porcelain 2>/dev/null | head -10 | sed 's/^/     /' >&2
  ISSUES=$((ISSUES+1))
fi

if [ "$PENDING" != "0" ] && [ "$BRANCH" != "main" ]; then
  echo "⚠ pre-close: $PENDING commits ค้างบน $BRANCH ยังไม่ ff main" >&2
  echo "   รัน: git push -u origin $BRANCH && git push origin $BRANCH:main" >&2
  ISSUES=$((ISSUES+1))
fi

# Latest handoff timestamp — ถ้าเก่ากว่า session HEAD = handoff อาจค้าง
if [ -d handoffs ] && [ "$PENDING" != "0" ]; then
  HEAD_TIME=$(git log -1 --format=%ct HEAD 2>/dev/null || echo 0)
  LATEST_HANDOFF=$(ls -1t handoffs/*.md 2>/dev/null | head -1)
  if [ -n "$LATEST_HANDOFF" ]; then
    HANDOFF_TIME=$(git log -1 --format=%ct "$LATEST_HANDOFF" 2>/dev/null || echo 0)
    if [ "$HEAD_TIME" -gt "$((HANDOFF_TIME + 3600))" ]; then
      echo "⚠ pre-close: commit ล่าสุด > 1 ชม. หลัง handoff ล่าสุด — handoff อาจ outdated" >&2
      ISSUES=$((ISSUES+1))
    fi
  fi
fi

if [ "$ISSUES" -eq 0 ]; then
  echo "✓ pre-close: clean — main synced, no uncommitted work" >&2
fi

# ไม่ block ปิด session
exit 0
