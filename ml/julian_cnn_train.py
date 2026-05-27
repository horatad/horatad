#!/usr/bin/env python3
"""
julian_cnn_train.py — Train 2D CNN on JULIAN natal × transit interaction matrices.

Input:  data/julian_ml_features.jsonl  (built by workers/julian_ml_features.mjs)
Output: ml/models/julian_cnn_v1.keras
        ml/models/label_encoder.json
        ml/models/training_history.json

Run from repo root:
    pip install -r ml/requirements.txt
    python ml/julian_cnn_train.py
"""

import json, sys
import numpy as np
from pathlib import Path
from collections import Counter

FEATURES_FILE     = "data/julian_ml_features.jsonl"
MODEL_DIR         = Path("ml/models")
N_PLANETS         = 10
EPOCHS            = 60
BATCH_SIZE        = 256
VAL_SPLIT         = 0.15
TEST_SPLIT        = 0.10
MIN_CLASS_SAMPLES = 200   # drop event types with fewer samples
CONFIDENCE_MIN    = 0.85  # filter low-confidence events

PLANET_NAMES = ['SU','MO','MA','ME','JU','VE','SA','RA','KE','MR']

# ── Load features ─────────────────────────────────────────────────────────────
print(f"Loading {FEATURES_FILE}...")
records = []
with open(FEATURES_FILE) as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError:
            continue

print(f"Total records: {len(records)}")
records = [r for r in records if r.get('confidence', 0) >= CONFIDENCE_MIN]
print(f"After confidence≥{CONFIDENCE_MIN} filter: {len(records)}")

if len(records) < 500:
    print("ERROR: not enough records — run julian_event_scraper.mjs + julian_ml_features.mjs first")
    sys.exit(1)

# ── Build 10×10×4 interaction matrix ──────────────────────────────────────────
# For each (natal_planet_i × transit_planet_j):
#   channel 0: sign circular distance (0-6) → normalized 0..1
#   channel 1: aspect strength (conjunction/trine/square/sextile = 1.0/0.8/0.6/0.4)
#   channel 2: natal planet quality score (-2..3) → normalized 0..1
#   channel 3: transit planet quality score → normalized 0..1
ASPECT_STRENGTH = {0: 1.0, 2: 0.4, 3: 0.6, 4: 0.8, 6: 1.0}

def build_matrix(r):
    m = np.zeros((N_PLANETS, N_PLANETS, 4), dtype=np.float32)
    for i in range(N_PLANETS):
        for j in range(N_PLANETS):
            raw  = abs(int(r['natal'][i]) - int(r['transit'][j]))
            dist = min(raw, 12 - raw)                         # circular 0-6
            m[i, j, 0] = dist / 6.0
            m[i, j, 1] = ASPECT_STRENGTH.get(dist, 0.1)
            m[i, j, 2] = (int(r['natal_q'][i])   + 2) / 5.0  # -2..3 → 0..1
            m[i, j, 3] = (int(r['transit_q'][j]) + 2) / 5.0
    return m

print("Building interaction matrices...")
X_list, y_raw = [], []
for r in records:
    X_list.append(build_matrix(r))
    y_raw.append(r['event_type'])

