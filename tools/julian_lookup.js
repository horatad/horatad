/**
 * tools/julian_lookup.js
 * Client-side ES module สำหรับ query JULIAN index จาก Horatad PWA
 *
 * ใช้ได้ใน: browser, Service Worker context
 * ไม่ต้องการ Node.js API — ใช้ fetch() เท่านั้น
 *
 * Usage:
 *   import { JulianLookup, PLANETS, SIGN_NAMES_TH } from './tools/julian_lookup.js';
 *
 *   const lookup = new JulianLookup();
 *   const meta   = await lookup.loadMeta();
 *   const result = await lookup.queryPlanetSign('SA', 10); // Saturn in Kumbha
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** GitHub raw URL ของ horatad/julian-data repo — CORS-free, ฟรีไม่จำกัด */
const DEFAULT_BASE = 'https://raw.githubusercontent.com/horatad/julian-data/main/index';

/** ลำดับดาวตรงกับ engine output (engineIdx = arrayIdx + 1) */
const PLANETS = ['SU', 'MO', 'MA', 'ME', 'JU', 'VE', 'SA', 'RA', 'KE', 'MR'];

/** ชื่อราศีภาษาไทย (index 0-11 = เมษ..มีน) */
const SIGN_NAMES_TH = [
  'เมษ', 'พฤษภ', 'เมถุน', 'กรกฎ', 'สิงห์', 'กันย์',
  'ตุล', 'พิจิก', 'ธนู', 'มกร', 'กุมภ์', 'มีน',
];

// ดาวหลักที่ใช้ prefetch (4 ดาว × 12 ราศี = 48 ไฟล์)
const PREFETCH_DEFAULT_PLANETS = ['SU', 'MO', 'SA', 'JU'];

// batch size สำหรับ prefetch (ป้องกัน flood network)
const PREFETCH_BATCH_SIZE = 6;

// ─── JulianLookup class ────────────────────────────────────────────────────────

class JulianLookup {
  /**
   * @param {object} options
   * @param {string}    [options.baseUrl]  - base URL ของ index dir (ไม่มี trailing slash)
   * @param {Map|object}[options.cache]    - cache object ที่มี .get/.set/.has (default: new Map())
   */
  constructor(options = {}) {
    this._base  = (options.baseUrl ?? DEFAULT_BASE).replace(/\/$/, '');
    this._cache = options.cache ?? new Map();

    // stats สำหรับ getStats()
    this._filesLoaded   = 0;
    this._recordsLoaded = 0;

    // meta จะถูก load ครั้งแรกที่ใช้
    this._meta = null;
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  /**
   * fetch JSON จาก URL — throw ถ้า HTTP error (ไม่กลืน error)
   * @param {string} url
   * @returns {Promise<any>}
   */
  async _fetchJSON(url) {
    let res;
    try {
      res = await fetch(url);
    } catch (netErr) {
      throw new Error(`[JulianLookup] network error fetching ${url}: ${netErr.message}`);
    }
    if (!res.ok) {
      throw new Error(`[JulianLookup] HTTP ${res.status} fetching ${url}`);
    }
    let data;
    try {
      data = await res.json();
    } catch (parseErr) {
      throw new Error(`[JulianLookup] JSON parse error from ${url}: ${parseErr.message}`);
    }
    return data;
  }

  /**
   * fetch + cache โดยใช้ cacheKey
   * @param {string} cacheKey   - unique key ใน cache
   * @param {string} url        - URL ที่จะ fetch
   * @param {number} [expectedRecords] - จำนวน records ที่ควรมี (สำหรับ stats, optional)
   * @returns {Promise<any>}
   */
  async _fetchCached(cacheKey, url, expectedRecords) {
    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey);
    }

    const data = await this._fetchJSON(url);
    this._cache.set(cacheKey, data);
    this._filesLoaded++;

    // นับ records สำหรับ stats
    if (expectedRecords !== undefined) {
      this._recordsLoaded += expectedRecords;
    } else if (Array.isArray(data)) {
      this._recordsLoaded += data.length;
    } else if (data && typeof data.shown === 'number') {
      this._recordsLoaded += data.shown;
    }

    return data;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * โหลด meta.json (routing map + stats) — cache ไว้หลังโหลดครั้งแรก
   *
   * meta มี: generated, version, total, planets, year_range,
   *          year_map, planet_sign_top_n, file_types, split_log
   *
   * @returns {Promise<object>} meta object
   */
  async loadMeta() {
    if (this._meta) return this._meta;

    const url  = `${this._base}/meta.json`;
    const data = await this._fetchCached('__meta__', url);

    if (!data || typeof data !== 'object') {
      throw new Error('[JulianLookup] meta.json format ไม่ถูกต้อง');
    }
    if (!data.year_map) {
      throw new Error('[JulianLookup] meta.json ไม่มี year_map — index อาจยังไม่ได้ build');
    }

    this._meta = data;
    return data;
  }

