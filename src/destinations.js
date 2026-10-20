// Where each building leads.
// In dev the two apps run on their own ports (see scripts/dev-all.mjs).
// For a deployed hub, set VITE_TAVERN_URL / VITE_STUDIO_URL in a .env file.
const env = import.meta.env;

export const DESTINATIONS = {
  tavern: {
    id: "tavern",
    name: "The Garrison Tavern",
    blurb: "Gilded Minstrels · a candlelit band tavern",
    url: env.VITE_TAVERN_URL || (env.DEV ? "http://localhost:5174/" : "https://sideproj.ca/"),
    accent: "#e8b45a",
  },
  studio: {
    id: "studio",
    name: "音楽アパート · Room 808",
    blurb: "Bedroom Studio · lofi machines after midnight",
    url: env.VITE_STUDIO_URL || (env.DEV ? "http://localhost:5175/" : "http://localhost:5175/"),
    accent: "#ff6fcf",
  },
};
