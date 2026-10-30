# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + React 18 + TypeScript (strict), three / @react-three/fiber / drei / postprocessing / maath,
GSAP + ScrollTrigger + Lenis, Tailwind CSS + CSS variables, Zustand. Set by the user in the brief.

## Users

Visitors who reach the site via a portfolio link: prospective clients, studios, and peers judging
the craft of a scroll-driven WebGL launch experience. They arrive on desktop or phone with no prior
context, and decide within one viewport whether to keep scrolling.

## Product Purpose

An unofficial concept site, built as a portfolio piece, that presents the Lamborghini Aventador
SVJ 63 Roadster as the subject of a cinematic, scroll-driven launch story. Success means a visitor
scrolls to the end and leaves convinced the author can ship flagship-level automotive work.

## Positioning

The real 3D car is the hero of every section. The camera, copy and hotspots are all built around
that one model, so the site works as a guided tour of the car, not a page with a car on it.

## Capabilities and Constraints

- One fixed WebGL canvas behind scrolling DOM; every transition is scroll-scrubbed and reversible.
- Configurator at the end: orbit, paint swatches, headlight toggle, opt-in engine sound.
- The finale CTA is a placeholder link (`#`) until the user gives a target.
- Specs follow the **SVJ 63 Roadster** (the car in the model). The 6:44.97 Nürburgring lap belongs
  to the SVJ coupé and is presented as lineage, not as a Roadster claim.
- Needs a WebGL fallback (poster + full content), reduced-motion path, and mobile reframing.

## Brand Commitments

- Not affiliated with Automobili Lamborghini. A visible "concept / not affiliated" note is required.
- No Lamborghini logo or bull emblem; the name is set in type only, unless licensed assets arrive.
- Palette fixed by the user: black and red only, with neutrals. Red is an accent, never a flood.

## Evidence on Hand

- `assets-src/svj.raw.glb`: "2020 Lamborghini Aventador SVJ 63 Roadster" by Ddiaz Design,
  CC-BY-4.0 (Sketchfab). Attribution required.
- `assets-src/m4.raw.glb`: "Classic M4" by Mateusz Woliński, CC-BY-4.0 (Sketchfab). Attribution
  required.
- Specs from lamborghini.com (history pages for Aventador SVJ and SVJ Roadster). No photography,
  video, audio, or press quotes are on hand; do not fabricate them. The engine sound needs a
  licensed or self-recorded/synthesized source.

## Product Principles

1. The car leads every frame; nothing competes with it.
2. Every fact on screen is real text and traceable to an official source.
3. Scroll is the only timeline: scrubbed, reversible, never hijacked.
4. Performance is part of the craft: a stutter undoes the impression.

## Accessibility & Inclusion

Target Lighthouse Accessibility ≥ 95: semantic HTML, keyboard-reachable hotspots and controls,
`prefers-reduced-motion` honoured, audio muted by default behind a clear toggle.