  /**
   * Query mini records ตาม planet + sign — primary TALS query
   *
   * ผลลัพธ์ sorted by importance desc, capped at planet_sign_top_n (3000)
   * Mini record fields: { q, n, j, y, a, i, c, s }
   *   q = qid, n = name, j = jd, y = birthYear, a = accuracy,
   *   i = importance, c = country, s = signs[10]
   *
   * @param {string} planet - planet key เช่น 'SA', 'SU', 'MO'
   * @param {number} sign   - sign index 0-11
   * @returns {Promise<{total: number, shown: number, records: MiniRecord[]}>}
   */
  async queryPlanetSign(planet, sign) {
    if (!PLANETS.includes(planet)) {
      throw new Error(`[JulianLookup] planet ไม่รู้จัก: "${planet}" (ใช้ได้: ${PLANETS.join(', ')})`);
    }
    if (typeof sign !== 'number' || sign < 0 || sign > 11) {
      throw new Error(`[JulianLookup] sign ต้องเป็น 0-11, ได้: ${sign}`);
    }

    const cacheKey = `planet_sign/${planet}/${sign}`;
    const url      = `${this._base}/planet_sign/${planet}/${sign}.json`;
    const data     = await this._fetchCached(cacheKey, url);

    // validate shape
    if (!data || !Array.isArray(data.records)) {
      throw new Error(`[JulianLookup] planet_sign/${planet}/${sign}.json format ไม่ถูกต้อง`);
    }

    return data;
  }

  /**
   * Query full records ตามปีเกิด — ใช้ meta.year_map เลือก tier ที่ถูกต้องอัตโนมัติ
   *
   * Tier routing (ตรงกับ index builder):
   *   year ≥1900 → by_year/YYYY.json
   *   year 1700-1899 → by_decade/NNNNs.json
   *   year <1700 → by_50yr/NNNN-NNNN.json
   *
   * Full record = original record + signs[10] field
   *
   * หมายเหตุ: ปีที่ถูก split (_a + _b) จะ merge กลับมาให้อัตโนมัติ
   *
   * @param {number} year - ปี ค.ศ.
   * @returns {Promise<FullRecord[]>}
   */
  async queryYear(year) {
    if (typeof year !== 'number' || !Number.isFinite(year)) {
      throw new Error(`[JulianLookup] year ต้องเป็นตัวเลข, ได้: ${year}`);
    }

    const meta = await this.loadMeta();
    const key  = this._yearToMapKey(year, meta);

    // ตรวจ meta.year_map
    const mapped = meta.year_map[key];
    if (!mapped) {
      // ไม่มีข้อมูลสำหรับปีนี้ — return array ว่างแทนการ throw (ปีที่ยังไม่มีคน)
      console.warn(`[JulianLookup] ไม่พบ key "${key}" ใน year_map — อาจไม่มีข้อมูลปีนี้`);
      return [];
    }

    // mapped อาจเป็น string (ปกติ) หรือ array (split)
    if (Array.isArray(mapped)) {
      // split file → fetch ทั้งสองแล้ว merge
      const [pathA, pathB] = mapped;
      const [partA, partB] = await Promise.all([
        this._fetchCached(`timebucket/${pathA}`, `${this._base}/${pathA}`),
        this._fetchCached(`timebucket/${pathB}`, `${this._base}/${pathB}`),
      ]);
      const mergedRecords = [
        ...(Array.isArray(partA) ? partA : []),
        ...(Array.isArray(partB) ? partB : []),
      ];
      return mergedRecords;
    }

    // ปกติ — single file
    const data = await this._fetchCached(`timebucket/${mapped}`, `${this._base}/${mapped}`);
    if (!Array.isArray(data)) {
      throw new Error(`[JulianLookup] ${mapped} ไม่ใช่ array`);
    }
    return data;
  }

  /**
   * ค้นหาชื่อ — search จาก cache ที่โหลดไว้แล้วเท่านั้น (ไม่ fetch ใหม่)
   *
   * Scope: time-bucket files ที่ cache ไว้เท่านั้น (by_year, by_decade, by_50yr)
   * planet_sign files ไม่รวม (mini record — ไม่ครบชื่อ)
   *
   * หมายเหตุ: ถ้าต้องการค้นหาที่ครอบคลุมกว่านี้ ให้ queryYear ก่อนเพื่อโหลด cache
   *
   * @param {string} query - search string (case-insensitive, partial match)
   * @returns {FullRecord[]} records ที่ name มี query อยู่
   */
  async searchByName(query) {
    if (!query || typeof query !== 'string') {
      throw new Error('[JulianLookup] query ต้องเป็น string ที่ไม่ว่าง');
    }

    const lower   = query.toLowerCase();
    const results = [];

    for (const [key, data] of this._cache.entries()) {
      // ค้นเฉพาะ time-bucket files (prefix = "timebucket/")
      if (!key.startsWith('timebucket/')) continue;

      const records = Array.isArray(data)
        ? data
        : (Array.isArray(data?.records) ? data.records : []);

      for (const rec of records) {
        if (rec && typeof rec.name === 'string' && rec.name.toLowerCase().includes(lower)) {
          results.push(rec);
        }
      }
    }

    return results;
  }

