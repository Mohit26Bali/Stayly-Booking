# Stayly brand logo — generation prompt

Current placeholder: a Lucide `Building2` icon in a solid blue circle, sitting next to an
"Stayly" wordmark in the default UI font. This is a functional stand-in, not a real mark — use the
prompt below with an image generator (Midjourney, DALL·E, Ideogram, etc.) to produce a real one.

## Prompt

> Design a modern, minimal logo mark for "Stayly," a hotel and travel booking platform. The mark
> should be a single abstract icon that reads clearly at small sizes (down to 24×24px, like a
> browser favicon or mobile app icon) — no fine detail, no gradients, no photographic elements.
>
> Concept direction: fuse the idea of "a place to stay" with "a journey" — for example, a house/roof
> shape that doubles as a location pin, a door/window that opens into a path or horizon line, or an
> abstracted "S" that curves like a road or a stay-and-return arc. Avoid literal, generic hotel-bed
> icons or bland skyscraper silhouettes — those already crowd this industry. Aim for something as
> distinctive and simplified as the Airbnb "Bélo" or Booking.com's blue ribbon-flag mark, but
> original.
>
> Style: flat vector, geometric, generous rounded corners consistent with a modern SaaS product
> (border-radius-heavy, not sharp/angular). Single continuous shape or two shapes maximum. Must work
> as a solid silhouette in one color (test: does it still read at 100% black on white?).
>
> Color: primary brand blue `#2563eb` on a white or transparent background, with `#f59e0b` (warm
> amber) available as a small secondary accent only if the concept calls for a two-tone treatment
> (e.g., a accent dot, a small arc, a highlight edge) — the mark should still work perfectly in
> blue-only. The product's dark mode uses a lighter blue `#3b82f6` on a near-black background
> (`#0a0f1c`-ish) — the mark must stay legible when simply recolored for that surface, so avoid any
> detail that depends on light-background contrast to read.
>
> Deliverable framing: show the mark (a) standalone on white, (b) standalone on dark navy, (c) as a
> square app-icon tile with the mark centered inside a rounded-square blue background at a size
> that reads well as a favicon, and (d) paired with the wordmark "Stayly" in a clean geometric
> sans-serif (Inter/Manrope/similar weight) sitting to the right of the mark, lowercase "tayly"
> with a capital "S," mark and text vertically centered together.
>
> Do not include: photographic textures, 3D bevels/shadows, gradients, multiple colors beyond the
> two specified, tourism clichés (palm trees, suitcases, airplanes, beds), or any text other than
> "Stayly" in the combined lockup.

## Where it plugs in once you have it

- `src/app/favicon.ico` — replace with the app-icon tile version (a).
- `src/components/layout/navbar.tsx` and `src/components/layout/footer.tsx` — currently render
  `<Building2 />` inside a `bg-primary` circle; swap that block for an `<Image>`/inline SVG of the
  mark, keeping the same `size-8` (navbar) / matching footer sizing.
- Consider an `public/images/brand/` folder for the exported SVG/PNG variants once generated.
