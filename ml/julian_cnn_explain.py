#!/usr/bin/env python3
"""
julian_cnn_explain.py — SHAP analysis → extract TALS rule candidates.

Input:  data/julian_ml_features.jsonl
        ml/models/julian_cnn_v1.keras
        ml/models/label_encoder.json
Output: ml/models/julian_rules.json   ← feed to workers/julian_ml_correlate.mjs

Each rule = { natal_planet, transit_planet, aspect, importance, hit_rate }
Rules are sorted by importance per event_type.

Run from repo root:
    python ml/julian_cnn_explain.py
"""

import json, sys
import numpy as np
from pathlib import Path
from collections import Counter
import tensorflow as tf
import shap

FEATURES_FILE = "data/julian_ml_features.jsonl"
MODEL_DIR     = Path("ml/models")
TOP_K         = 15    # top K natal×transit pairs per event type
SHAP_SAMPLES  = 500   # samples per class for SHAP analysis
BG_SAMPLES    = 200   # background samples for DeepExplainer

PLANET_NAMES = ['SU','MO','MA','ME','JU','VE','SA','RA','KE','MR']
ASPECT_NAMES = {0:'conjunction', 2:'sextile', 3:'square', 4:'trine', 6:'opposition'}
ASPECT_STRENGTH = {0: 1.0, 2: 0.4, 3: 0.6, 4: 0.8, 6: 1.0}

# ── Load model ────────────────────────────────────────────────────────────────
model_path = MODEL_DIR / 'julian_cnn_v1.keras'
if not model_path.exists():
    print("ERROR: Model not found — run julian_cnn_train.py first")
    sys.exit(1)

model      = tf.keras.models.load_model(str(model_path))
label_list = json.loads((MODEL_DIR / 'label_encoder.json').read_text())
n_classes  = len(label_list)
print(f"Model loaded. Classes: {label_list}")

# ── Rebuild features (same logic as train) ────────────────────────────────────
def build_matrix(r):
    m = np.zeros((10, 10, 4), dtype=np.float32)
    for i in range(10):
        for j in range(10):
            raw  = abs(int(r['natal'][i]) - int(r['transit'][j]))
            dist = min(raw, 12 - raw)
            m[i, j, 0] = dist / 6.0
            m[i, j, 1] = ASPECT_STRENGTH.get(dist, 0.1)
            m[i, j, 2] = (int(r['natal_q'][i])   + 2) / 5.0
            m[i, j, 3] = (int(r['transit_q'][j]) + 2) / 5.0
    return m

print(f"Loading {FEATURES_FILE}...")
records = []
with open(FEATURES_FILE, encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            records.append(json.loads(line))
        except:
            continue

label_to_idx = {l: i for i, l in enumerate(label_list)}
X_list, y_list, raw_records = [], [], []
for r in records:
    if r.get('event_type') not in label_to_idx:
        continue
    X_list.append(build_matrix(r))
    y_list.append(label_to_idx[r['event_type']])
    raw_records.append(r)

X = np.stack(X_list)
y = np.array(y_list)
print(f"Loaded {len(X)} samples")

# ── SHAP DeepExplainer ────────────────────────────────────────────────────────
rng = np.random.default_rng(42)
bg  = X[rng.choice(len(X), min(BG_SAMPLES, len(X)), replace=False)]
print(f"\nBuilding SHAP explainer (background={len(bg)} samples)...")
# GradientExplainer รองรับ GlobalMaxPooling2D ใน TF >= 2.5 (DeepExplainer ไม่รองรับ)
explainer = shap.GradientExplainer(model, bg)

# ── Extract rules per event type ──────────────────────────────────────────────
all_rules = {}

for class_idx, event_type in enumerate(label_list):
    class_mask = (y == class_idx)
    X_class    = X[class_mask]
    raw_cls    = [r for r, m in zip(raw_records, class_mask) if m]

    if len(X_class) < 10:
        print(f"  Skip {event_type} — too few samples ({len(X_class)})")
        continue

    sample_n = min(SHAP_SAMPLES, len(X_class))
    idx_sample = rng.choice(len(X_class), sample_n, replace=False)
    X_sample = X_class[idx_sample]

    print(f"\nSHAP for '{event_type}' ({sample_n}/{len(X_class)} samples)...")
    shap_vals = explainer.shap_values(X_sample)
    # shap_vals: list of n_classes arrays, each (N, 10, 10, 4)
    sv = np.array(shap_vals[class_idx])  # (N, 10, 10, 4)

    # importance[i,j] = mean |SHAP| summed over 4 feature channels
    importance = np.abs(sv).sum(axis=3).mean(axis=0)   # (10, 10)

    # Top K pairs
    flat_sorted = np.argsort(importance.flatten())[::-1][:TOP_K]
    rules = []

    for flat_idx in flat_sorted:
        natal_p   = int(flat_idx // 10)
        transit_p = int(flat_idx % 10)
        imp_val   = float(importance[natal_p, transit_p])

        # Most common aspect for this pair in this class
        dists = []
        for rec in raw_cls:
            raw  = abs(int(rec['natal'][natal_p]) - int(rec['transit'][transit_p]))
            dist = min(raw, 12 - raw)
            dists.append(dist)
        top_dist  = Counter(dists).most_common(1)[0][0]
        asp_name  = ASPECT_NAMES.get(top_dist, 'minor')

        # Hit rate: how often this exact aspect appears in class vs all classes
        class_count = sum(1 for d in dists if d == top_dist)
        all_count   = sum(
            1 for r in raw_records
            if min(abs(int(r['natal'][natal_p]) - int(r['transit'][transit_p])),
                   12 - abs(int(r['natal'][natal_p]) - int(r['transit'][transit_p]))) == top_dist
        )
        hit_rate = round(class_count / all_count, 3) if all_count > 0 else 0.0

        rules.append({
            "natal_planet":   PLANET_NAMES[natal_p],
            "transit_planet": PLANET_NAMES[transit_p],
            "aspect":         asp_name,
            "sign_dist":      int(top_dist),
            "importance":     round(imp_val, 4),
            "hit_rate":       hit_rate,
            "tals_rule":      f"transit_{PLANET_NAMES[transit_p]} {asp_name} natal_{PLANET_NAMES[natal_p]}",
        })

    all_rules[event_type] = rules

    # Print top 3
    print(f"  Top rules for '{event_type}':")
    for r in rules[:3]:
        print(f"    [{r['importance']:.3f}] {r['tals_rule']}  hit_rate={r['hit_rate']}")

# ── Save ──────────────────────────────────────────────────────────────────────
out_path = MODEL_DIR / 'julian_rules.json'
out_path.write_text(json.dumps(all_rules, indent=2, ensure_ascii=False))

print(f"\n✅ Saved rule candidates → {out_path}")
print(f"   {sum(len(v) for v in all_rules.values())} rules across {len(all_rules)} event types")
print(f"\nNext step: node workers/julian_ml_correlate.mjs")

# ── Quick summary table ───────────────────────────────────────────────────────
print("\n── Top Rule per Event Type ──")
print(f"{'Event Type':<25} {'Rule':<55} {'Importance':>10} {'Hit Rate':>9}")
print("-" * 102)
for event_type, rules in all_rules.items():
    if not rules: continue
    top = rules[0]
    print(f"{event_type:<25} {top['tals_rule']:<55} {top['importance']:>10.4f} {top['hit_rate']:>9.3f}")
