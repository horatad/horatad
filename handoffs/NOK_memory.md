# NOK_memory — Session Learnings สะสม
# Claude อ่านไฟล์นี้ก่อนทุก session NOK เพิ่มเติมก่อนจบ session

> ไฟล์นี้ ≠ handoff — ไม่มี PENDING/DONE  
> จุดประสงค์: เก็บ platform quirks + design decisions  
> (โค้ด v3/tts.js เป็น memory หลัก — ไฟล์นี้เก็บ WHY ที่โค้ดไม่ได้บอก)

---

## 1. Architecture

```
v3/tts.js       ← NOK engine (ES module, ไม่มี DOM dependency)
v3/v3tab.js     ← consumer: wires ปุ่ม 🔊 + state management
index.html      ← ปุ่ม .v3-speak-btn CSS + markup
sw.js           ← CORE_ASSETS รวม tts.js (offline ใช้ได้)
```

**API surface (exports):**
```javascript
speak(text)         // พูด (chunk-split อัตโนมัติ)
stop()              // หยุด
isSpeaking()        // bool
hasThaiVoice()      // bool — ปุ่ม disabled ถ้า false
isSupported()       // bool — Web Speech API available
preload()           // เรียกตอน DOMContentLoaded (iOS quirk)
```

---

## 2. Platform Quirks — Critical

### iOS Safari
| Quirk | ผลกระทบ | Fix |
|---|---|---|
| Utterance ยาว ~15s → pause | ผู้ใช้คิดว่าพังทั้งที่ยังทำงานอยู่ | chunk-split 180 chars |
| `getVoices()` return empty ครั้งแรก | ปุ่ม disabled ทั้งที่มี Kanya voice | `preload()` ตอน DOMContentLoaded + listen `onvoiceschanged` |
| `error` event type `'canceled'` / `'interrupted'` | fire ตอน user stop เอง ไม่ใช่ error จริง | ignore ทั้งคู่ใน onerror handler |
| Voice name: "Kanya" | ชื่อเฉพาะของ iOS Thai voice | filter ด้วย `lang.startsWith('th')` ไม่ใช่ hardcode name |

### Android Chrome
| Quirk | ผลกระทบ | Fix |
|---|---|---|
| "Google ภาษาไทย" voice | ชื่อต่างจาก iOS | filter lang ไม่ใช่ชื่อ |
| chunk-split ทำงานต่างกันเล็กน้อย | pause สั้นกว่า iOS | ใช้ chunk เดิมได้ |

### Desktop Chrome (no Thai voice)
- `hasThaiVoice()` return false → ปุ่มแสดง disabled
- title hover: "เครื่องนี้ไม่มีเสียงไทย — ติดตั้งใน Settings ก่อน"
- ไม่ crash ไม่ error — graceful degrade

---

## 3. Chunk-split Logic

```
maxLen = 180 chars (iOS 15s pause threshold)
split priority:
  1. sentence boundary: ./!/?/ฯ + space
  2. space ใกล้ maxLen (±20 chars)
  3. char boundary (fallback ถ้าไม่มี space)

strip ก่อน split:
  emoji: /\p{Emoji}/gu
  markdown: **bold** → bold, *italic* → italic, # heading → heading
  bullet: - item → item
  leading space per-line (ป้องกัน TTS pause สั้นๆ)
```

---

## 4. UX Decisions

| Decision | ทำไม |
|---|---|
| toggle pattern (กดซ้ำ = stop) | ปุ่มเดียว ลด cognitive load mobile |
| ปุ่มสีทอง → แดงขณะพูด | visual state ชัดเจนโดยไม่ต้องอ่าน label |
| สลับ tab → หยุดเสียง | เสียงค้างขณะดู tab อื่น = annoying |
| ไม่มี BGM Phase 1 | subjective, annoy risk สูง — wait & see |

---

## 5. Phase Roadmap

| Phase | งาน | สถานะ |
|---|---|---|
| 1 | Web Speech API + ปุ่ม 🔊 | ✅ deployed V3.3.14 |
| 2 | voice selector dropdown + speed slider + highlight + localStorage | 🟢 Claude ทำได้ |
| 3 | Cloud TTS fallback (desktop ไม่มี Thai voice) | ⏸ defer |
| 4 | Audio export MP3 → LINE/QR share | ⏸ defer |
| 5 | Podcast / daily horoscope audio auto-gen | 🔲 vision |
| 6 | Voice cloning | 🔲 research |

**Phase 2 — ลำดับแนะนำ:**
1. บันทึก voice preference ลง localStorage (ทำก่อน selector — มี storage แล้วค่อย UI)
2. voice selector dropdown
3. speed slider
4. highlight ประโยค (`utterance.onboundary`) — ซับซ้อนที่สุด ทำหลัง

---

## 6. WHY LOG สะสม

- **Web Speech API Phase 1 ไม่ใช่ Cloud TTS** — ฟรี + offline + 0ms latency. Cloud เพิ่ม network dependency + cost ทุก call → Phase 3 fallback เท่านั้น
- **chunk 180 ไม่ใช่ 200** — iOS pause threshold ทดสอบพบที่ ~190 chars → ใช้ 180 เพื่อ safety margin
- **ชื่อไฟล์ `tts.js` ไม่ใช่ `nok.js`** — ตาม pattern engine.js/typhoon.js/interpretation.js (ชื่อหน้าที่ ไม่ใช่ชื่อ project)
- **strip ที่ NOK ไม่ใช่ BIBLE** — BIBLE ยังคง output markdown ตามปกติ NOK รับผิดชอบ clean ก่อน speak — separation of concerns

---

## 7. อัปเดต

| วันที่ | สิ่งที่เพิ่ม |
|---|---|
| 2026-05-23 | สร้างไฟล์ครั้งแรก — architecture, platform quirks, chunk-split, UX decisions, WHY LOG |
