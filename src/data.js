export const DATA = {
  character: {
    _meta: {
      name: "Sylvia",
    },
    _props: {
      // slots that are considered as character slots
      matrixes: [],
      slots: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],

      stats: {
        0: {
          id: 0,
          type: "stat",
          name: "Strength",
          value: 10,
          mods: {
            // items, effects..?
            item: {
              equip: {},
            },
            effect: {},
          },
        },
        1: {
          id: 1,
          type: "stat",
          name: "Constitution",
          value: 10,
          mods: {
            // items, effects..?
            item: {
              equip: {},
            },
            effect: {},
          },
        },
        2: {
          id: 2,
          type: "stat",
          name: "Dexterity",
          value: 10,
          mods: {
            // items, effects..?
            item: {
              equip: {},
            },
            effect: {},
          },
        },
        3: {
          id: 3,
          type: "stat",
          name: "Intelligence",
          value: 10,
          mods: {
            // items, effects..?
            item: {
              equip: {},
            },
            effect: {},
          },
        },
        4: {
          id: 4,
          type: "stat",
          name: "Wisdom",
          value: 10,
          mods: {
            // items, effects..?
            item: {
              equip: {},
            },
            effect: {},
          },
        },
        5: {
          id: 5,
          type: "stat",
          name: "Charisma",
          value: 10,
          mods: {
            // items, effects..?
            item: {
              equip: {},
            },
            effect: {},
          },
        },
      },
      effects: [],
    },
    _styles: {
      frames: {
        character: {
          css_path: "styles/character.css",
        },
        inventory: {
          css_path: "styles/inventory.css",
        },
        stats: {
          css_path: "styles/stats.css",
        },
      },
    },
    _invs: {
      0: {
        type: "inventory",
        id: 0,
        core: {},
        slots: [10],
      },
    },
    _slots: {
      10: {
        id: 10,
        type: "slotmatrix",
        class: "",
        frame: "inventory",
        template: { col: 15, row: 6 },
        size: { col: 1, row: 1 },
        core: { deny: [], accept: [] },
        dim: { x: 40, y: 40 },
        item: {
          0: { id: 1 },
          1: { id: 2 },
        },
        inv: { id: 0 },
      },
      0: {
        type: "slot",
        class: "slot-5",
        frame: "character",
        responsive: true,
        id: 0,
        pos: { x: 0, y: 0 },
        size: { col: null, row: null },
        dim: { x: 70, y: 70 },
        inv: null,
        item: { id: 0 },
      },
      1: {
        type: "slot",
        class: "slot-5",
        frame: "character",
        responsive: true,
        id: 1,
        pos: { x: 0, y: 0 },
        size: { col: null, row: null },
        dim: { x: 70, y: 70 },
        inv: { id: 0 },
        item: null,
      },
      2: {
        type: "slot",
        class: "slot-5",
        frame: "character",
        responsive: true,
        id: 2,
        pos: { x: 0, y: 0 },
        size: { col: null, row: null },
        dim: { x: 70, y: 70 },
        inv: null,
        item: null,
      },
      3: {
        type: "slot",
        class: "slot-5",
        frame: "character",
        responsive: true,
        id: 3,
        pos: { x: 0, y: 0 },
        size: { col: null, row: null },
        dim: { x: 70, y: 70 },
        inv: null,
        item: null,
      },
      4: {
        type: "slot",
        class: "slot-5",
        frame: "character",
        responsive: true,
        id: 4,
        pos: { x: 0, y: 0 },
        size: { col: null, row: null },
        dim: { x: 70, y: 70 },
        inv: null,
        item: null,
      },
      5: {
        type: "slot",
        class: "slot-5",
        frame: "character",
        responsive: true,
        id: 5,
        pos: { x: 0, y: 0 },
        size: { col: null, row: null },
        dim: { x: 70, y: 70 },
        inv: null,
        item: null,
      },
      6: {
        type: "slot",
        class: "slot-5",
        frame: "character",
        responsive: true,
        id: 6,
        pos: { x: 0, y: 0 },
        size: { col: null, row: null },
        dim: { x: 70, y: 70 },
        inv: null,
        item: null,
      },
      7: {
        type: "slot",
        class: "slot-5",
        frame: "character",
        responsive: true,
        id: 7,
        pos: { x: 0, y: 0 },
        size: { col: null, row: null },
        dim: { x: 70, y: 70 },
        inv: null,
        item: null,
      },
      8: {
        type: "slot",
        class: "slot-5",
        frame: "character",
        responsive: true,
        id: 8,
        pos: { x: 0, y: 0 },
        size: { col: null, row: null },
        dim: { x: 70, y: 70 },
        inv: null,
        item: null,
      },
      9: {
        type: "slot",
        class: "slot-5",
        frame: "character",
        responsive: true,
        id: 9,
        pos: { x: 0, y: 0 },
        size: { col: null, row: null },
        dim: { x: 70, y: 70 },
        inv: null,
        item: null,
      },
    },
    _items: {
      0: {
        type: "item",
        id: 0,
        pos: { x: 0, y: 0 },
        dim: { x: 50, y: 50 },
        size: { row: 1, col: 1 },
        slot: { id: 0 },
        slot_range: [undefined],
        core: {
          quality: "Rare",
          info: {
            title: "Scroll of Town Portal",
            type: "Consumable",
            description:
              "Opens a magical blue gateway from the wilderness to the nearest town.",
          },
          stats: { equip: {} },
        },
        img: { id: 0 },
      },
      1: {
        type: "item",
        id: 1,
        pos: { x: 0, y: 0 },
        dim: { x: 50, y: 50 },
        size: { row: 1, col: 1 },
        slot: { id: 10 },
        slot_range: [0],
        core: {
          quality: "Rare",
          info: {
            title: "Scroll of Town Portal",
            type: "Consumable",
            description:
              "Opens a magical blue gateway from the wilderness to the nearest town.",
          },
          stats: {
            equip: {
              0: {
                stat: { id: 0 },
                mod: -2,
              },
            },
          },
        },
        img: { id: 1 },
      },
      2: {
        type: "item",
        id: 2,
        pos: { x: 0, y: 0 },
        dim: { x: 100, y: 50 },
        size: { row: 1, col: 2 },
        slot: { id: 10 },
        slot_range: [1, 2],
        core: {
          quality: "Rare",
          info: {
            title: "Belt",
            type: "Armor",
            description: "Oh, it's just a belt from Diablo",
          },
          stats: {
            equip: {
              0: {
                stat: { id: 0 },
                mod: -1,
              },
            },
          },
        },
        img: { id: 2 },
      },
    },
    _images: {
      0: {
        type: "image",
        id: 0,
        src: "media/scroll.png",
        pos: { x: 0, y: 0 },
        dim: { x: 50, y: 50 },
        item: { type: "item", id: 0 },
      },
      1: {
        type: "image",
        id: 1,
        src: "media/scroll2.png",
        pos: { x: 0, y: 0 },
        dim: { x: 50, y: 50 },
        item: { type: "item", id: 1 },
      },
      2: {
        type: "image",
        id: 2,
        src: "media/belt.png",
        pos: { x: 0, y: 0 },
        dim: { x: 100, y: 50 },
        item: { type: "item", id: 2 },
      },
    },
  },
};
