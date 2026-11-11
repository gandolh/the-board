import preset from "./vendor/house-style/knip.json" with { type: "json" };

// knip has no `extends`, so this spreads the house preset. The scripts folder (check-fast, and the demo
// seeder run by hand) is the one entry knip can't find on its own.
export default {
  ...preset,
  workspaces: { ".": { entry: ["scripts/*.{js,mjs,ts}"] } },
};
