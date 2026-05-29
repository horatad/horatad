# BIBLE Memory — QUALITY (คุณภาพดาว)
# Type: Reference (editable if error found)
# Last updated: 2026-05-23

## ตารางคุณภาพ

| คำ | ความหมายย่อ | Pattern กราฟ |
|---|---|---|
| เกษตร | มั่นคง ให้ผลช้า-เต็มบั้นปลาย | ↗ เส้นตรงเอียงขึ้น |
| ประเกษตร (ประ) | ขาดแคลน เสื่อมถอย-ตกต่ำบั้นปลาย | ↘ เส้นตรงเอียงลง |
| อุจ | รุ่งโรจน์ นิยม แรงสม่ำเสมอ | — สูง (เส้นนอนระดับสูง) |
| นิจ | ด้อย ไม่ยอมรับ สม่ำเสมอ | — ต่ำ (เส้นนอนระดับต่ำ) |
| มหาจักร | ผาดโผน รวดเร็ว ไม่สม่ำเสมอ | ≈ คลื่นชีพจร |
| จุลจักร | เช่นมหาจักรแต่ ~60% | ≈ เล็กกว่า |
| ราชาโชค | ได้มาง่าย สบาย ไม่ลงแรง สม่ำเสมอ | — กลาง-ดี |
| เทวีโชค | เช่นราชาโชค ~60% (ยกเว้นกุมลัคนา ≈ ราชาโชค) | |
| อุจจาวิลาส | ราศีก่อนอุจ ≈ 60% ของอุจ | |
| อุจจาภิมุข | ราศีหลังอุจ ≈ 60% ของอุจ | |
| อนุเกษตร | ดาวสลับเรือนเกษตรกัน ให้คุณตั้งแต่เกิดแต่ช้ากว่าเกษตร | |

## กฎลบ-ลบ=บวก (Quality Reversal)
**ใช้เฉพาะ**: เกษตร / ประเกษตร / อุจ / นิจ เท่านั้น
**ห้ามใช้กับ**: มหาจักร, อุจจาวิลาส, อุจจาภิมุข, ราชาโชค, เทวีโชค

```
เกษตร + เกษตร + เล็งกัน → ประเกษตร (ดีก่อน แล้วเสื่อม)
นิจ + นิจ + เล็งกัน → อุจ (ไม่ดีก่อน แล้วดี)
ประเกษตร + นิจ + เล็งกัน → เกษตร
```

## อุจ vs มหาจักร — ความต่าง (confirmed ch101 + user 2026-05-29)
| | อุจ | มหาจักร |
|---|---|---|
| ระดับ | สูงสม่ำเสมอตลอดเวลา | ผันผวน — บางช่วงสูงสุด บางช่วงปกติ |
| การเข้าสังคม | คุยกับคนทั่วไปยาก (มากเกินไป) | ยืดหยุ่นกว่า เข้าสังคมได้ดีกว่า |
| ตัวอย่าง (3) | เจ้าเหตุผลตลอดเวลา น่าเบื่อ | ตรรกะสูงบางช่วง ปกติบางช่วง |
| อุปมา | ไฟบ้านที่นิ่งสม่ำเสมอ | ไฟบ้านที่มีความเสี่ยงไฟตก |
| volatility | ต่ำ (สม่ำเสมอ) | สูง (peak ใกล้อุจ แต่ drop ได้) |
| อันดับ | อันดับ 1 | อันดับ 2 รองอุจ (ไม่ระบุ % ชัดเจนในตำรา) |

**strength_pct model (user-confirmed 2026-05-29):**
- ตำราไม่ระบุ % ชัดเจน → ใช้ 80% เป็น average effective strength
- แต่ที่ต่างจาก อุจ = **volatility สูง** (field `volatility: "high"` ใน tals_quality_rules.json)
- engine ควร model เป็น: base=80% แต่ variance สูง (ไม่ใช่ flat 80% เหมือนเกษตร)

