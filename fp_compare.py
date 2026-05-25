"""
Fingerprint comparison — ORB feature matching
pip install opencv-python numpy pillow
Usage: python fp_compare.py probe.png candidate.png
"""
import cv2, sys, numpy as np
from PIL import Image, ImageDraw, ImageFont

GOOD_DIST    = 50   # max match distance (lower = stricter)
MATCH_THRESH = 15   # % matched keypoints to call MATCH

def compare(path1, path2):
    img1 = cv2.imread(path1, cv2.IMREAD_GRAYSCALE)
    img2 = cv2.imread(path2, cv2.IMREAD_GRAYSCALE)
    if img1 is None or img2 is None:
        print("Cannot open image files"); sys.exit(1)

    orb = cv2.ORB_create(nfeatures=500)
    kp1, des1 = orb.detectAndCompute(img1, None)
    kp2, des2 = orb.detectAndCompute(img2, None)

    if des1 is None or des2 is None:
        print("No features found"); sys.exit(1)

    bf      = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = sorted(bf.match(des1, des2), key=lambda m: m.distance)
    good    = [m for m in matches if m.distance < GOOD_DIST]
    score   = len(good) / max(len(kp1), len(kp2)) * 100
    verdict = score >= MATCH_THRESH

    print(f"Keypoints : {len(kp1)} / {len(kp2)}")
    print(f"Matches   : {len(good)} good / {len(matches)} total")
    print(f"Score     : {score:.1f}%")
    print(f"Result    : {'MATCH' if verdict else 'NO MATCH'}  (threshold {MATCH_THRESH}%)")

    # draw matching lines
    out = cv2.drawMatches(
        img1, kp1, img2, kp2, good[:40], None,
        matchColor=(0, 255, 0),
        singlePointColor=(60, 60, 255),
        flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS
    )

    # verdict bar at bottom
    bar_h = 48
    bar   = np.zeros((bar_h, out.shape[1], 3), dtype=np.uint8)
    bar[:] = (22, 27, 34)
    color  = (63, 185, 80) if verdict else (241, 81, 73)
    text   = f"Score: {score:.1f}%   {'MATCH' if verdict else 'NO MATCH'}   (threshold {MATCH_THRESH}%)"
    cv2.putText(bar, text, (12, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
    out = np.vstack([out, bar])

    out_path = 'fp_comparison.png'
    cv2.imwrite(out_path, out)
    print(f"\nSaved: {out_path}")

if len(sys.argv) < 3:
    print("Usage: python fp_compare.py probe.png candidate.png")
    sys.exit(1)

compare(sys.argv[1], sys.argv[2])