# ── Drop rare classes ─────────────────────────────────────────────────────────
label_counts = Counter(y_raw)
print("\nLabel distribution:")
for label, cnt in label_counts.most_common():
    bar = '█' * (cnt // 500)
    print(f"  {label:<25} {cnt:6}  {bar}")

valid_labels = {l for l, c in label_counts.items() if c >= MIN_CLASS_SAMPLES}
keep         = [y in valid_labels for y in y_raw]
X_list       = [x for x, k in zip(X_list, keep) if k]
y_raw        = [y for y, k in zip(y_raw,  keep) if k]

label_list   = sorted(valid_labels)
label_to_idx = {l: i for i, l in enumerate(label_list)}
n_classes    = len(label_list)
print(f"\nKept {n_classes} classes ({', '.join(label_list)}), {len(y_raw)} samples")

X = np.stack(X_list)                                 # (N, 10, 10, 4)
y = np.array([label_to_idx[l] for l in y_raw])

# ── Train / val / test split ──────────────────────────────────────────────────
from sklearn.model_selection import train_test_split

X_tmp, X_test, y_tmp, y_test = train_test_split(
    X, y, test_size=TEST_SPLIT, random_state=42, stratify=y)
X_train, X_val, y_train, y_val = train_test_split(
    X_tmp, y_tmp,
    test_size=VAL_SPLIT / (1 - TEST_SPLIT),
    random_state=42, stratify=y_tmp)

print(f"Train: {len(X_train)}  Val: {len(X_val)}  Test: {len(X_test)}")

# ── Class weights ─────────────────────────────────────────────────────────────
from sklearn.utils.class_weight import compute_class_weight

cw = compute_class_weight('balanced', classes=np.arange(n_classes), y=y_train)
class_weight = dict(enumerate(cw.tolist()))
print(f"Class weights: { {label_list[i]: round(w, 2) for i, w in class_weight.items()} }")

# ── Model ─────────────────────────────────────────────────────────────────────
import tensorflow as tf
from tensorflow.keras import layers, models, callbacks as tf_callbacks

tf.random.set_seed(42)

inp = tf.keras.Input(shape=(N_PLANETS, N_PLANETS, 4))
x   = layers.Conv2D(32,  (3, 3), padding='same', activation='relu')(inp)
x   = layers.Conv2D(64,  (2, 2), padding='same', activation='relu')(x)
x   = layers.Conv2D(128, (2, 2), padding='same', activation='relu')(x)
x   = layers.GlobalMaxPooling2D()(x)
x   = layers.Dense(64, activation='relu')(x)
x   = layers.Dropout(0.3)(x)
out = layers.Dense(n_classes, activation='softmax')(x)

model = models.Model(inp, out)
model.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)
model.summary()

total_params = model.count_params()
print(f"\nTotal parameters: {total_params:,}")

# ── Train ─────────────────────────────────────────────────────────────────────
MODEL_DIR.mkdir(parents=True, exist_ok=True)

cb_list = [
    tf_callbacks.EarlyStopping(patience=10, restore_best_weights=True, verbose=1),
    tf_callbacks.ReduceLROnPlateau(patience=5, factor=0.5, min_lr=1e-6, verbose=1),
    tf_callbacks.ModelCheckpoint(
        str(MODEL_DIR / 'julian_cnn_best.keras'), save_best_only=True, verbose=0),
]

print("\nTraining on CPU — estimated time: 5–15 min depending on dataset size\n")
history = model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=EPOCHS,
    batch_size=BATCH_SIZE,
    class_weight=class_weight,
    callbacks=cb_list,
    verbose=1,
)

# ── Evaluate ──────────────────────────────────────────────────────────────────
from sklearn.metrics import classification_report

y_pred = np.argmax(model.predict(X_test, verbose=0), axis=1)

print("\n── Test Set Results ──")
print(classification_report(y_test, y_pred, target_names=label_list))

test_acc = (y_pred == y_test).mean()
print(f"Overall test accuracy: {test_acc:.3f}")

# ── Save ──────────────────────────────────────────────────────────────────────
model.save(str(MODEL_DIR / 'julian_cnn_v1.keras'))
(MODEL_DIR / 'label_encoder.json').write_text(
    json.dumps(label_list, ensure_ascii=False, indent=2))
(MODEL_DIR / 'training_history.json').write_text(
    json.dumps({k: [float(v) for v in vs] for k, vs in history.history.items()}, indent=2))

print(f"\n✅ Model saved → {MODEL_DIR}/julian_cnn_v1.keras")
print(f"   Labels     → {MODEL_DIR}/label_encoder.json")
print(f"   History    → {MODEL_DIR}/training_history.json")
print(f"\nNext step: python ml/julian_cnn_explain.py")