## คุณภาพดาว + ไม่สัมพันธ์ลัคนา
- ดาวคุณภาพดีแต่ไม่สัมพันธ์ลัคนา → ช่วยได้แค่ส่วนน้อย (ไม่แสดงออกชัด)
- ตัวอย่าง: จันทร์(2) อุจจาภิมุข ไม่สัมพันธ์ลัคนา → ช่วยแค่กริยามารยาท ไม่ช่วยพูดจาอ่อนหวาน

---
## Clarifications + Warnings (user 2026-05-26)

### ราชาโชค — Thai tradition (NOT geometric)
- เป็น **tradition lookup ของไทย** — per planet ตำแหน่งคงที่ตามตำรา
- **ไม่ใช่ derivable rule** (ไม่มี formula geometric)
- ⚠️ **Name collision:** Vedic Raja Yoga = คนละ concept (ดาวคนละตำแหน่ง คนละเรื่อง)
- ห้าม KB extract/merge ที่อ้าง Vedic source แล้วเรียกว่า ราชาโชค

### เทวีโชค — ความสัมพันธ์กับ ราชาโชค
- engine.js code computes: เทวีโชค = (ราชาโชค + 6) mod 12
- master_dict.qualities บอก: "เช่นราชาโชคแต่กำลัง 60%"
- ❓ Open: ความสัมพันธ์ +6 เป็น geometric หรือ tradition? (engine assumes geometric, ตำรายัง verify ไม่ได้)
- **Default assumption:** ใช้ +6 formula จนกว่าจะ verify เป็นอื่น

### อนุเกษตร — interpretation นัยใหม่
- เกิดจาก: ดาวสลับเกษตรกัน
- **Personality reading:** ก้าวหน้าช้าในวัยต้น · ค่อยดีขึ้นเมื่ออายุมาก
- **Causation:** ตัวเกี่ยวข้องกับ 2 เรื่องราว → ตัดสินใจไม่ได้ → ช้า
- **Strength curve:** ขึ้นช้ากว่าเกษตร (delayed onset)

### ประเกษตร / ประ
- "ประ" = **คุณภาพเสีย** (degraded) ชัดเจน
- ตำแหน่ง: ราศีตรงข้ามเกษตร = (kaset + 6) mod 12
- Strength: -60% (per script.js STD_SCORE)

---
## ⚠ CORRECTIONS + ADDITIONS 2026-05-27 (per ch020 + ch025)

### Aspect-to-Lagna weights (CANONICAL per ch025)

| Aspect | Weight | Source |
|---|---|---|
| กุมลัคนา | 100% | ch025 |
| เล็งลัคนา | 80% | ch025 |
| โยคหน้า | 60% | ch025 |
| โยคหลัง | 60% | ch025 |
| ตรีโกณลัคนา | 50% | ch025 |
| ไม่สัมพันธ์ | NULL — counts as อัจฉริยภาพภายใน | ch020 step 7 |

**Engine.js MATCHES** (KUM:1.0, LENG:0.8, YOK:0.6, TRI:0.5) ✅
**master_dict_meanings.json FIXED** v1.5.0 (100/80/60/50) ✅ — corrected 2026-05-27

### ดาวเด่น cross-class comparison (ch025)

**Same-class:** weight by aspect (กุม > เล็ง > โยค > ตรีโกณ)

**Cross-class:**
- อุจกุมลัคนา > เกษตร/ราชาโชค กุมลัคนา
- อุจกุมลัคนา ≈ มหาจักรกุมลัคนา (ผลคนละด้าน, ต่างเล็กน้อย)
- (อุจ/มหาจักร)กุมลัคนา > อันเดียวกัน เล็ง/โยค/ตรี
- เกษตรกุมลัคนา ≈ (อุจ/มหาจักร) โยค/ตรี
- (อุจ/มหาจักร) เล็งลัคนา > เกษตรกุมลัคนา (วัยต้น — ให้ผลเร็วแรง)
- **บั้นปลาย: เกษตร > อุจ/มหาจักร** (เกษตรช้าแต่มั่นคง)

### Quality TIME PROFILE (critical for scoring)

