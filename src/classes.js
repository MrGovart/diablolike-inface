// Here I'm creating some functions to manipulate objects in more simplified
// way. The key feature here is Core class that is essential for item validation
// when interacting with slot. It helps to define conditions that actually describing
// what the Slot was created for. For example, deny some type of Items or which is a
// more strict way to filter items — accept specific type.

// as I'm sorting slot array in ascending order by ID above (it's something that came from my
// legacy logicflow), I have to generate IDs that represent the same logic. Here I implement
// an async ID generation using just Date.now() and 1ms delay so it is always unique as every
// ms is obviously a unique number. The only drawback of such method is that in that case making
// new matrix takes time equal number of slots in ms + delays between useEffect hook firings
// You can see the delay adding matrix more than 6x6

// so if you want to make a new object (except DataObj) you MUST call function new[className]
// instead of proper constructor
const genID = () =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(Date.now());
    }, 1);
  });

async function newInventoryObj(things, matrixes, core) {
  let id = await genID();
  return new InventoryObj(id, things, matrixes, core);
}

async function newSlotObj(type, inv, size, dim, item, core) {
  let id = await genID();
  return new SlotObj(id, type, inv, size, dim, item, core);
}

async function newItemObj(core, size, image) {
  let id = await genID();
  return new ItemObj(id, core, size, image);
}

async function newStatObj(name, value) {
  let id = await genID();
  return new ItemObj(id, name, value);
}

class DataObj {
  // type of things
  // things = {
  //  data: true,
  //  invs:
  //    [
  //      ...inv {
  //        matrixes: [...slotmatrix: {
  //          slots: [...slot]
  //        }]
  //      }
  //    ],
  //  items: [
  //    ...item {
  //      img: image
  //    }
  //  ]
  //}
  constructor(data) {
    data = data.character;
    this._props = data._props;
    this._meta = data._meta;
    this._data = true;
    this._invs = {};
    this._slots = {};
    this._items = {};
    this._images = {};
    this._stats = {};
    if (data._invs) {
      for (const inv in data._invs) {
        this._invs[inv] = Object.assign(new InventoryObj(), data._invs[inv]);
      }
    }
    if (data._slots) {
      for (const slot in data._slots) {
        this._slots[slot] = Object.assign(new SlotObj(), data._slots[slot]);
      }
    }
    if (data._items) {
      for (const item in data._items) {
        this._items[item] = Object.assign(new ItemObj(), data._items[item]);
      }
    }
    if (data._images) {
      for (const image in data._images) {
        this._images[image] = Object.assign(
          new ImageObj(),
          data._images[image]
        );
      }
    }
    if (data._props.stats) {
      for (const stat in data._props.stats) {
        this._props.stats[stat] = Object.assign(
          new StatObj(),
          data._props.stats[stat]
        );
      }
    }

    if (data.hand && data.hand.item) {
      this.hand = { item: data.hand.item };
    } else {
      this.hand = { item: null };
    }
  }

  item(id) {
    return this._items[id];
  }

  image(id) {
    return this._images[id];
  }

  inv(id) {
    return this._invs[id];
  }

  slot(id) {
    return this._slots[id];
  }

  stat(id) {
    return this._stats[id];
  }

  removeInv(id) {
    let inv = this.inv(id);
    for (var i = inv.matrixes.length; i !== 0; i--) {
      this.removeMatrix(inv.matrixes[0].id);
    }
    this._invs.splice(
      this._invs.findIndex((i) => i.id === inv.id),
      1
    );
  }

  removeMatrix(id) {
    let matrix = this.matrix(id);
    console.log(matrix);
    matrix.slots.forEach((slot) => {
      if (slot.item) {
        slot.item.trash();
      }
    });
    this._slots.sort((a, b) => (a.matrix.id === id ? -1 : 1));
    for (var i = matrix.slots.length; i !== 0; i--) {
      this._slots.shift();
    }
    matrix.inv.matrixes.splice(
      matrix.inv.matrixes.findIndex((m) => matrix.id === m.id),
      1
    );
    matrix.group.matrixes.splice(
      matrix.group.matrixes.findIndex((m) => m.id === matrix.id),
      1
    );
    this._matrixes.splice(
      this._matrixes.findIndex((m) => m.id === matrix.id),
      1
    );
  }

