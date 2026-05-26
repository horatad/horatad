#!/usr/bin/env bash
# Pre-edit memory guard — ป้องกัน Claude rewrite/ลบ memory file โดยไม่ตั้งใจ
# Trigger: PreToolUse (Edit + Write) สำหรับไฟล์ใน handoffs/bible_memory/
# Input: JSON on stdin { tool_name, tool_input: { file_path, old_string?, new_string?, content? } }
# Exit 0 = allow | Exit 2 + message = block + show message to Claude

set +e

# อ่าน JSON จาก stdin
INPUT=$(cat)

# ดึง tool_name + file_path
TOOL=$(echo "$INPUT" | node -e "
try {
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  process.stdout.write(d.tool_name || '');
} catch(e) { process.stdout.write(''); }
" 2>/dev/null)

FILE_PATH=$(echo "$INPUT" | node -e "
try {
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  const ti = d.tool_input || {};
  process.stdout.write(ti.file_path || '');
} catch(e) { process.stdout.write(''); }
" 2>/dev/null)

# ตรวจเฉพาะไฟล์ใน handoffs/bible_memory/
if [[ "$FILE_PATH" != *"handoffs/bible_memory/"* ]]; then
  exit 0
fi

BASENAME=$(basename "$FILE_PATH")

# LOG.md — append-only guard
if [[ "$BASENAME" == "LOG.md" ]]; then
  OLD_STR=$(echo "$INPUT" | node -e "
  try {
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const s = (d.tool_input || {}).old_string || '';
    process.stdout.write(s.length.toString());
  } catch(e) { process.stdout.write('0'); }
  " 2>/dev/null)

  NEW_STR=$(echo "$INPUT" | node -e "
  try {
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const s = (d.tool_input || {}).new_string || '';
    process.stdout.write(s.length.toString());
  } catch(e) { process.stdout.write('0'); }
  " 2>/dev/null)

  # ถ้า old_string ยาว (>200 chars) และ new_string สั้นกว่า = อาจกำลังลบข้อมูล
  if [ "$OLD_STR" -gt 200 ] && [ "$NEW_STR" -lt "$OLD_STR" ]; then
    echo "⛔ MEMORY GUARD: LOG.md เป็น append-only" >&2
    echo "   กำลัง replace ${OLD_STR} chars → ${NEW_STR} chars = อาจสูญเสียข้อมูล" >&2
    echo "   → ใช้วิธี append ต่อท้ายแทน หรือเพิ่ม '⚠️ แก้ไข (YYYY-MM-DD):' ต่อท้าย entry เดิม" >&2
    exit 2
  fi
fi

# ไฟล์ memory อื่น — ตรวจ Write ที่ content สั้นกว่าไฟล์จริงมาก (อาจ overwrite ทับ)
if [[ "$TOOL" == "Write" ]] && [[ -f "$FILE_PATH" ]]; then
  EXISTING_LINES=$(wc -l < "$FILE_PATH" 2>/dev/null || echo 0)
  NEW_CONTENT_LINES=$(echo "$INPUT" | node -e "
  try {
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const c = (d.tool_input || {}).content || '';
    process.stdout.write(c.split('\n').length.toString());
  } catch(e) { process.stdout.write('0'); }
  " 2>/dev/null)

  # ถ้า content ใหม่สั้นกว่า 50% ของต้นฉบับ = น่าสงสัย
  THRESHOLD=$(( EXISTING_LINES / 2 ))
  if [ "$EXISTING_LINES" -gt 20 ] && [ "$NEW_CONTENT_LINES" -lt "$THRESHOLD" ]; then
    echo "⛔ MEMORY GUARD: $BASENAME" >&2
    echo "   Write จะแทนที่ ${EXISTING_LINES} บรรทัด ด้วย ${NEW_CONTENT_LINES} บรรทัด" >&2
    echo "   Memory files เป็น append-only — ใช้ Edit tool แทน Write" >&2
    exit 2
  fi
fi

exit 0