| Quality | Onset | Sustainability |
|---|---|---|
| อุจ / มหาจักร | Fast / strong | Variable (peak then drop) |
| เกษตร | Slow | Lasting (บั้นปลายชนะ) |
| ราชาโชค / เทวีโชค | Moderate | Steady (สม่ำเสมอ) |
| อุจจาวิลาส | Building (pre-อุจ) | Rising 60% |
| อุจจาภิมุข | Declining (post-อุจ) | Falling 60% |
| จุลจักร | Moderate | Like มหาจักร but ~60% |
| ประเกษตร | Slow decline | Worsens บั้นปลาย |
| นิจ | Immediate weakness | Permanent low |

### ดาวเด่น scoring formula (TALS-canonical)

```
ดาวเด่น_score(planet) = quality_strength × aspect_weight × time_phase_factor

→ Use ranking to:
  • อาชีพ_top = top-ranked planet (career = ถูกโฉลกที่สุด)
  • อาชีพ_secondary = 2nd-ranked
  • Same logic for: ลักษณะเด่น, สมพงศ์ comparison, etc.
```

### 🔴 Anti-pattern: ดูอาชีพจาก ภพกัมมะ อย่างเดียว

ch025 explicitly states career judged by **ดาวเด่น (planet ranking)**, NOT ภพกัมมะ (10) alone.
→ Common Vedic/Western pattern of "10th house = career" → WRONG in TALS
→ TALS: rank all planets by ดาวเด่น_score → top planet's nature = career direction

---

## ⭐ Planet Quality = Sign-Based → Birth Date Sufficient (added 2026-05-29)

**หลักการ (ยืนยันจาก comparative analysis session 2026-05-29):**

คุณภาพดาวใน TALS กำหนดโดย **ราศีที่ดาวสถิต** เท่านั้น ไม่ใช่ภพเรือน

- ราศีของดาวไม่เปลี่ยนตามเวลาเกิดในวันเดียวกัน (ดาวเคลื่อนช้า)
- ดังนั้น **quality ของทุกดาวในดวงชาตา = deterministic จากวันเกิด** ไม่ต้องการเวลาเกิด
- เวลาเกิดเพิ่ม: ลัคนา (activation routing) + house routing เท่านั้น

**เปรียบกับระบบอื่น:**
- Western/ไทยดั้งเดิม: quality บางส่วนขึ้นกับ house placement → ขาดเวลาเกิด = ขาด quality บางส่วน
- TALS: quality อยู่ใน sign ไม่ใช่ house → ขาดเวลาเกิด = ยังรู้ quality ครบ 100%

**Two-tier research model:**

| ระดับ | ต้องการ | ทดสอบ TALS ด้านไหน |
|---|---|---|
| Quality Research | วันเกิดเพียงอย่างเดียว | Rule #5 (ดาวเด่น vs อาชีพ), quality correlations |
| Activation Research | วันเกิด + เวลาเกิด | Rule #2 (lagna activation), chart strength |

## ⭐ ไม่สัมพันธ์ลัคนา = อัจฉริยภาพภายใน — ห้ามบอกว่า "ผลน้อย" (added 2026-05-29)

⚠️ **Hallucination ที่เกิดบ่อย** — Claude เคยบอกว่า "ไม่สัมพันธ์ลัคนา → ผลน้อยมาก"

**ถูกต้อง (ch020 step 7):**
- ไม่สัมพันธ์ลัคนา = **อัจฉริยภาพภายใน (internal talent)**
- ดาวยังมีผล แต่เป็น "ด้านใน" ไม่ออกมาในโลกภายนอก ไม่ถูก trigger โดยเหตุการณ์
- ตัวอย่าง: จันทร์อุจจาภิมุข **ไม่สัมพันธ์ลัคนา** → ช่วยกริยามารยาท แต่ไม่ช่วยพูดจาอ่อนหวานกับคนอื่น (ออกฤทธิ์ภายใน ไม่ภายนอก)
- **แตกต่างจากทุกระบบอื่น** — ระบบอื่นไม่มี concept นี้ ทุกดาวมีผลระดับต่างๆ เสมอ
