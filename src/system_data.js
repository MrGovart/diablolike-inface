export const fringes = {
  sd: "(max-width: 480px)",
  md: "(max-width: 640px)",
  ld: "(max-width: 780px)",
  gd: "(max-width: 920px)",
  egd: "(max-width: 1200px)"
};

export const systemData = {
  types: ["Consumable", "Armor", "Weapon"],
  weapon_types: [],
  armor_types: [],
  consumable_types: [],
  qualities: ["Common", "Uncommon", "Rare"],
  responsive: {
    default_px_size: 50,
    character: {
      // --- syntax for root variables ---
      "--sd-slot-5-size": "60px",
      "--default-slot-5-size": "70px",
      // --- syntax for media queries ---
      media_queries: {
        //  [`@media only screen and ${fringes.sd}`]: [
        //    ".char-main-container {  height: calc(100% - 140px)  }",
        //    ".char-main-container {  height: 300px  }" // use variables
        //  ]
      }
    }
  }
};
