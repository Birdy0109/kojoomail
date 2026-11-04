# Windows 图标：16/24/32 用小尺寸版（design/icon/icon-small.svg），48 以上用完整版。
# tauri icon 只会从一张大图缩小，小尺寸糊成一团，所以它跑完后再用这个覆盖 icon.ico 和 32x32.png
#   py scripts/make-ico.py      （先跑 scripts/render-icon.cjs 出 PNG）
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
png = root / "design/icon/png"
icons = root / "src-tauri/icons"

frames = [Image.open(png / f"small-{n}.png") for n in (16, 24, 32)] + [Image.open(png / f"full-{n}.png") for n in (48, 64, 128, 256)]
frames = [f.convert("RGBA") for f in frames]
big = frames[-1]
big.save(icons / "icon.ico", format="ICO", sizes=[f.size for f in frames], append_images=frames[:-1])
frames[2].save(icons / "32x32.png")
print("icon.ico:", [f.size for f in frames])