  removeSlot(id) {
    let slot = this.slot(id);
    if (slot.item) {
      let indx = this._items.findIndex((i) => i.id === slot.item.id);
      if (indx >= 0) {
        slot.item.trash();
      }
    }
    slot.matrix.slots.splice(
      slot.matrix.slots.findIndex((s) => slot.id === s.id),
      1
    );
    this._slots.splice(
      this._slots.findIndex((s) => s.id === slot.id),
      1
    );
  }
}

class InventoryObj {
  constructor(id, things, matrixes, core) {
    if (id) {
      this.id = id;
      this.slots = [];
      if (matrixes) {
        this.fillWithMatrixes(matrixes);
      }
    }
  }

  fillWithMatrixes(matrixes) {
    throw new Error(
      "It's not implemented yet to parse matrixes into inventory"
    );
  }
}

class SlotObj {
  constructor(id, type, inv, size, dim, item, core) {
    if (id) {
      this.type = ["slotmatrix", "slot"].some((t) => t === type)
        ? type
        : "slot";
      this.inv = inv;
      this.id = id;
      this.pos = { x: 0, y: 0 };
      (this.size = size
        ? { col: size.col, row: size.row }
        : { col: 1, row: 1 }),
        (this.dim = dim
          ? { x: dim.x, y: dim.y }
          : { x: 50 * this.size.col, y: 50 * this.size.row });
      this.item = item ? item : null;
      this.core = new SlotCore(core);
    }
  }
}

class SlotCore {
  constructor(core) {
    this.deny = [];
    this.accept = [];
    this.logic = core.logic;
  }

  // this.deny.PROPERTY = {name: NAME (may be an array if it's nested property),
  // more: [], less: [], equal: []}

  toDeny(property, mode, value) {
    var prp = this.deny.find((prop) => prop.name === property);
    if (!prp) {
      if (["more", "less", "equal"].some((value) => value === mode)) {
        this.deny.push({ name: property, more: [], less: [], equal: [] });
      }
    }

    prp = this.deny.find((prop) => prop.name === property);
    prp[mode].push(value);
  }

  toAccept(property, mode, value) {
    var prp = this.accept.find((prop) => prop.name === property);
    if (!prp) {
      if (["more", "less", "equal"].some((value) => value === mode)) {
        this.accept.push({ name: property, more: [], less: [], equal: [] });
      }
    }

    prp = this.accept.find((prop) => prop.name === property);
    prp[mode].push(value);
  }

  clear(type, property, mode) {
    this[type].find((prop) => prop.name === property)[mode] = [];
  }

  test(item) {
    console.log(this);
    let testResult;
    testResult = !this.deny.length
      ? true
      : this.deny.some((prop) => {
          let verdict;
          console.log(Object.entries(prop));
          verdict = Object.entries(prop).every((rule, i) => {
            if (i === 0) {
              return true;
            }
            switch (rule[0]) {
              case "more":
                return rule[1].every((prp) => {
                  var property = item;
                  if (Array.isArray(prop.name)) {
                    prop.name.forEach((name) => {
                      property = property[name];
                    });
                  } else {
                    property = prop.name;
                  }
                  return item[property] < prp;
                });
              case "less":
                return rule[1].every((prp) => {
                  var property = item;
                  if (Array.isArray(prop.name)) {
                    prop.name.forEach((name) => {
                      property = property[name];
                    });
                  } else {
                    property = prop.name;
                  }
                  return item[property] > prp;
                });
              case "equal":
                return rule[1].every((prp) => {
                  var property = item;
                  if (Array.isArray(prop.name)) {
                    prop.name.forEach((name) => {
                      property = property[name];
                    });
                  } else {
                    property = prop.name;
                  }
                  return item[property] !== prp;
                });
              default:
                throw new Error("Something wrong with comparison mode");
            }
          });
          console.log("deny verdict: " + verdict);
          return verdict;
        });
    testResult = !testResult
      ? testResult
      : !this.accept.length
      ? true
      : this.accept.some((prop) => {
          let verdict;
          console.log(Object.entries(prop));
          verdict = Object.entries(prop).every((rule, i) => {
            if (i === 0) {
              return true;
            }
            switch (rule[0]) {
              case "more":
                return rule[1].every((prp) => {
                  var property = item;
                  if (Array.isArray(prop.name)) {
                    prop.name.forEach((name) => {
                      property = property[name];
                    });
                  } else {
                    property = prop.name;
                  }
                  return item[property] > prp;
                });
              case "less":
                return rule[1].every((prp) => {
                  var property = item;
                  if (Array.isArray(prop.name)) {
                    prop.name.forEach((name) => {
                      property = property[name];
                    });
                  } else {
                    property = prop.name;
                  }
                  return item[property] < prp;
                });
              case "equal":
                return rule[1].every((prp) => {
                  var property = item;
                  if (Array.isArray(prop.name)) {
                    prop.name.forEach((name) => {
                      property = property[name];
                    });
                  } else {
                    property = prop.name;
                  }
                  return item[property] === prp;
                });
              default:
                throw new Error("Something wrong with comparison mode");
            }
          });
          console.log("verdict: " + verdict);
          return verdict;
        });
    return testResult;
  }
}