  /**
   * Warm up Service Worker cache ล่วงหน้า
   *
   * Default: top 4 ดาว (SU, MO, SA, JU) × 12 ราศี = 48 ไฟล์
   * รัน fetch เป็น batch ละ 6 (ไม่ flood) — ใช้ใน sw.js install event
   *
   * @param {string[]} [planets] - planet keys ที่จะ prefetch (default: SU, MO, SA, JU)
   * @param {number[]} [signs]   - sign indices ที่จะ prefetch (default: 0-11)
   * @returns {Promise<{ok: number, failed: number, skipped: number}>}
   */
  async prefetchCoreIndex(planets, signs) {
    const targetPlanets = planets ?? PREFETCH_DEFAULT_PLANETS;
    const targetSigns   = signs   ?? [0,1,2,3,4,5,6,7,8,9,10,11];

    // validate
    for (const p of targetPlanets) {
      if (!PLANETS.includes(p)) {
        throw new Error(`[JulianLookup] prefetch: planet ไม่รู้จัก "${p}"`);
      }
    }

    // สร้าง task list (planet × sign combinations)
    const tasks = [];
    for (const p of targetPlanets) {
      for (const s of targetSigns) {
        const cacheKey = `planet_sign/${p}/${s}`;
        // skip ถ้า cache มีแล้ว
        if (this._cache.has(cacheKey)) {
          tasks.push({ planet: p, sign: s, cached: true });
        } else {
          tasks.push({ planet: p, sign: s, cached: false });
        }
      }
    }

    let ok = 0, failed = 0, skipped = 0;

    // fetch เป็น batch ละ PREFETCH_BATCH_SIZE
    const pending = tasks.filter(t => !t.cached);
    skipped = tasks.length - pending.length;

    for (let i = 0; i < pending.length; i += PREFETCH_BATCH_SIZE) {
      const batch = pending.slice(i, i + PREFETCH_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(t => this.queryPlanetSign(t.planet, t.sign))
      );
      for (const r of results) {
        if (r.status === 'fulfilled') {
          ok++;
        } else {
          failed++;
          // log error แต่ไม่ throw — prefetch ไม่ควรทำให้ app พัง
          console.error(`[JulianLookup] prefetch failed: ${r.reason?.message ?? r.reason}`);
        }
      }
    }

    return { ok, failed, skipped };
  }

  /**
   * โหลด images.json (lazy, cached) — { QID: filename }
   * @returns {Promise<object>} imageMap
   */
  async loadImageIndex() {
    const cacheKey = '__images__';
    if (this._cache.has(cacheKey)) return this._cache.get(cacheKey);
    const map = await this._fetchJson(`${this._base}/images.json`);
    this._cache.set(cacheKey, map);
    this._filesLoaded++;
    return map;
  }

  /**
   * สร้าง Wikimedia Commons thumbnail URL จาก QID
   * @param {string} qid   - Wikidata QID เช่น "Q937"
   * @param {number} width - ความกว้าง px (default 120)
   * @returns {Promise<string|null>} thumbnail URL หรือ null ถ้าไม่มีรูป
   */
  async getImageUrl(qid, width = 120) {
    if (!qid) return null;
    const map = await this.loadImageIndex();
    const filename = map[qid];
    if (!filename) return null;
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${width}`;
  }

  /**
   * สถิติ cache ปัจจุบัน
   * @returns {{ cacheSize: number, filesLoaded: number, recordsLoaded: number }}
   */
  getStats() {
    return {
      cacheSize    : this._cache.size,
      filesLoaded  : this._filesLoaded,
      recordsLoaded: this._recordsLoaded,
    };
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  /**
   * แปลง year → key สำหรับ meta.year_map
   * ต้องตรงกับ logic ของ julian_index_builder.mjs: yearToFilePath() → pathKey extraction
   *
   * year ≥1900 → "YYYY"
   * year 1700-1899 → "NNNNs"  (decade เช่น "1890s")
   * year <1700 → "NNNN-NNNN" (50yr block เช่น "1450-1499")
   */
  _yearToMapKey(year, meta) {
    // ถ้ามี year_range ใน meta ให้ clamp ก่อน (ป้องกัน key ที่ไม่มีใน map)
    const yr = meta?.year_range
      ? Math.max(meta.year_range.min, Math.min(meta.year_range.max, year))
      : year;

    if (yr >= 1900) return String(yr);
    if (yr >= 1700) return `${Math.floor(yr / 10) * 10}s`;
    return `${Math.floor(yr / 50) * 50}-${Math.floor(yr / 50) * 50 + 49}`;
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { JulianLookup, PLANETS, SIGN_NAMES_TH };
