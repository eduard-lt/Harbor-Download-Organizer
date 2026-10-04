"""Render a static Windows adaptation of the editable macOS Icon Composer source.

Run: uv run --with resvg-py==0.5.0 --with pillow==12.3.0 python tools/icon_windows.py
Apple's dynamic glass rendering is not available on Windows. This export uses
the same original H layer, scale and teal base with a static highlight/shadow.
"""
import io
import json
from pathlib import Path

from PIL import Image
import resvg_py


def main():
    root = Path(__file__).resolve().parents[1]
    source = root / "assets/Harbor.icon"
    config = json.loads((source / "icon.json").read_text())
    layer = config["groups"][0]["layers"][0]
    logo = (source / "Assets" / layer["image-name"]).read_text()
    rgb = config["fill"]["automatic-gradient"].split(":")[1].split(",")[:3]
    color = "#" + "".join(f"{round(float(c) * 255):02x}" for c in rgb)
    scale = layer["position"]["scale"]
    inset = 512 * (1 - scale)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
      <defs>
        <linearGradient id="light" x2="0" y2="1">
          <stop stop-color="white" stop-opacity=".22"/>
          <stop offset=".5" stop-color="white" stop-opacity="0"/>
          <stop offset="1" stop-color="#06474d" stop-opacity=".22"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" flood-opacity=".22"/>
        </filter>
      </defs>
      <rect x="32" y="32" width="960" height="960" rx="220" fill="{color}"/>
      <rect x="32" y="32" width="960" height="960" rx="220" fill="url(#light)"/>
      <g transform="translate({inset} {inset}) scale({scale})" filter="url(#shadow)">{logo}</g>
    </svg>'''
    output = root / "assets/windows"
    output.mkdir(exist_ok=True)
    (output / "harbor.svg").write_text(svg, encoding="utf-8")
    png = resvg_py.svg_to_bytes(svg_string=svg)
    (output / "harbor.png").write_bytes(png)
    icon = Image.open(io.BytesIO(png))
    icon.save(root / "crates/tauri-app/icons/icon.ico", sizes=[
        (n, n) for n in (16, 20, 24, 32, 40, 48, 64, 128, 256)
    ])


if __name__ == "__main__":
    main()