class ItemObj {
  // {
  //   type: "item",
  //   id: 0,
  //   pos: { x: 0, y: 0 },
  //   dim: { x: 50, y: 50 },
  //   size: { row: 1, col: 1 },
  //   slot: { id: 0, range: '0' },
  //   core: {
  //     rarity: "rare",
  //     info: {
  //       title: "Scroll of Town Portal",
  //       type: "Consumable",
  //       description:
  //         "Opens a magical blue gateway from the wilderness to the nearest town."
  //     }
  //   }
  //    img: { id: 0 }
  // },
  constructor(id, core, size, image) {
    if (id) {
      this.type = "item";
      this.id = id;
      this.core = new ItemCore(core ? core : 0);
      this.pos = { x: 0, y: 0 };
      this.size = size;
      this.dim = { x: 50 * size.col, y: 50 * size.row };
      this.img = image ? new ImageObj(this, image.src) : null;
      this.slot = null;
      this.slot_range = [];
      this.isTrashed = false;
    }
  }

  trash() {
    this.slots = [];
    this.isTrashed = true;
  }
}

class ItemCore {
  constructor(core) {
    if (core) {
      Object.assign(this, core);
    } else {
      this.info = null;
    }
  }

  // add access array to get deep property like 'info':
  // addFeature('title', 'Title', ['info']) to add title to the info prop
  addFeature(name, value, access) {
    let targetDir = this;
    if (access && access.length) {
      for (const dir of access) {
        targetDir = targetDir[dir];
      }
    }
    Object.defineProperty(targetDir, name, {
      value: value,
      writable: true,
      enumerable: true,
      configurable: true
    });
  }
}

class ImageObj {
  // {
  //   type: "image",
  //   id: 0,
  //   src: "media/scroll.png",
  //   pos: { x: 0, y: 0 },
  //   dim: { x: 50, y: 50 }
  // },
  constructor(item, src, pos, dim) {
    if (item) {
      this.id = item.id;
      this.src = src;
      this.pos = pos ? pos : { x: 0, y: 0 };
      this.dim = dim ? dim : item.dim;
    }
  }
}

class StatObj {
  constructor(id, name, value) {
    this.id = id;
    this.type = "stat";
    this.name = name;
    this.value = value;
    this.mods = {
      // items, effects..?
      item: {
        equip: {}
      },
      effect: {}
    };
  }

  add(inflObj, type, reason) {
    this.mods[type][reason][inflObj.id] = inflObj;
  }

  remove(inflObj, type, reason) {
    delete this.mods[type][reason][inflObj.id];
  }
}

export {
  genID,
  newInventoryObj,
  newSlotObj,
  newItemObj,
  newStatObj,
  DataObj,
  InventoryObj,
  SlotObj,
  SlotCore,
  ItemObj,
  ItemCore,
  ImageObj,
  StatObj
};
