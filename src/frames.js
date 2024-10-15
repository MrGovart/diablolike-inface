import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Slot,
  Tetragon,
  Info,
  Line,
  Image,
  useMediaQueries,
  useMediaQuery,
  useScreenSize,
} from "./index.js";
import { systemData } from "./system_data.js";
import "./styles/character.css";
import "./styles/inventory.css";
import "./styles/stats.css";
import "./styles/menu.css";
import { ItemObj, ItemCore, newItemObj } from "./classes.js";

export default function MainFrame(props) {
  function update(newData) {
    for (const key in props.things) {
      if (newData[key]) props.things[key] = newData[key];
    }

    props.update(props.things);
  }

  return (
    <div className="MainFrame">
      <Character
        onAction={props.onAction}
        meta={props.things._meta}
        character={props.things._props}
        hovered_item={props.hovered_item}
        hovered_slot={props.hovered_slot}
        lighten_items={props.lighten_items}
        update={update}
      />
      <Inventory
        onAction={props.onAction}
        inventory={props.things._invs}
        hovered_slot={props.hovered_slot}
        lighten_items={props.lighten_items}
      />
      <Stats stats={props.things._props.stats} />
      <Menu
        update={update}
        hand={props.things.hand}
        _items={props.things._items}
        onMoveInit={props.onMoveInit}
      />
    </div>
  );
}

function Character(props) {
  const [name, setName] = useState(props.meta.name);
  const tempMeta = useRef(props.meta);
  const [pseudoColor, setPseudoColor] = useState("white");
  let rendered_slots_number = 0;
  const { sd, md, ld, gd, egd } = useMediaQueries();

  function renderSlots(n) {
    const slots = [];
    for (n; n > 0; n--) {
      if (props.character.slots[rendered_slots_number]) {
        slots.push(props.character.slots[rendered_slots_number]);
        rendered_slots_number++;
      }
    }

    const slotsToRender = slots.map((slot) => {
      slot.classes = "";
      if (slot.responsive) {
        if (sd) {
          slot.dim.x = parseFloat(
            systemData.responsive[slot.frame]["--sd-" + slot.class + "-size"]
          );
          slot.dim.y = parseFloat(
            systemData.responsive[slot.frame]["--sd-" + slot.class + "-size"]
          );
          slot.classes = slot.classes.concat(" small");
        } else {
          slot.dim.x = parseFloat(
            systemData.responsive[slot.frame][
              "--default-" + slot.class + "-size"
            ]
          );
          slot.dim.y = parseFloat(
            systemData.responsive[slot.frame][
              "--default-" + slot.class + "-size"
            ]
          );
        }
      }

      return (
        <Slot
          classes={slot.classes}
          editing={props.isEditing}
          key={slot.id}
          type={slot.type}
          id={slot.id}
          pos={slot.pos}
          size={slot.size}
          dim={slot.dim}
          item={slot.item}
          matrix={slot.matrix}
          // TODO: messed up hovered and hovered_slot props
          hovered={
            slot.hovered !== undefined &&
            Object.entries(props.lighten_items.items).length !== 1
              ? slot.hovered
              : ""
          }
          onRegItem={props.onRegItem}
          onAction={props.onAction}
          hovered_item_id={props.hovered_item}
          hovered_slot={props.hovered_slot}
        >
          {renderItem(slot)}
        </Slot>
      );
    });
    return slotsToRender;
  }

  function renderItem(slot) {
    let itm = slot.item;
    if (!itm) {
      return null;
    }

    const tetragon = (
      <Tetragon
        key={itm.id}
        type={itm.type}
        id={itm.id}
        pos={itm.pos}
        dim={itm.dim}
        size={itm.size}
        slot={itm.slot}
        slot_range={itm.slot_range}
        img={itm.img}
        onDefineAction={props.onAction}
        core={itm.core}
        highlighten={
          props.lighten_items.items[itm.id] ? props.lighten_items.status : ""
        }
      />
    );
    return tetragon;
  }

  let style = {
    "--pseudo-color": pseudoColor,
  };

  return (
    <div className={sd ? "Character small" : "Character"}>
      <div className="char-name" style={style}>
        <input
          size={props.meta.name.length}
          defaultValue={name}
          onInput={(e) =>
            (e.target.size = e.target.value.length ? e.target.value.length : 1)
          }
          onSelect={() => setPseudoColor("wheat")}
          onBlur={(e) => {
            //TODO: what the hell with props update???
            setPseudoColor("white");
            tempMeta.current.name = e.target.value;
            setName(tempMeta.current.name);
            props.update(tempMeta.current);
          }}
        ></input>
      </div>
      <div className="char-main-container">
        <div className={sd ? "slot-5 small" : "slot-5"}>{renderSlots(5)}</div>
        <div className="char-img">
          <img
            className="char-img-main"
            src="media/character_img.jpg"
            alt="Character"
          ></img>
          <img
            className="char-img-overlay"
            src="media/sparks.gif"
            alt="Sparks in front of character"
          ></img>
        </div>
        <div className={sd ? "slot-5 small" : "slot-5"}>{renderSlots(5)}</div>
      </div>
    </div>
  );
}

