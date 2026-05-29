#!/usr/bin/env bash
# SessionStart hook — แสดง main sync + project status + scope banner ตอน session เริ่ม
# Config ใน .claude/settings.json
# กฎ: เร็ว (<3s) + read-only + ไม่ block session

set -e
cd "$(dirname "$0")/../.." || exit 0

# Skip ถ้าไม่ใช่ git repo
[ ! -d .git ] && exit 0

# Unshallow ถ้า clone เป็น shallow (--depth N) — กัน false-alarm ที่ตัวต้นเหตุ
# ทำก่อน fetch ปกติ; ถ้าเป็น full clone แล้วจะ no-op หรือ error ไม่สำคัญ
if [ -f "$(git rev-parse --git-dir 2>/dev/null)/shallow" ]; then
  timeout 30 git fetch --unshallow origin --quiet 2>/dev/null || true
fi

# Fetch quietly ใน background — ไม่ block (timeout 5s)
timeout 5 git fetch origin --quiet 2>/dev/null &
FETCH_PID=$!
wait "$FETCH_PID" 2>/dev/null || true

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
HEAD=$(git rev-parse --short HEAD 2>/dev/null || echo "?")
MAIN_HEAD=$(git rev-parse --short origin/main 2>/dev/null || echo "?")
UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

# นับ commits ค้าง — shallow-aware (กัน false-alarm)
# บน shallow clone (.git/shallow) common ancestor อยู่ใต้ขอบ depth → git นับ
# ทั้ง history ที่ถูกตัดเป็น "ค้าง" ทำให้ขึ้นตัวเลข = ความลึก shallow (เช่น 50) ทั้งที่ synced จริง
HEAD_FULL=$(git rev-parse HEAD 2>/dev/null)
MAIN_FULL=$(git rev-parse origin/main 2>/dev/null)
if [ "$HEAD_FULL" = "$MAIN_FULL" ]; then
  PENDING=0                                              # ตรงกันเป๊ะ = synced (เชื่อถือได้แม้ shallow)
elif [ -f "$(git rev-parse --git-dir 2>/dev/null)/shallow" ] \
     && ! git merge-base origin/main HEAD >/dev/null 2>&1; then
  PENDING="?"                                            # shallow + ไม่เห็น merge-base → นับไม่ได้
else
  PENDING=$(git log origin/main..HEAD --oneline 2>/dev/null | wc -l | tr -d ' ')
fi

echo "━━━ Horatad ecosystem · session start ━━━"
echo "branch    : $BRANCH @ $HEAD"
echo "main      : $MAIN_HEAD"

if [ "$PENDING" = "?" ]; then
  echo "ℹ shallow clone — ข้ามนับ commits ค้าง (มองไม่เห็น common ancestor ใต้ขอบ depth)"
  echo "   ตรวจจริง: git fetch --unshallow origin"
elif [ "$PENDING" != "0" ]; then
  echo "⚠ commits ค้างยังไม่ ff main: $PENDING"
  git log origin/main..HEAD --oneline 2>/dev/null | head -5 | sed 's/^/   /'
else
  echo "✓ main = HEAD (synced)"
fi

if [ "$UNCOMMITTED" != "0" ]; then
  echo "⚠ uncommitted files: $UNCOMMITTED"
fi

