// Where each door leads. Both are separate repos with live sites:
//   The Garrison Tavern -> Gilded Minstrels   github.com/jakecush1/3js-interactive-tavern
//   音楽アパート         -> Bedroom Studio     github.com/jakecush1/bedroom-studio
// To point a door at a local dev server instead, set VITE_TAVERN_URL / VITE_STUDIO_URL in .env.local.
const env = import.meta.env;

export const DESTINATIONS = {
  tavern: {
    id: "tavern",
    name: "The Garrison Tavern",
    blurb: "Gilded Minstrels · a candlelit band tavern",
    url: env.VITE_TAVERN_URL || "https://sideproj.ca/",
    accent: "#e8b45a",
  },
  studio: {
    id: "studio",
    name: "音楽アパート · Room 808",
    blurb: "Bedroom Studio · lofi machines after midnight",
    url: env.VITE_STUDIO_URL || "https://bedroom-studio-three.vercel.app/",
    accent: "#ff6fcf",
  },
};