function Inventory(props) {
  // inv-container to component
  return (
    <div className="Inventory">
      <InvContainer
        inv={props.inventory[0]}
        lighten_items={props.lighten_items}
        onAction={props.onAction}
      ></InvContainer>
      <div className="inv-dots"></div>
    </div>
  );
}

function InvContainer(props) {
  const containerNode = useRef(null);
  const [initialized, setInitialized] = useState(0);
  const [scroll, setScroll] = useState(0);
  const docWidth = useScreenSize();

  useEffect(() => {
    setInitialized(1);
  }, []);

  const invMaxScroll = useMemo(() => {
    if (!containerNode.current) {
      return;
    }
    return (
      containerNode.current.scrollWidth -
      containerNode.current.getBoundingClientRect().width
    );
  }, [initialized, docWidth]);

  const overflowing = invMaxScroll > 0;

  function renderInv(inv) {
    const slotsToRender = inv.map((slot) => {
      if (slot.type === "slotmatrix") {
        let slots = [];
        let number = slot.template.col * slot.template.row;
        let current = 0;
        while (number !== current) {
          let item = renderItemInMatrix(slot, current);
          slots.push(
            <Slot
              editing={props.isEditing}
              key={current}
              type={"matrixslot"}
              id={slot.id}
              size={slot.size}
              dim={slot.dim}
              index={current}
              item={itemInMatrix(slot, current)}
              hovered={
                slot.matrixslots[current].hovered !== undefined &&
                Object.entries(props.lighten_items.items).length !== 1
                  ? slot.matrixslots[current].hovered
                  : ""
              }
              onRegItem={props.onRegItem}
              onAction={props.onAction}
              hovered_item_id={props.hovered_item}
              hovered_slot={props.hovered_slot}
            >
              {item}
            </Slot>
          );
          current++;
        }
        return (
          <div
            className="Slotmatrix"
            style={{
              gridTemplateColumns: "repeat(" + slot.template.col + ", 1fr)",
              gridTemplateRows: "repeat(" + slot.template.row + ", 1fr)",
            }}
            id={slot.id}
            key={slot.id}
          >
            {slots}
          </div>
        );
      }
      return null;
    });
    return slotsToRender;
  }

  function renderItemInMatrix(slot, mtxslotIndex) {
    if (!slot.item[mtxslotIndex]) {
      return null;
    }

    const itm = slot.item[mtxslotIndex];

    const tetragon = (
      <Tetragon
        key={itm.id}
        type={itm.type}
        id={itm.id}
        pos={itm.pos}
        dim={itm.dim}
        size={itm.size}
        slot={itm.slot}
        slot_range={itm.slot_range}
        img={itm.img}
        onDefineAction={props.onAction}
        core={itm.core}
        highlighten={
          props.lighten_items.items[itm.id] ? props.lighten_items.status : ""
        }
        overflowing={overflowing}
      />
    );
    return tetragon;
  }

  function itemInMatrix(slot, mtxslotIndex) {
    return slot.matrixslots[mtxslotIndex].item;
  }

  const invToRender = props.inv.slots.map((slot) => {
    return slot;
    //    if (slot.responsive) {
    //      if (md) {
    //        slot.dim.x = parseFloat(
    //          systemData.responsive[slot.frame]["--md-" + slot.class + "-size"]
    //        );
    //        slot.dim.y = parseFloat(
    //          systemData.responsive[slot.frame]["--md-" + slot.class + "-size"]
    //        );
    //      } else {
    //        slot.dim.x = parseFloat(
    //          systemData.responsive[slot.frame][
    //            "--default-" + slot.class + "-size"
    //          ]
    //        );
    //        slot.dim.y = parseFloat(
    //          systemData.responsive[slot.frame][
    //            "--default-" + slot.class + "-size"
    //          ]
    //        );
    //      }
    //    }
  });

  function scrollInv(posToScrollTo) {
    let scrollPos = (posToScrollTo / 100) * invMaxScroll;
    containerNode.current.scrollLeft = scrollPos;
    setScroll(scrollPos);
  }

  return (
    <div
      className="InvContainer"
      style={{
        overflow: overflowing ? "hidden" : "visible",
      }}
    >
      <InvScroller scroll={scrollInv} overflowing={overflowing}></InvScroller>
      <div
        className="inv_window"
        ref={containerNode}
        style={{
          overflow: overflowing ? "hidden" : "visible",
        }}
      >
        {renderInv(invToRender)}
      </div>
    </div>
  );
}

