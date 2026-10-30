# Phase 1: models, optimization, design direction

## 1. Model inspection (raw files)

| | SVJ (`assets-src/svj.raw.glb`) | M4 (`assets-src/m4.raw.glb`) |
|---|---|---|
| Source | "2020 Lamborghini Aventador SVJ 63 Roadster", Ddiaz Design, CC-BY-4.0 | "Classic M4", Mateusz Woliński, CC-BY-4.0 |
| File | 17.7 MB (geometry ≈ 16.8 MB, textures 0.86 MB) | 44.8 MB (textures 43.2 MB, 8K PNGs) |
| Nodes / meshes | 3,171 / 1,583 | 17 / 7 |
| Triangles | 213,923 | 28,477 |
| Materials | 25 (specular, clearcoat, transmission extensions) | 3 (`material`, `sling`, `scope`) |
| Scale | **1/100**: car is 4.9 cm long | ≈ 0.67 m long |
| Axes / pivot | Y up, **faces +Z**, +X = car's left, pivot at ground centre | barrel along Z, muzzle +Z |

Problems found:
- **Wheels:** all four wheels plus calipers were 1,464 loose `polySurface` fragments under one node, so no wheel could spin.
- **No separate engine cover, rear wing or splitter meshes.** They are baked into the carbon and paint meshes. Headlights and taillight housings share one `Lights` mesh. Taillight lenses (`RED_GLASS`) are separate.
- **Trademark artwork:** the badge texture contains the Lamborghini bull shield and the ALA logos; the rear plate texture contains the "Aventador Roadster" wordmark.
- `KHR_materials_transmission` on the glass forces an extra full-scene render pass in three.js.

## 2. Optimization (`npm run models` → `scripts/optimize-models.mjs`)

| | SVJ | M4 |
|---|---|---|
| Output | `public/models/svj.glb` **3.57 MB** (target < 8 MB) | `public/models/m4.glb` **0.84 MB** |
| Meshes | 1,583 → **40** | 7 → 3 |
| Triangles | 213,923 (unchanged, no decimation yet) | 28,477 |
| Validator | 0 errors, 0 warnings | 0 errors, 0 warnings |

What the script does:
- Bakes the ×100 scale and the Sketchfab axis fix into the geometry. The car is now **2.27 × 1.11 × 4.94 m**.
- Regroups the wheel fragments into `Wheel_FL/FR/RL/RR`, each pivoted at its hub, plus `Caliper_*` groups that don't spin.
  - Measured wheelbase 2.70 m, tyres 664 mm front and 714 mm rear. These match the real car (2,700 mm; 255/30 R20 and 355/25 R21).
- Merges everything else per material and gives the parts readable names: `Paint`, `PaintDecal` (the red "63" livery), `Carbon`, `Engine`, `Lights`, `Taillights`, `Window`, …
- Strips transmission (alpha blending stays).
- Blanks the badge and rear-plate textures to plain graphite. The shapes stay; the logos go.
- Uses Meshopt compression, not Draco: faster decoding, and drei's `useGLTF` handles it natively.
- Converts textures to WebP at 1024 px.
  - KTX2 was skipped because there's no `toktx` binary on this machine. The SVJ's textures total 0.16 MB, so it doesn't matter.
- M4: centred, length normalised to 1 unit, colour and roughness maps dropped (the site uses a gunmetal shader); 1K normal maps kept.

Checked visually in a WebGL preview (`tools/preview.html`): the car renders complete, the wheels spin around their real hubs, the rear shows no logos, and the M4 is intact.

Typed components: `src/models/SVJ.tsx`, `src/models/M4.tsx`.
- Generated with `gltfjsx --types --keepnames`, **without `--transform`**, because that flag would re-compress with Draco and undo the regrouping.
- Duplicate type keys are already removed. Phase 2 cleanup: drop the unused `GLTFAction` reference and split out the wheel and paint refs.

## 3. Specs (verified → `src/data/specs.ts`)

The site presents the **SVJ 63 Roadster** (your choice), so these figures differ from the brief.

