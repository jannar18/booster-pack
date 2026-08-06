# [Play Lumen — Aurora Grove](https://lumen-aurora-grove.netlify.app/)

Lumen is a tactile, mobile-first booster-pack opening experience built with Three.js. Choose an original foil pack, drag across its seam to tear it open, reveal five procedurally selected cards, and keep every pull in a persistent browser collection.

All pack artwork, creature illustrations, card frames, and effects are original to this project.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5199`.

## Production build

```bash
npm run build
npm run preview
```

The static production build is written to `docs/`. Publish it to the linked Netlify site with:

```bash
npx netlify-cli deploy --prod --dir=docs
```

The GitHub Pages workflow remains available as a hosting mirror.