function InvScroller(props) {
  const trackNode = useRef(null);
  const [allow, setAllow] = useState(false);
  const [pos, setPos] = useState(0);

  function moveInit(e) {
    setAllow(true);
  }

  function trackMoveInit(e) {
    setAllow(true);
    let newPos =
      (e.nativeEvent.offsetX /
        trackNode.current.getBoundingClientRect().width) *
      100;
    setPos(newPos);
    props.scroll(newPos);
  }

  function moveEnd(e) {
    setAllow(false);
  }

  function move(e) {
    if (!allow) {
      return;
    }
    let newPos =
      (e.movementX / trackNode.current.getBoundingClientRect().width) * 100 +
      pos;
    if (newPos > 100) {
      newPos = 100;
    }
    if (newPos < 0) {
      newPos = 0;
    }
    setPos(newPos);
    props.scroll(newPos);
  }

  return (
    <div
      className="InvScroller"
      style={{ display: props.overflowing ? "flex" : "none" }}
    >
      <div
        className="scroller-track"
        ref={trackNode}
        onMouseDown={trackMoveInit}
      >
        <div
          className="scroller-thumb"
          onMouseDown={moveInit}
          style={{ left: "calc(" + pos + "% - 10px" }}
        ></div>
        <div
          className="scroller-underlay"
          onMouseUp={moveEnd}
          onMouseMove={move}
          style={{ display: allow ? "block" : "none" }}
        ></div>
      </div>
    </div>
  );
}

function Stats(props) {
  const { sd, md, ld, gd, egd } = useMediaQueries();

  function renderStats() {
    let statsArray = Object.values(props.stats);
    const statsToRender = statsArray.map((stat, i) => {
      return (
        <Stat
          key={i}
          id={stat.id}
          name={stat.name}
          value={stat.value}
          mods={stat.mods}
          displayStyle={"dnd"}
        />
      );
    });
    return statsToRender;
  }

  function renderEffects() {
    return;
  }

  return (
    <div className={"Stats" + (gd ? " hidden" : "")}>
      <div className="stats-container">
        <h2>STATS</h2>
        {renderStats()}
      </div>
      <div className="effects-container">{renderEffects()}</div>
      <div
        className={"stats-caller"}
        onClick={() => {
          document.querySelector(".Stats").classList.toggle("shown");
        }}
      ></div>
    </div>
  );
}

function Stat(props) {
  function getMod() {
    let mod = 0;
    // count equipped items
    for (const i in props.mods.item.equip) {
      mod = mod + props.mods.item.equip[i].core.stats.equip[props.id].mod;
    }
    return mod;
  }

  const mod = getMod();

  switch (props.displayStyle) {
    case "dnd":
      let new_value = props.value + mod;
      let dnd_mod =
        new_value > 10
          ? Math.floor((-10 + props.value + mod) / 2)
          : Math.ceil((-10 + props.value + mod) / 2);
      return (
        <div className="Stat">
          <div className="stat-name">{props.name}</div>
          <div className="stat-value">{props.value + mod}</div>
          <div className="stat-mod">
            {dnd_mod > 0 ? "+" + dnd_mod : dnd_mod}
          </div>
        </div>
      );
    default:
      return (
        <div className="Stat">
          <div className="stat-name">{props.name}</div>
          <div className="stat-value">{props.value + mod}</div>
          <div className="stat-mod">
            {mod > 0 ? "+" + mod : mod < 0 ? "-" + mod : mod}
          </div>
        </div>
      );
  }
}

function Menu(props) {
  const { sd, md, ld, gd, egd } = useMediaQueries();
  const [image, setImage] = useState(null);
  const title = useRef("");
  const size = useRef({ col: 1, row: 1 });

  async function loadImage(e) {
    const input = e.currentTarget;
    if (input.files.length) {
      var reader = new FileReader();
      reader.addEventListener("load", function () {
        setImage(reader.result);
      });
      reader.readAsDataURL(input.files[0]);
    }
  }

  function updateTitle(e) {
    title.current = e.currentTarget.value;
  }

  async function forge(e) {
    let core = {
      info: {
        title: title.current,
        description: "",
      },
    };
    const item = await newItemObj(core, size.current, { src: image });
    props.hand.item = item;
    props._items[item.id] = item;

    props.update({ hand: props.hand, _items: props._items });
    props.onMoveInit(item.id, true, e);
  }

  function renderImage() {
    if (image) {
      return <img alt="Item Preview" src={image}></img>;
    }
  }

  return (
    <div className={"Menu" + (egd ? " hidden" : "")}>
      <div
        className={"menu-caller"}
        onClick={() => {
          document.querySelector(".Menu").classList.toggle("shown");
        }}
      ></div>
      <div className="forgeitem-container">
        <div className="forgeitem-preview">{renderImage()}</div>
        <input className="forgeitem-name" onInput={updateTitle}></input>
        <div className="forgeitem-imageinput-container">
          <input type="file" onChange={loadImage}></input>
          <button
            className="forgeitem-imageinput"
            onClick={(e) => e.currentTarget.previousSibling.click()}
          >
            Load image
          </button>
        </div>
        <button className="forgeitem-button" onClick={forge}>
          FORGE
        </button>
      </div>
    </div>
  );
}