| | Brief | Site (Roadster) | Source |
|---|---|---|---|
| Engine | 6.5 L V12 | 6,498 cc V12 | lamborghini.com |
| Power | 770 CV @ 8,500 | 770 CV @ 8,500 rpm | press release 2019 |
| Torque | 720 Nm @ 6,750 | 720 Nm @ 6,750 rpm | press release 2019 |
| 0–100 km/h | 2.8 s | **2.9 s** | press release / lamborghini.com |
| 0–200 km/h | 8.6 s | **8.8 s** | press release 2019 |
| Top speed | 350+ | > 350 km/h | lamborghini.com |
| Dry weight | 1,525 kg | **1,575 kg** | press release 2019 (+50 kg over coupé) |
| Units | 900 | **63** (SVJ 63 edition; 800 SVJ Roadsters in total) | lamborghini.com |
| Nürburgring | 6:44.97 | 6:44.97, **credited to the SVJ coupé (2018)** | lamborghini.com |

## 4. Design direction

**Mode:** Experience (portfolio showcase; the car leads every viewport). Your brief already pins the direction, so the design skill's concept round was skipped: a pinned brief overrides it.

**Signature drawn from the car itself:** this SVJ 63 wears red "63" race roundels and red pinstripes on graphite. That livery becomes the site's graphic language:
- The "63" numeral as the one big graphic.
- An edition-plate motif ("ESEMPLARE ··/63") for section indices instead of a generic "01/08".
- Pinstripe hairlines in red for dividers and leader lines.

Red stays an accent, exactly as the car uses it.

**Type**
- Display: **Unbounded** (variable 200–900). It is truly wide; **Big Shoulders is condensed**, so it contradicts "ultra-wide". Headlines at 800, tracking −0.04em, up to `clamp(4rem, 22vw, 22rem)`.
- Body: **Inter Tight** 400/500.
- Specs and numerals: **JetBrains Mono** 500, tabular figures.

**Tokens** (`--black #050505`, `--carbon #0D0D0F`, `--graphite #1A1A1D`, `--red #E10600`, `--red-glow #FF2A1F`, `--smoke #8A8A8F`, `--white #F2F2F2`). Added only:
- `--hairline: rgb(242 242 242 / 0.08)`
- `--hairline-red: rgb(225 6 0 / 0.55)`
- `--glass: rgb(5 5 5 / 0.6)`

**Default paint:** Grigio Telesto, which matches the model's own graphite. Swatches: Rosso Mars, Nero Nemesis, Grigio Telesto, applied to the `Paint` material only. The red "63" decal stays.

## 5. Storyboard changes proposed

- **01 Hero:** "AVENTADOR SVJ" with a small "63 ROADSTER" kicker; the depth sandwich as specified.
- **05 Performance:** Roadster numbers (table above).
- **06 Nürburgring:** add a one-line credit: "Set by the Aventador SVJ coupé, 2018".
- **08 Finale:** "Limited to 63 units." instead of 900.
- **Hotspots:** anchors defined as car-space coordinates in `hotspots.ts`, parented inside the car group so pins rotate with it. Engine cover, wing and splitter have no meshes of their own, so named nodes alone can't anchor them.
- **Engine sound:** no licensed audio on hand. Proposal: a Web Audio V12 synthesised from the 12-cylinder firing frequency, labelled as synthesised, muted by default. A real recording can replace it later.
- **Footer:** "Concept, not affiliated with Automobili Lamborghini S.p.A." plus CC-BY credits for both models (required by the licence).

## 6. Skills used

- **impeccable:**
  - Its product interview produced `PRODUCT.md` (Roadster specs, portfolio piece, placeholder CTA).
  - Its Experience-mode rules set the car-first composition and pushed for a signature drawn from the subject, which became the "63" livery.
  - Its "no fabricated claims" rule drove the spec re-verification, the coupé-credit line and the synthesised-sound labelling.
- **frontend-design:** not installed here.
- **web-artifacts-builder:** targets claude.ai artifacts, not a Vite app.
- **figma:** no design file exists.
- **21st.dev:** kept for Phase 4/5 (cursor, nav, swatches).
