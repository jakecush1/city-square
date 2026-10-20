# City Square

A rainy-night street built in Three.js. You arrive on the cobbles between two lit buildings and pick a door:

| Building | Leads to | Repo |
| --- | --- | --- |
| **The Garrison Tavern** (left) | [Gilded Minstrels](https://sideproj.ca/) — a candlelit band tavern | [jakecush1/3js-interactive-tavern](https://github.com/jakecush1/3js-interactive-tavern) |
| **音楽アパート** (right) | [Room 808 bedroom studio](https://bedroom-studio-three.vercel.app/) — lofi machines after midnight | [jakecush1/bedroom-studio](https://github.com/jakecush1/bedroom-studio) |

Hover a building to light it up, click it (or the chip at the bottom) and the camera walks to the door, fades out, and the destination opens inside the page with a **Back to the street** bar. Browser back and `Esc` also bring you home. `/#tavern` and `/#studio` deep-link straight inside.

The two buildings stand on their own pavement islands, turned a little toward each other and toward you, with a cobbled street running between them into the fog and another running along their fronts.

Everything in the scene is procedural: cobbles, plaster, concrete, the sign and the neon are painted onto canvases at startup, so there are no asset downloads. The illustrated look comes from toon-ramped materials plus a post pass (`src/ink.js`) that inks edges wherever depth or surface normals jump, lays paper grain over the frame and flattens the palette. Wet-ground reflections are additive light smears aimed at the camera rather than real reflections.

## Run it

```bash
npm install
npm run dev        # http://localhost:5170
npm run build      # static site in dist/
```

## Pointing a door somewhere else

The destinations live in `src/destinations.js`. To aim one at a local dev server while you work on it, copy `.env.example` to `.env.local`:

```
VITE_TAVERN_URL=http://localhost:5174/
VITE_STUDIO_URL=http://localhost:5175/
```

If a door's site isn't reachable, the street tells you instead of opening a blank frame.

## Layout

```
index.html           HUD, door chips, the portal frame
src/main.js          renderer, camera, hover/click, walking in and out
src/street.js        the two buildings, islands, lamps, poles, wires, skyline
src/props.js         lamp posts, utility poles, rain, steam, scooter, crates, light smears
src/textures.js      canvas-painted materials, grime, signs, lit windows, toon ramp
src/ink.js           ink-outline and paper-grain post pass
src/destinations.js  where the two doors lead
```

The reference painting is `City Square Old Town.jpg`.
