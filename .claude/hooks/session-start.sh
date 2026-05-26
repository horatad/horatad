#!/usr/bin/env bash
# SessionStart hook — แสดง main sync + project status + scope banner ตอน session เริ่ม
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

# ตรวจ cross-project commit contamination บน branch
if [ "$PENDING" != "0" ] && [ "$BRANCH" != "main" ]; then
  BRANCH_PROJECT=$(echo "$BRANCH" | grep -oiE '(bible|horatad|julian|nok|guard|reorg|platform|big)' | head -1 | tr '[:lower:]' '[:upper:]')
  if [ -n "$BRANCH_PROJECT" ]; then
    FOREIGN=$(git log origin/main..HEAD --oneline 2>/dev/null \
      | grep -iv "$BRANCH_PROJECT" | grep -v "^$" | wc -l | tr -d ' ')
    if [ "$FOREIGN" -gt 0 ]; then
      echo "⚠ พบ commits ต่าง project บน branch ($FOREIGN commits ไม่ใช่ $BRANCH_PROJECT):"
      git log origin/main..HEAD --oneline 2>/dev/null \
        | grep -iv "$BRANCH_PROJECT" | head -3 | sed 's/^/   /'
      echo "   → รัน bash scripts/admin/ff_main.sh เพื่อ clean branch"
    fi
  fi
fi

# แสดง scope banner ถ้ามีการประกาศ scope ไว้ (.claude/session_scope)
SCOPE_FILE="$(dirname "$0")/session_scope"
if [ -f "$SCOPE_FILE" ]; then
  SCOPE=$(cat "$SCOPE_FILE" | tr '[:lower:]' '[:upper:]' | tr -d '[:space:]')
  if [ -n "$SCOPE" ]; then
    echo ""
    echo "🔒 SESSION SCOPE: $SCOPE (จาก session ก่อน)"
    case "$SCOPE" in
      HORATAD) FILES="script.js · index.html · style.css · sw.js · v3/v3tab.js · v3/engine.js · v3/interpretation.js · v3/typhoon.js · docs/HORATAD*" ;;
      BIBLE)   FILES="v3/kb*.json · workers/kb_extract* · workers/groq* · workers/typhoon* · tools/kb_* · docs/BIBLE*" ;;
      JULIAN)  FILES="workers/julian* · data/julian* · tools/julian* · docs/JULIAN*" ;;
      NOK)     FILES="v3/tts.js · docs/NOK*" ;;
      GUARD)   FILES="docs/GUARD* · docs/cia/* · docs/SECRETS.md · .github/workflows/* · _headers · auth-pin.js" ;;
      REORG)   FILES="docs/*.md (restructure only)" ;;
      BIG)     FILES="scripts/admin/* · .claude/hooks/* · ECOSYSTEM.md · DEPLOY.md" ;;
      *)       FILES="custom scope" ;;
    esac
    echo "   ✅ $FILES"
    echo "   📝 shared: CLAUDE.md · PROJECT_STATUS.md · handoffs/${SCOPE}*"
    echo "   ❌ ห้ามแก้ไฟล์ project อื่น"
    echo "   ⚠ Claude: ถ้า scope เปลี่ยน ให้รัน: echo 'NEW_PROJECT' > .claude/hooks/session_scope"

    # BIBLE: hard reminder — memory files MUST be read before any task
    if [ "$SCOPE" = "BIBLE" ]; then
      echo ""
      echo "⛔ BIBLE MEMORY GATE — อ่านก่อนทำงานใดๆ (แม้มี compaction summary):"
      echo "   1. Read handoffs/bible_memory/INDEX.md"
      echo "   2. Read handoffs/bible_memory/LOG.md  (PINNED entries + 5 latest)"
      echo "   → หรือรัน /bible-start เพื่อ bootstrap ทั้งหมดในทีเดียว"
      # Surface last LOG entry to show what Claude should already know
      LOG_FILE="handoffs/bible_memory/LOG.md"
      if [ -f "$LOG_FILE" ]; then
        LAST_ENTRY=$(grep -n "^## 20" "$LOG_FILE" | tail -1 | cut -d: -f1)
        if [ -n "$LAST_ENTRY" ]; then
          LAST_LINE=$(grep -n "^## 20" "$LOG_FILE" | tail -1 | sed 's/:.*$//')
          SNIPPET=$(sed -n "${LAST_LINE},$((LAST_LINE+3))p" "$LOG_FILE" 2>/dev/null | head -4)
          echo "   📌 Last LOG entry:"
          echo "$SNIPPET" | sed 's/^/      /'
        fi
      fi
    fi
  fi
fi

# Critical alerts จาก BIG handoff ล่าสุด — surface ทุก session start
LATEST_BIG=$(ls -1 handoffs/BIG_[0-9]*_v[0-9]*.md 2>/dev/null | sort -r | head -1)
if [ -n "$LATEST_BIG" ] && grep -q "^## ⚠ CRITICAL ALERTS" "$LATEST_BIG" 2>/dev/null; then
  echo ""
  awk '
    /^## ⚠ CRITICAL ALERTS/ {flag=1; print; next}
    /^---$/ && flag {flag=0; exit}
    /^## / && flag {flag=0; exit}
    flag {print}
  ' "$LATEST_BIG"
fi

# Project handoffs ล่าสุด (1 บรรทัด/project — auto-discover จาก filesystem)
if [ -d handoffs ]; then
  echo ""
  echo "Latest handoffs:"
  PROJECTS=$(ls handoffs/[A-Z]*_[0-9]*_v[0-9]*.md 2>/dev/null \
    | sed -E 's|.*/([A-Z]+)_[0-9]+_v[0-9]+\.md|\1|' \
    | sort -u)
  for P in $PROJECTS; do
    LATEST=$(ls -1 handoffs/${P}_[0-9]*_v[0-9]*.md 2>/dev/null | sort -r | head -1)
    if [ -n "$LATEST" ]; then
      P_COUNT=$(grep -c '^\[ \]' "$LATEST" 2>/dev/null || echo 0)
      U_COUNT=$(grep -c '\[ทดลองใช้\]' "$LATEST" 2>/dev/null || echo 0)
      B_COUNT=$(grep -c '\[BLOCKED\]' "$LATEST" 2>/dev/null || echo 0)
      P_COUNT=${P_COUNT:-0}; U_COUNT=${U_COUNT:-0}; B_COUNT=${B_COUNT:-0}
      if [ "$U_COUNT" -gt 0 ] 2>/dev/null; then
        printf "  %-9s %s  (claude=%s \033[35muser=%s\033[0m blocked=%s)\n" "$P" "${LATEST#handoffs/}" "$P_COUNT" "$U_COUNT" "$B_COUNT"
      else
        printf "  %-9s %s  (claude=%s blocked=%s)\n" "$P" "${LATEST#handoffs/}" "$P_COUNT" "$B_COUNT"
      fi
    fi
  done
  # แจ้งรวม user tasks
  TOTAL_USER=$(grep -h '\[ทดลองใช้\]' handoffs/[A-Z]*_[0-9]*_v[0-9]*.md 2>/dev/null | grep -c '^\[ \]' || echo 0)
  if [ "${TOTAL_USER:-0}" -gt 0 ] 2>/dev/null; then
    echo ""
    echo "  ⭐ User tasks รวม: ${TOTAL_USER} รายการ — รัน \`node scripts/admin/big_status.mjs\` เพื่อดูรายการ"
  fi
fi

echo ""
echo "Tip: \`node scripts/admin/big_status.mjs\` สำหรับ overview เต็ม"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