# ตรวจ cross-project commit contamination บน branch (ข้ามถ้า count ไม่น่าเชื่อถือ = shallow)
if [ "$PENDING" != "0" ] && [ "$PENDING" != "?" ] && [ "$BRANCH" != "main" ]; then
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
SCOPE_FILE="$(dirname "$0")/../../.session_scope"
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

    # JULIAN: แสดง data stats ทุก session
    if [ "$SCOPE" = "JULIAN" ]; then
      STATS_FILE="workers/julian_stats.json"
      if [ -f "$STATS_FILE" ]; then
        node -e "
          const s = JSON.parse(require('fs').readFileSync('$STATS_FILE','utf8'));
          const fmt = n => n.toLocaleString('en');
          // genealogy + succession ก่อน (research asset อันดับ 1)
          const g = s.genealogy || {};
          const su = s.succession || {};
          console.log('');
          console.log('🧬 Genealogy : persons=' + fmt(g.in_db_persons||0) + ' · links=' + fmt(g.in_db_links||0));
          console.log('👑 Succession: persons=' + fmt(su.in_db_persons||0) + ' · links=' + fmt(su.in_db_links||0));
          // record count
          const src = s.by_source;
          const srcParts = Object.entries(src).filter(([,v])=>v>0)
            .map(([k,v])=>k+': '+fmt(v)).join(' · ');
          const acc = s.by_accuracy;
          const accParts = Object.entries(acc).filter(([,v])=>v>0)
            .map(([k,v])=>k+'='+fmt(v)).join(' ');
          const hist = s.history || [];
          const delta7 = hist.length>=2 ? s.total - hist[Math.max(0,hist.length-8)].total : null;
          const delta1 = s.delta_today;
          console.log('📊 Records   : ' + fmt(s.total) + ' / ' + fmt(s.target) + ' (' + s.pct + '% of target)');
          if (delta1 !== null) console.log('   วันนี้: ' + (delta1>=0?'+':'')+fmt(delta1) + (delta7!==null?' | 7 วัน: +'+ fmt(delta7) : ''));
          console.log('   แหล่งข้อมูล: ' + srcParts);
          console.log('   Accuracy: ' + accParts);
          if (s.with_hpi > 0) console.log('   HPI (Pantheon): ' + fmt(s.with_hpi) + ' records');
          console.log('   อัปเดตล่าสุด: ' + s.generated.slice(0,16).replace('T',' ') + ' UTC');
          if (hist.length >= 2) {
            const recent = hist.slice(-7);
            const maxV = Math.max(...recent.map(h=>h.total));
            const bars = ['▁','▂','▃','▄','▅','▆','▇','█'];
            const spark = recent.map(h => bars[Math.min(7,Math.floor(h.total/maxV*7))]).join('');
            console.log('   7 วันล่าสุด: ' + spark + '  (' + recent[0].date + ' → ' + recent[recent.length-1].date + ')');
          }
        " 2>/dev/null || echo "   (ไม่สามารถอ่าน julian_stats.json)"
      else
        echo ""
        echo "📊 JULIAN data: (ยังไม่มี workers/julian_stats.json)"
      fi
    fi

    # BIBLE: embed foundational rules + last 3 LOG entries DIRECTLY (Claude reads without tool calls)
    if [ "$SCOPE" = "BIBLE" ]; then
      INDEX_FILE="handoffs/bible_memory/INDEX.md"
      LOG_FILE="handoffs/bible_memory/LOG.md"
      echo ""
      echo "══════════════════════════════════════════════════════"
      echo "📚 BIBLE MEMORY — embedded (ไม่ต้อง tool call)"
      echo "══════════════════════════════════════════════════════"
      # Embed TALS FOUNDATIONAL RULES: from first ═══ separator to first --- after second ═══
      if [ -f "$INDEX_FILE" ]; then
        awk '
          /^═+$/ { sep++; if(sep==1){printing=1}; print; next }
          /^---$/ && sep>=2 { exit }
          printing { print }
        ' "$INDEX_FILE" | head -80
      fi
      echo ""
      echo "── Last 3 LOG entries ──────────────────────────────────"
      # Extract last 3 ## 20YY entries from LOG.md
      if [ -f "$LOG_FILE" ]; then
        THIRD_LAST=$(grep -n "^## 20" "$LOG_FILE" | tail -3 | head -1 | cut -d: -f1)
        if [ -n "$THIRD_LAST" ]; then
          tail -n "+${THIRD_LAST}" "$LOG_FILE" | head -100
        fi
      fi
      echo "══════════════════════════════════════════════════════"
      echo "⛔ ถ้าต้องการ context เพิ่ม: Read handoffs/bible_memory/INDEX.md + LOG.md"
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
