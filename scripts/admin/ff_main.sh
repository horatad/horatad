#!/usr/bin/env bash
# ff_main.sh — Fast-forward main พร้อม rebase+retry เมื่อ main ขยับไปก่อน
# Usage: bash scripts/admin/ff_main.sh [branch-name]
# Default: ใช้ current branch
#
# กรณีที่รองรับ:
#   1. ff ได้เลย (main ยังไม่ขยับ) → push ทันที
#   2. ff ไม่ได้ (main ขยับไปแล้ว) → fetch + rebase + retry สูงสุด 3 ครั้ง
#   3. rebase conflict → หยุด แจ้งให้แก้มือ

set -e

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null)}"
MAX_RETRY=3
BACKOFF=2

if [ -z "$BRANCH" ] || [ "$BRANCH" = "main" ] || [ "$BRANCH" = "HEAD" ]; then
  echo "✗ ระบุ feature branch: bash scripts/admin/ff_main.sh <branch>" >&2
  exit 1
fi

# ห้าม rebase ถ้ามี uncommitted files
DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [ "$DIRTY" != "0" ]; then
  echo "✗ มี uncommitted files อยู่ — commit ก่อนแล้วค่อย ff main" >&2
  exit 1
fi

echo "→ ff main from $BRANCH"

for i in $(seq 1 $MAX_RETRY); do
  git fetch origin --quiet 2>/dev/null || true

  # ลอง ff main ตรง
  if git push origin "$BRANCH:main" 2>/dev/null; then
    echo "✓ ff main สำเร็จ (attempt $i/$MAX_RETRY)"
    exit 0
  fi

  echo "⚠ attempt $i/$MAX_RETRY — main ขยับไปแล้ว กำลัง rebase..."

  # rebase บน main ล่าสุด — ถ้า conflict หยุดทันที
  if ! git rebase origin/main 2>&1; then
    echo "" >&2
    echo "✗ rebase conflict — แก้ไฟล์ที่ conflict แล้วรัน:" >&2
    echo "   git rebase --continue" >&2
    echo "   bash scripts/admin/ff_main.sh $BRANCH" >&2
    exit 1
  fi

  # รอ backoff ก่อน retry (ยกเว้น attempt สุดท้าย)
  if [ "$i" -lt "$MAX_RETRY" ]; then
    sleep $BACKOFF
    BACKOFF=$((BACKOFF * 2))
  fi
done

echo "✗ ff main ล้มเหลวหลัง $MAX_RETRY ครั้ง — main อาจมี conflict ที่ต้องแก้มือ" >&2
exit 1
