"""캐릭터 스티커 시트(4열×6행)를 포즈별 PNG로 자르기. 그림은 손대지 않고 자르기 + (배경이 균일한 흰색일 때만) 흰 배경 투명화.
사용: python3 tools/crop_mascot.py <시트.png> [--cols 4 --rows 6]
결과: public/mascot/*.png, 시트 옆에 <시트폴더>/mascot_sheet_crops_preview.png(자른 칸 미리보기)
POSES 의 (행, 열)은 시트를 보고 맞게 고치세요 (1부터 셈)."""
import sys, shutil, argparse
from pathlib import Path
from PIL import Image, ImageDraw

POSES = {"wave": (1, 1), "good": (1, 4), "best": (4, 2), "wink": (4, 4), "flower": (5, 1), "cheer": (5, 3), "point": (5, 4)}

def whiten_to_alpha(im: Image.Image, thr=245) -> Image.Image:
    im = im.convert("RGBA"); px = im.load(); w, h = im.size
    border = [px[x, y] for x in range(w) for y in (0, h - 1)] + [px[x, y] for y in range(h) for x in (0, w - 1)]
    if sum(1 for p in border if min(p[:3]) >= thr) < 0.9 * len(border):
        return im  # 배경이 깨끗하지 않으면 그대로 둠
    from collections import deque
    seen = set(); q = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while q:  # 가장자리에서 이어진 흰색만 투명 (캐릭터 안의 흰색은 유지)
        x, y = q.popleft()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h): continue
        seen.add((x, y)); p = px[x, y]
        if min(p[:3]) < thr: continue
        px[x, y] = (p[0], p[1], p[2], 0); q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    return im

def gutters(im: Image.Image, n: int, axis: int):
    """칸 사이 흰 띠(가장 비어 있는 줄)를 찾아 경계로 씀. 균등 분할 ±40px 안에서 탐색"""
    g = im.convert("L"); w, h = g.size; px = g.load()
    L = w if axis == 0 else h
    def ink(i):
        return sum(1 for j in range(h if axis == 0 else w) if (px[i, j] if axis == 0 else px[j, i]) < 235)
    cuts = [0]
    for k in range(1, n):
        c = round(L * k / n); cand = range(max(c - 40, 1), min(c + 40, L - 1))
        vals = [(ink(i), i) for i in cand]; m = min(v for v, _ in vals); best = [i for v, i in vals if v == m]
        cuts.append(best[len(best) // 2])
    return cuts + [L]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("sheet"); ap.add_argument("--cols", type=int, default=4); ap.add_argument("--rows", type=int, default=6)
    a = ap.parse_args(); src = Image.open(a.sheet); W, H = src.size
    xs, ys = gutters(src, a.cols, 0), gutters(src, a.rows, 1)
    out = Path(__file__).resolve().parent.parent / "public" / "mascot"; out.mkdir(parents=True, exist_ok=True)
    prev = src.convert("RGB").copy(); d = ImageDraw.Draw(prev)
    for name, (r, c) in POSES.items():
        box = (xs[c - 1], ys[r - 1], xs[c], ys[r])
        cell = whiten_to_alpha(src.crop(box)); bb = cell.getchannel("A").getbbox()
        if bb:  # 내용 둘레 + 6px 여백으로 다듬기 (그림 자체는 그대로)
            bb = (max(bb[0] - 6, 0), max(bb[1] - 6, 0), min(bb[2] + 6, cell.width), min(bb[3] + 6, cell.height)); cell = cell.crop(bb)
        cell.save(out / f"{name}.png")
        d.rectangle(box, outline=(220, 40, 40), width=3); d.text((box[0] + 6, box[1] + 4), name, fill=(220, 40, 40))
    prev.save(Path(a.sheet).with_name("mascot_sheet_crops_preview.png"))  # 미리보기는 배포 폴더 밖에; print("saved", sorted(POSES), "→", out)

if __name__ == "__main__": main()
