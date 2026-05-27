// v3/julian_adapter.js — JULIAN plug-in interface
// HORATAD ใช้ stub นี้ทันที, JULIAN session implement จริงโดย override exports
//
// Contract (JULIAN จะ implement):
//   getEmpiricalP(ruleId)  → number 0-1 | null
//     null = ไม่มีข้อมูล → ถือว่า empirical_p = 1.0 (ไม่เปลี่ยน weight)
//
//   findSimilar(chartState, opts) → JulianRecord[]
//     JulianRecord: { name, jd, occupation, tags[], similarity }
//     [] = JULIAN ยังไม่พร้อม

export function getEmpiricalP(ruleId) {
  return null;
}

export function findSimilar(chartState, opts = {}) {
  return [];
}
