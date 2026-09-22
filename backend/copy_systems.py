import shutil
from pathlib import Path

src_dir = Path(r"e:\DT-54\9 systems\9 systems\dist")
dst_dir = Path(r"e:\DT-54\nine-systems")

if dst_dir.exists():
    shutil.rmtree(dst_dir)
shutil.copytree(src_dir, dst_dir)

idx_file = dst_dir / "index.html"
idx_text = idx_file.read_text(encoding="utf-8")
idx_text = idx_text.replace('src="/assets/', 'src="./assets/').replace('href="/assets/', 'href="./assets/')
idx_file.write_text(idx_text, encoding="utf-8")

for js_file in (dst_dir / "assets").glob("*.js"):
    js_text = js_file.read_text(encoding="utf-8")
    js_text = js_text.replace('"/models/', '"./models/').replace("'/models/", "'./models/")
    js_file.write_text(js_text, encoding="utf-8")
    print(f"Updated {js_file.name}")

print(f"nine-systems ready at: {dst_dir}")
