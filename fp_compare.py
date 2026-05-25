"""
Fingerprint comparison with visual output
pip install sourceafis pillow numpy
Usage: python fp_compare.py probe.png candidate.png
"""
import sys, json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np
from sourceafis import FingerprintMatcher, FingerprintImage, FingerprintTransparency

MATCH_THRESHOLD = 40  # same as FBI default

def load_fp(path, dpi=512):
    img = np.array(Image.open(path).convert('L'))
    return FingerprintImage(dpi, img)

class Collector(FingerprintTransparency):
    def __init__(self):
        self.probe_minutiae = []
        self.candidate_minutiae = []
        self.pairs = []

    def take_json(self, key, data):
        if key == 'binarized-minutiae-skeleton-minutiae':
            d = json.loads(data)
            if not self.probe_minutiae:
                self.probe_minutiae = d.get('minutiae', [])
            else:
                self.candidate_minutiae = d.get('minutiae', [])
        if key == 'pairing':
            d = json.loads(data)
            self.pairs = d.get('support', [])

def draw_minutiae(img_path, minutiae, matched_indices, label):
    img = Image.open(img_path).convert('RGB')
    draw = ImageDraw.Draw(img)

    for i, m in enumerate(minutiae):
        x, y = int(m['position']['x']), int(m['position']['y'])
        is_match = i in matched_indices
        color = '#00ff00' if is_match else '#ff4444'
        r = 5 if is_match else 3
        draw.ellipse([x-r, y-r, x+r, y+r], outline=color, width=2)
        if m.get('type') == 'bifurcation':
            draw.ellipse([x-r-2, y-r-2, x+r+2, y+r+2], outline='#ffaa00', width=1)

    # label
    draw.rectangle([0, 0, img.width, 22], fill='#000000aa')
    draw.text((6, 4), label, fill='white')
    return img

def compare(probe_path, candidate_path):
    print(f"Loading {probe_path} vs {candidate_path}")
    probe_fp     = load_fp(probe_path)
    candidate_fp = load_fp(candidate_path)

    collector = Collector()
    with collector:
        matcher   = FingerprintMatcher(probe_fp)
        score     = matcher.match(candidate_fp)

    matched_probe     = set(p['probe']     for p in collector.pairs)
    matched_candidate = set(p['candidate'] for p in collector.pairs)

    print(f"\nScore: {score:.1f}  ({'MATCH ✓' if score >= MATCH_THRESHOLD else 'NO MATCH ✗'})")
    print(f"Probe minutiae    : {len(collector.probe_minutiae)}  (matched: {len(matched_probe)})")
    print(f"Candidate minutiae: {len(collector.candidate_minutiae)}  (matched: {len(matched_candidate)})")

    img_probe = draw_minutiae(
        probe_path, collector.probe_minutiae, matched_probe,
        f"PROBE  [{Path(probe_path).name}]  minutiae={len(collector.probe_minutiae)}"
    )
    img_cand = draw_minutiae(
        candidate_path, collector.candidate_minutiae, matched_candidate,
        f"CANDIDATE  [{Path(candidate_path).name}]  minutiae={len(collector.candidate_minutiae)}"
    )

    # side-by-side
    w = img_probe.width + img_cand.width + 20
    h = max(img_probe.height, img_cand.height) + 60
    out = Image.new('RGB', (w, h), '#0d1117')
    out.paste(img_probe, (0, 0))
    out.paste(img_cand,  (img_probe.width + 20, 0))

    draw = ImageDraw.Draw(out)
    verdict_color = '#3fb950' if score >= MATCH_THRESHOLD else '#f85149'
    verdict_text  = f"Score: {score:.1f}   {'MATCH ✓' if score >= MATCH_THRESHOLD else 'NO MATCH ✗'}   (threshold {MATCH_THRESHOLD})"
    draw.rectangle([0, h-50, w, h], fill='#161b22')
    draw.text((10, h-38), verdict_text, fill=verdict_color)

    # legend
    draw.ellipse([w-220, h-38, w-212, h-30], outline='#00ff00', width=2)
    draw.text((w-206, h-40), '= matched minutiae', fill='#8b949e')

    out_path = 'fp_comparison.png'
    out.save(out_path)
    print(f"\nSaved: {out_path}")
    return score

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python fp_compare.py probe.png candidate.png")
        sys.exit(1)
    compare(sys.argv[1], sys.argv[2])
