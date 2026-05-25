#!/usr/bin/env bash
# render_doc.sh — Standard doc generation: Markdown + Mermaid → DOCX (Google Docs ready)
#
# Workflow:
#   1. Source markdown มี image refs ชี้ไปที่ diagrams/*.png
#   2. แต่ละ *.png มี source .mmd อยู่คู่กัน (เปลี่ยน diagram = แก้ .mmd แล้ว re-render)
#   3. Script นี้: render *.mmd → *.png + pandoc convert .md → .docx
#
# Usage:
#   bash tools/render_doc.sh <input_dir>
#   bash tools/render_doc.sh docs/bible_session_summary_2026-05-26
#
# Input structure:
#   <input_dir>/
#     <name>.md              ← markdown with ![](diagrams/X.png) refs
#     diagrams/
#       <X>.mmd              ← Mermaid source
#       (X.png generated)
#
# Output:
#   <input_dir>/<name>.docx
#
# Dependencies: mmdc (mermaid-cli) + pandoc + chromium
#   sudo apt-get install pandoc
#   npm install -g @mermaid-js/mermaid-cli
#   (chromium: ใช้ /opt/pw-browsers/chromium-1194/chrome-linux/chrome ถ้ามี)

set -euo pipefail

INPUT_DIR="${1:-}"
if [[ -z "$INPUT_DIR" || ! -d "$INPUT_DIR" ]]; then
  echo "Usage: $0 <input_dir>"
  echo "Example: $0 docs/bible_session_summary_2026-05-26"
  exit 1
fi

# Check dependencies
for cmd in mmdc pandoc; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "❌ Missing: $cmd"
    case "$cmd" in
      mmdc)   echo "   Install: npm install -g @mermaid-js/mermaid-cli" ;;
      pandoc) echo "   Install: sudo apt-get install pandoc" ;;
    esac
    exit 1
  fi
done

DIAGRAMS_DIR="$INPUT_DIR/diagrams"
if [[ ! -d "$DIAGRAMS_DIR" ]]; then
  echo "⚠ No diagrams/ folder in $INPUT_DIR — skipping render"
else
  # Chromium puppeteer config (auto-detect)
  PUPPETEER_CONFIG=""
  if [[ -f /opt/pw-browsers/chromium-1194/chrome-linux/chrome ]]; then
    PUPPETEER_CONFIG="/tmp/puppeteer-config-render.json"
    cat > "$PUPPETEER_CONFIG" <<'EOF'
{
  "executablePath": "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "args": ["--no-sandbox", "--disable-setuid-sandbox"]
}
EOF
  fi

  echo "Rendering Mermaid diagrams in $DIAGRAMS_DIR..."
  cd "$DIAGRAMS_DIR"
  for mmd in *.mmd; do
    [[ -f "$mmd" ]] || continue
    png="${mmd%.mmd}.png"

    # Skip if PNG newer than MMD
    if [[ -f "$png" && "$png" -nt "$mmd" ]]; then
      echo "  ✓ $png (up to date)"
      continue
    fi

    echo "  ⚙ rendering $mmd → $png"
    if [[ -n "$PUPPETEER_CONFIG" ]]; then
      mmdc -i "$mmd" -o "$png" -w 1600 --backgroundColor white \
        --puppeteerConfigFile "$PUPPETEER_CONFIG" 2>&1 | grep -E "(Generating|error|Error)" | head -2
    else
      mmdc -i "$mmd" -o "$png" -w 1600 --backgroundColor white 2>&1 | grep -E "(Generating|error|Error)" | head -2
    fi
  done
  cd - >/dev/null
fi

# Find markdown file (single .md in input_dir)
cd "$INPUT_DIR"
MD_FILES=( *.md )
if [[ ${#MD_FILES[@]} -ne 1 || ! -f "${MD_FILES[0]}" ]]; then
  echo "❌ Expected exactly 1 *.md file in $INPUT_DIR, found ${#MD_FILES[@]}"
  exit 1
fi

MD="${MD_FILES[0]}"
DOCX="${MD%.md}.docx"

echo ""
echo "Pandoc convert: $MD → $DOCX"
pandoc "$MD" \
  -o "$DOCX" \
  --resource-path=. \
  --toc \
  --toc-depth=2 \
  --highlight-style=tango

echo ""
echo "✅ Done: $INPUT_DIR/$DOCX"
echo "   Upload to Google Drive → Open with Google Docs"
