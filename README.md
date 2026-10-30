# Aventador SVJ 63 Roadster: concept site

A scroll-driven 3D portrait of the Lamborghini Aventador SVJ 63 Roadster, built with React, Three.js
(React Three Fiber), GSAP and Lenis. **Unofficial concept study. Not affiliated with, endorsed by or
connected to Automobili Lamborghini S.p.A.** No Lamborghini logo or emblem is used.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check, then production build into dist/
npm run preview    # serve dist/ locally
```

## Deploy (Cloudflare Pages)

- Build command: `npm run build`
- Output directory: `dist`

Or upload the built folder directly:

```bash
npx wrangler login
npx wrangler pages deploy dist --project-name aventador-svj63
```

## 3D models

The optimised models in `public/models/` are generated from the original Sketchfab exports by
`npm run models` (`scripts/optimize-models.mjs`). The raw exports are not in this repository
(64 MB); download them from the links below and place them in `assets-src/` as `svj.raw.glb` and
`m4.raw.glb` to regenerate.

## Credits

- 3D model "2020 Lamborghini Aventador SVJ 63 Roadster" by Ddiaz Design,
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/):
  https://sketchfab.com/3d-models/2020-lamborghini-aventador-svj-63-roadster-3a1191226c534574bf00f491d0deea0d
- 3D model "Classic M4" by Mateusz Woliński, CC BY 4.0:
  https://sketchfab.com/3d-models/classic-m4-a747ebdbb3d941ecb09b459c62865a75
- Both models are modified: optimised, recoloured, and trademark artwork removed.
- Nürburgring Nordschleife outline: © OpenStreetMap contributors (ODbL),
  https://www.openstreetmap.org/copyright
- Specifications are taken from Lamborghini's published SVJ Roadster material; see `src/data/specs.ts`.
