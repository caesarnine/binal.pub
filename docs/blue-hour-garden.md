# Blue-hour garden

The garden is the shared setting for the production blog. The homepage uses a wide vista and three recent articles; article and archive pages use a shallow panorama and centered reading surface. The deep-blue background, warm text, links, and code theme draw their colors from the scene.

The illustration is an original 1659 × 948 PNG, generated with the built-in image_gen tool and saved at `public/art/blue-hour-garden.png`. Keep this file's proportions; responsive layouts crop rather than stretch it. Both the image fallback and animated renderer use a centered cover crop.

Motion stays inside the artwork. Clouds drift behind a protected skyline, city windows twinkle with independent phases, greenhouse and lantern light breathe slowly, anchored foliage bends with passing gusts, and overlapping water waves break up the reflections. The star remains fixed while its light varies gently. These regions are masked within the existing artwork, so buildings, paths, and mountains remain stable.

Pointer movement gathers fireflies and stirs the foreground. Taps or Enter produce a short swarm and water ripple. There are no visible controls or interaction hints; motion follows the device's reduced-motion preference, including changes while the page is open. The former `binal-scenery-paused` storage setting is no longer used. The renderer stops while offscreen or in a hidden tab, caps rendering at 30 fps, and leaves the original illustration visible without WebGL. Texture interpolation smooths slow motion within the original painted pixels; the output canvas retains the pixel-art presentation. Article pages use less wind and fewer fireflies than the homepage.

New posts need only Markdown. The scenery is independent of post count, title length, and reading length.

## Exact generation prompt

```text
Use case: stylized-concept
Asset type: standalone original pixel-art landscape for an interactive blog background.
Primary request: Blue-hour garden — a dreamy but sophisticated elevated garden overlooking a mountain lake at dusk. Huge luminous blue-lilac sky occupying the upper half, a tiny warm-lit greenhouse or observatory on the far left, lush foreground grasses and ferns with tiny blossoms, a still lake across the lower middle reflecting one early star, and distant indigo ridges. Subtle whimsical cozy details with readable silhouettes.
Style/medium: exquisite cohesive pixel art, refined clearly visible square pixel clusters and deliberate dithering; rich restrained color and atmospheric perspective. Detailed enough to reward looking while remaining elegant and quiet. Not photorealistic or smooth digital painting.
Composition/framing: wide 16:9 landscape, approximately 1792x1024 or similar. Expansive sky above a softly layered garden and lake, greenhouse far left.
Lighting/mood: tranquil, dreamy blue hour with a small warm amber glow.
Color palette: rich midnight blue, periwinkle, emerald and amber.
Constraints: standalone landscape only; no people, oversized moon, text, lettering, UI, borders, frames or watermark.
```
