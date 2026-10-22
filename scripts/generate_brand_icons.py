"""
Stockwise brand icon generator.

Produces four assets in /home/z/my-project/stockwise/public/:
  - favicon.svg         (vector, scalable)
  - apple-touch-icon.png (180x180, RGBA)
  - icon-192.png         (192x192, RGBA, for web app manifest)
  - icon-512.png         (512x512, RGBA, for web app manifest)

Brand mark (verified in src/components/layout/Sidebar.jsx and
src/pages/auth/LoginPage.jsx):
  - Green rounded-square background (brand green #16a34a).
  - White "package" icon (the lucide-react Package glyph) centered.

The SVG is written by hand as a vector master. The PNGs are drawn with
Pillow primitives (no SVG-to-PNG conversion library needed) using the
same proportions so both formats render identically at every size.
"""

from pathlib import Path
from PIL import Image, ImageDraw

GREEN = (22, 163, 90, 255)      # #16a34a (Tailwind green-600)
GREEN_DARK = (15, 122, 73, 255) # #0f7a49 — subtle bottom-edge shade
WHITE = (255, 255, 255, 255)

OUT_DIR = Path('/home/z/my-project/stockwise/public')
OUT_DIR.mkdir(parents=True, exist_ok=True)


# ── SVG master ────────────────────────────────────────────────────────
# 32x32 viewBox. Designed to render recognisably from 16px favicon up
# to 512px manifest icon. The package glyph is the lucide-react
# "Package" outline simplified to the two most legible features at
# small sizes: the box body + the lid flap line.
def write_svg():
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="Stockwise">
  <rect width="32" height="32" rx="7" fill="#16a34a"/>
  <rect y="29" width="32" height="3" fill="#0f7a49" opacity="0.5"/>
  <g fill="none" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
    <!-- Box body -->
    <path d="M8 11.5 L16 8 L24 11.5 L24 20.5 L16 24 L8 20.5 Z"/>
    <!-- Lid flap line (the diagonal fold across the top) -->
    <path d="M8 11.5 L16 15 L24 11.5"/>
    <!-- Vertical centre seam (the front-facing fold) -->
    <path d="M16 15 L16 24"/>
  </g>
</svg>
"""
    (OUT_DIR / 'favicon.svg').write_text(svg, encoding='utf-8')
    print(f'wrote {OUT_DIR / "favicon.svg"}')


# ── PNG renderer ──────────────────────────────────────────────────────
# Renders the same mark at any size. All coordinates are scaled from
# the 32-unit SVG viewBox.
def draw_package_icon(size: int) -> Image.Image:
    """Render the Stockwise brand mark at the given pixel size."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Scale factor from the 32-unit design to the target pixel size.
    s = size / 32.0

    # Rounded square background. Pillow's rounded_rectangle takes
    # pixel coords + corner radius. Match SVG rx=7 → 7*s px.
    corner = max(1, int(round(7 * s)))
    d.rounded_rectangle(
        [(0, 0), (size, size)],
        radius=corner,
        fill=GREEN,
    )

    # Subtle bottom-edge shade — same opacity as the SVG (0.5).
    shade_h = max(1, int(round(3 * s)))
    # Compose the shade as a separate RGBA layer then alpha-composite
    # so the 0.5 opacity is honoured (rounded_rectangle's fill is solid).
    shade_layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    shade_draw = ImageDraw.Draw(shade_layer)
    shade_draw.rounded_rectangle(
        [(0, size - shade_h), (size, size)],
        radius=corner,
        fill=GREEN_DARK,
    )
    shade_layer.putalpha(shade_layer.split()[-1].point(lambda v: int(v * 0.5)))
    img.alpha_composite(shade_layer)

    # Package glyph — white strokes. Pillow draws strokes via the
    # `width` and `joint`/`cap` params on individual shape calls.
    # We draw the three paths from the SVG as three polylines.
    line_w = max(1, int(round(2 * s)))

    def poly(points):
        """Draw a polyline stroke (no fill) through the given scaled points."""
        scaled = [(round(x * s), round(y * s)) for (x, y) in points]
        d.line(scaled, fill=WHITE, width=line_w, joint='curve')

    # Box body outline (closed).
    poly([(8, 11.5), (16, 8), (24, 11.5), (24, 20.5), (16, 24), (8, 20.5), (8, 11.5)])
    # Lid flap line.
    poly([(8, 11.5), (16, 15), (24, 11.5)])
    # Vertical centre seam.
    poly([(16, 15), (16, 24)])

    return img


def write_png(name: str, size: int):
    img = draw_package_icon(size)
    img.save(OUT_DIR / name, format='PNG', optimize=True)
    print(f'wrote {OUT_DIR / name} ({size}x{size})')


if __name__ == '__main__':
    write_svg()
    write_png('apple-touch-icon.png', 180)
    write_png('icon-192.png', 192)
    write_png('icon-512.png', 512)
    print('done')
