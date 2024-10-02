import React, {
  StrictMode,
  useState,
  useRef,
  useEffect,
  memo,
  useMemo,
  createContext,
  useContext,
  useCallback,
} from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { DATA } from "./data.js";
import { systemData, fringes } from "./system_data.js";
import MainFrame from "./frames.js";
import {
  genID,
  newInventoryObj,
  newSlotMatrixObj,
  newSlotObj,
  newItemObj,
  newStatObj,
  DataObj,
  InventoryObj,
  SlotMatrixObj,
  SlotObj,
  SlotCore,
  ItemObj,
  ItemCore,
  ImageObj,
  StatObj,
} from "./classes.js";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

function initData(dataJSON) {
  // finding references

  // props
  let n = 0;
  for (const slot of dataJSON._props.slots) {
    dataJSON._props.slots.splice(n++, 1, dataJSON._slots[slot]);
  }

  // invs and slots
  for (const [id, inv] of Object.entries(dataJSON._invs)) {
    let n = 0;
    for (const slot of inv.slots) {
      inv.slots.splice(n++, 1, dataJSON._slots[slot]);
      dataJSON._slots[slot].inv = inv;
    }
  }

  // slots and items

  for (const [id, slot] of Object.entries(dataJSON._slots)) {
    if (slot.type === "slot") {
      if (slot.item) {
        slot.item = dataJSON._items[slot.item.id];
        dataJSON._items[slot.item.id].slot = slot;
      } else {
        slot.item = null;
      }
    }
    if (slot.type === "slotmatrix") {
      slot.matrixslots = {};
      for (const [range, item] of Object.entries(slot.item)) {
        slot.item[range] = dataJSON._items[item.id];
        dataJSON._items[item.id].slot = slot;
        for (const s of slot.item[range].slot_range) {
          slot.matrixslots[s] = {
            type: "matrixslot",
            item: slot.item[range],
            id: slot.id,
            index: +s,
            size: { col: 1, row: 1 },
          };
        }
      }
      for (let n = 0; n < slot.template.col * slot.template.row; n++) {
        if (!slot.matrixslots[n]) {
          slot.matrixslots[n] = {
            type: "matrixslot",
            item: null,
            id: slot.id,
            index: n,
            size: { col: 1, row: 1 },
          };
        }
      }
    }
  }

  // images and hand
  for (const [id, image] of Object.entries(dataJSON._images)) {
    if (image.item.type === "item") {
      image.item = dataJSON._items[image.item.id];
      dataJSON._items[image.item.id].img = image;
    }
  }

  dataJSON.hand.item = dataJSON.hand.item
    ? dataJSON._items[dataJSON.hand.item.id]
    : null;

  return dataJSON;
}

function initItem(item, data) {
  item.slots = data._slots.filter((a) => (a.item ? a.item.id === item.id : ""));
  if (item.core.statMods) {
    item.core.statMods.forEach((stat) => (stat.stat = data.stat(stat.stat.id)));
  }
  item.img = data.image(item.img.id);
  return item;
}

function packData(dataJSON) {
  const dataString = JSON.stringify(dataJSON, function (key, value) {
    if (key === "slots" || key === "matrixes" || key === "stats") {
      return value.map((e) => e.id);
    } else {
      if (
        key === "item" ||
        key === "img" ||
        key === "matrix" ||
        key === "stat"
      ) {
        if (value) {
          return { type: value.type, id: value.id };
        } else {
          return null;
        }
      } else {
        return value;
      }
    }
  });
  return dataString;
}

// Add responsive parameters
// This step is important for porper style control if we need to get some responsive parameters somehow
// We still use only CSS and have an option to read parameters directly from systemData
// without dealing with media query styling with React (and keeping these parameters in props
// because it won't affect render anyway as we're using CSS to make things responsive)
// We check current device size thru matchMedia()

(function () {
  if (typeof window !== "undefined") {
    const style = new CSSStyleSheet();
    style.insertRule(":root { --b: white }");
    document.adoptedStyleSheets.push(style);

    for (const frame of Object.keys(systemData.responsive)) {
      let cssstyleruleset = "";
      let cssmediaruleset = "";
      for (const rule of Object.keys(systemData.responsive[frame])) {
        if (rule === "media_queries") {
          for (const mediarule of Object.keys(
            systemData.responsive[frame][rule]
          )) {
            let cssrules = "";
            for (const cssrule of systemData.responsive[frame][rule][
              mediarule
            ]) {
              cssrules = cssrules.concat(" ", cssrule);
            }

            cssmediaruleset = cssmediaruleset.concat(
              mediarule + "{ " + cssrules + "}"
            );
          }
        } else {
          cssstyleruleset = cssstyleruleset.concat(
            rule + ": " + systemData.responsive[frame][rule] + ";"
          );
        }
      }
      if (cssstyleruleset) {
        style.insertRule(":root {" + cssstyleruleset + "}", style.length);
      }
      if (cssmediaruleset) {
        style.insertRule(cssmediaruleset, style.length);
      }
    }
  }
})();

const Board = memo(function Board(props) {
  // make refs as we dont need so many re-renders
  // const [item, setItem] = useState(null);
  const item = useRef(null);
  const slot = useRef(null);
  const originslot = useRef(null);
  const hovereditems = useRef({});
  const [lightenItems, setLightenItems] = useState({
    items: hovereditems.current,
    status: null,
  });
  // const [slot, setSlot] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [resizeMod, setResizeMod] = useState(null);
  const [typeToSelect, setTypeToSelect] = useState("item"); // select, move and resize ITEMS by default
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashHovered, setTrashHovered] = useState(false);
  const [modalMenu, setModalMenu] = useState(false);
  const movement = useRef({ moved: false, moveStage: 0 });
  const temp = props.things;

  function defineAction(e, id) {
    // function that is triggered on mousedown
    if (e.currentTarget.classList.contains("Tetragon")) {
      if (e.button === 0 && !props.isEditing && !item.current) {
        if (trashOpen) {
          setTrashOpen(false);
        }
        moveInit(id, false, e);
        return;
      }
      if (e.button === 2 && props.isEditing) {
        id = +e.target.closest(".Tetragon").getAttribute("id");
        editItemInit(id, e);
        return;
      }
    }
  }

  function action(e) {
    // function that is triggered on mousemove
    switch (actionType) {
      case "move":
        var hoveredElements = document.elementsFromPoint(e.clientX, e.clientY);
        if (hoveredElements.find((e) => e.classList.contains("trash"))) {
          setTrashHovered(true);
          // there is no slot
          return;
        } else {
          if (trashHovered) {
            setTrashHovered(false);
          }
        }
        move(e);
        return;
      default:
        return;
    }
  }

  function actionEnd(e) {
    // function that is triggered on mouseup
    // if there is an item
    // toggle stage
    if (item.current) {
      e.target.classList.contains("trash") ? setTrashOpen(false) : "";
      nextStage(e);
      return;
    }
    e.target.classList.contains("trash") ? setTrashOpen(true) : "";
  }

  function moveInit(newItemId, isGeneric, e) {
    // get item reference from data
    item.current = temp.current.item(newItemId);

    // take it from slot, put it in hand
    fromSlot(item.current);
    temp.current.hand.item = item.current;

    nextStage(); // stage initializer to control user gestures
    selectSlot(e, isGeneric); // slot selector to higlight slots and check them

    setActionType("move");

    // as it makes change to prop, main data object — temp, the App should know it
    props.onDataUpdate(temp.current);
  }

  function fromSlot(i) {
    if (!i.slot) {
      return;
    }

    // core logic
    if (!i.slot.inv && i.core.stats && i.core.stats.equip) {
      // on unequip handler
      unequipItem(i);
    }

    // clear item and slot props of each other
    if (i.slot.type === "slot") {
      i.slot.item = null;
    } else if (i.slot.type === "slotmatrix") {
      delete i.slot.item[i.slot_range[0]];
      for (const s of i.slot_range) {
        i.slot.matrixslots[s].item = null;
      }
    }
    i.slot_range = [];
    i.slot = null;
  }

  function move(m) {
    if (!item.current) {
      return;
    }

    // toggle moved state so the Board knows is that dragging or click'n'click movement
    if (!movement.current.moved) {
      movement.current.moved = true;
    }
    selectSlot(m);
  }

  function selectSlot(m, isGeneric) {
    var hoveredElements = document.elementsFromPoint(m.clientX, m.clientY);
    // is there slot?
    // get slot under the item
    // w/o offset
    let newSlot = hoveredElements.find((e) => e.classList.contains("Slot"));
    // if it's the same slot — do nothing
    if (originslot.current === newSlot && !isGeneric) {
      return;
    }
    // resetting parameters
    if (slot.current) {
      slot.current.forEach((s) => {
        s.hovered = "";
      });
      slot.current = null;
    }
    hovereditems.current = {};
    setLightenItems({ items: hovereditems.current, status: null });
    originslot.current = null;
    // if it's found
    if (newSlot) {
      slot.current = temp.current.slot(+newSlot.getAttribute("id"));
      const activeSlots = [];
      originslot.current = newSlot;
      // if it's matrix, find matrixslots
      if (slot.current.type === "slotmatrix") {
        // TODO: move it to matrixslot class or smth
        let sIndex = +newSlot.getAttribute("index");
        const sPos = {
          row: Math.floor(sIndex / slot.current.template.col),
          col: sIndex % slot.current.template.col,
          offset: {
            row: 0,
            col: 0,
          },
        };
        sPos.offset.row =
          sPos.row + item.current.size.row - slot.current.template.row;
        sPos.offset.col =
          sPos.col + item.current.size.col - slot.current.template.col;
        sIndex =
          slot.current.template.col *
            (sPos.row - (sPos.offset.row > 0 ? sPos.offset.row : 0)) +
          (sPos.col - (sPos.offset.col > 0 ? sPos.offset.col : 0));
        for (let r = 0; r < item.current.size.row; r++) {
          for (let c = 0; c < item.current.size.col; c++) {
            let index = sIndex + r * slot.current.template.col + c;
            if (slot.current.matrixslots[index])
              activeSlots.push(slot.current.matrixslots[index]);
          }
        }
      } else {
        // if it's solid slot
        if (slot.current.type === "slot") {
          activeSlots.push(slot.current);
          // nothing more to do
        }
      }
      //  SLOT CHECKS (does it accept such item)
      let verdict = checkSlot(activeSlots);
      if (verdict !== undefined) {
        // hover the new one
        // TODO: hovered things and even props flow are totally destroyed by my last refactoring I suppose
        activeSlots.forEach((s) => {
          s.hovered = verdict;
        });
      }
      // update ref
      slot.current = activeSlots;
    }
  }

  function checkSlot(slots) {
    slots.forEach((s) => {
      if (s.item && !hovereditems.current[s.item.id]) {
        hovereditems.current[s.item.id] = s.item;
      }
    });

    // check item size
    // if slot is solid and item is bigger
    if (
      slots[0].type === "slot" &&
      slots[0].size.col &&
      (item.current.size.col > slots[0].size.col ||
        item.current.size.row > slots[0].size.row)
    ) {
      if (Object.entries(hovereditems.current).length) {
        setLightenItems({ items: hovereditems.current, status: "false" });
        return;
      } else {
        return false;
      }
    } else {
      // if it is matrix and it is smaller than item
      if (
        slots[0].type === "matrixslot" &&
        (item.current.size.col * item.current.size.row > slots.length ||
          slot.current.template.col < item.current.size.col ||
          slot.current.template.row < item.current.size.row)
      ) {
        return false;
      }
    }
    // core checks
    if (!Object.entries(hovereditems.current).length) {
      // there are no items in slots
      setLightenItems({ items: {}, status: null });
      let checker = checkCore(slots[0], item.current);
      return checker;
    }
    if (Object.entries(hovereditems.current).length === 1) {
      // there is just one
      let checker = checkCore(slots[0], item.current);
      setLightenItems({
        items: hovereditems.current,
        status: checker.toString(),
      });
      return checker; // it sets the color of slot, but slot configured so it ignores color in this case reading lighten_items (diablo inventory works in the same manner)
    }
    if (Object.entries(hovereditems.current).length > 1) {
      // there are several items
      setLightenItems({ items: hovereditems.current, status: "false" });
      return;
    }
  }

  function checkCore(s, i) {
    var result = true;

    const params = s.type === "slot" ? s.core : temp.current.slot(s.id).core;
    if (s.type === "slot") {
      return true;
    }
    if (params.accept.length) {
      result = params.accept.includes(i.core.info.type.toLowerCase());
    }
    if (result && params.deny.length) {
      result = !params.deny.includes(i.core.info.type.toLowerCase());
    }

    return result;
  }

  function regItem(e) {
    if (Object.entries(hovereditems.current).length === 1) {
      // if it is going to replace an item

      // unreg the previous
      fromSlot(hovereditems.current[Object.keys(hovereditems.current)[0]]);
    }

    temp.current.hand.item = null;
    // get matrix instead of matrixslot as slot.current may store them
    let originalSlot = temp.current.slot(slot.current[0].id);
    // register the item
    slot.current.forEach((s, i) => {
      if (i === 0 && s.type === "matrixslot") {
        originalSlot.item[s.index] = item.current;
      }
      s.item = item.current;
      item.current.slot = originalSlot;
      item.current.slot_range.push(s.index);
    });
    item.current.isTrashed = false;

    // stats handler
    if (
      !originalSlot.inv &&
      item.current.core.stats &&
      item.current.core.stats.equip
    ) {
      equipItem(item.current);
    }

    let previtem = hovereditems.current[Object.keys(hovereditems.current)[0]];
    if (previtem) {
      // take that item in hand
      moveInit(previtem.id, true, e);
      return;
    }
    return true;
  }

  function equipItem(i) {
    for (const stat in i.core.stats.equip) {
      temp.current._props.stats[stat].add(i, i.type, "equip");
    }
  }

  function unequipItem(i) {
    for (const stat in i.core.stats.equip) {
      temp.current._props.stats[stat].remove(i, i.type, "equip");
    }
  }

  function nextStage(e) {
    if (!e) {
      movement.current.moveStage = 1;
      return;
    }
    // if it is the first stage
    if (movement.current.moveStage === 1) {
      if (actionType === "move") {
        // and it's moved, it means that it was dragged
        if (movement.current.moved) {
          // if there is trash
          if (e.target.classList.contains("trash")) {
            item.current.trash();
            temp.current.hand.item = null;
            cancelMove();
            return;
          }
          // or if there is a slot
          if (slot.current && slot.current.every((s) => s.hovered)) {
            // put it in there
            if (regItem(e)) {
              clearState();
            }
            return;
          } else {
            // just cancel, clear state
            cancelMove();
            return;
          }
        } else {
          movement.current.moved = true; // it was clicked, so it's click'n'click
        }
      }
    }
  }

  function cancelMove() {
    // if slot hasn't written
    if (!item.current.slot && !item.current.isTrashed) {
      // do nothing, 'cause...
      console.log("item must have a slot");
      return;
    }
    clearState();
  }

  function editItemInit(id, e) {
    item.current = temp.current.item(id);
    setModalMenu(true);
  }

  function clearState() {
    // change state values to default, where it has neither slot nor item
    // nothing is moved and move stage is 0
    // unhover slots
    for (const s of slot.current) {
      s.hovered = "";
    }
    if (item.current) {
      item.current.pos = { x: 0, y: 0 };
    }
    item.current = null;
    slot.current = null;
    originslot.current = null;
    movement.current = { moved: false, moveStage: 0 };
    hovereditems.current = {};
    setActionType(null);
    setLightenItems({ items: {}, status: null });
    setTrashHovered(false);
    // update data
    props.onDataUpdate(temp.current);
  }

  return (
    <div
      className="Board"
      onMouseMove={action}
      onMouseUp={actionEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ModalMenu
        shown={modalMenu}
        item={item.current}
        /* backup={item ? JSON.parse(packData(item)) : null} */
        modalClose={(backup) => {
          let backupitem = initItem(backup, temp.current);
          Object.assign(item.current, backupitem);
          setModalMenu(false);
          clearState();
        }}
        modalSave={() => {
          setModalMenu(false);
          clearState();
        }}
      />
      <MainFrame
        things={temp.current}
        onAction={defineAction}
        onMoveInit={moveInit}
        hovered_item={item.current}
        lighten_items={lightenItems}
        hovered_slot={slot.current}
        update={props.onDataUpdate}
      ></MainFrame>
      {/*
      <Trash open={trashOpen} trashClose={() => setTrashOpen(false)}>
        {renderItems(temp.current._items.filter((item) => item.isTrashed))}
      </Trash>
      */}
      <button
        className="square-button trash"
        onClick={(e) => {
          e.preventDefault();
        }}
      >
        {trashHovered ? "Drop" : "Trash"}
      </button>
    </div>
  );
});

function Trash(props) {
  return (
    <div className="TrashContainer" data-open={props.open}>
      <button className="square-button" onClick={props.trashClose}>
        close
      </button>
      <div className="Trash">{props.children}</div>
    </div>
  );
}

function Menu(props) {
  const temp = props.things;

  function showThings() {
    console.log(temp.current);
  }

  function saveThings() {
    var dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(packData(temp.current));
    var downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "things.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  function loadThings() {
    const input = document.getElementById("loadFile");
    input.value = null;
    input.click();
  }

  async function readLoadedThings() {
    const input = document.getElementById("loadFile");
    if (input.files.length) {
      const data = await input.files[0].text().then((result) => {
        return initData(new DataObj(JSON.parse(result)));
      });
    }
  }

  return (
    <div className="Menu">
      <button onClick={showThings}>show things</button>
      <button onClick={saveThings}>save things</button>
      <button onClick={loadThings}>load things</button>
      <input
        id="loadFile"
        type="file"
        accept=".json"
        onInput={readLoadedThings}
        style={{ opacity: 0 }}
      ></input>
      <label htmlFor="EditMode">Edit Mode: </label>
      <input
        id="EditMode"
        type="checkbox"
        onChange={(e) => props.onEditingSet(e.target.checked)}
      ></input>
    </div>
  );
}

function ModalMenu(props) {
  const [title, setTitle] = useState("");
  const [desciption, setDescription] = useState("");
  const [image, setImage] = useState(props.item ? props.item.img.src : "");

  function close() {
    props.modalClose(props.backup);
  }

  function typeOptions() {
    return systemData.types.map((type) => (
      <option value={type} key={type}>
        {type}
      </option>
    ));
  }

  function qualityOptions() {
    return systemData.qualities.map((quality) => (
      <option value={quality} key={quality}>
        {quality}
      </option>
    ));
  }

  function changeImage(e) {
    setImage(
      (props.item.img.src = document.getElementById("image-preview").src =
        URL.createObjectURL(e.target.files[0]))
    );
  }

  if (props.shown) {
    return (
      <div className="modal-container">
        <button onClick={close}>Close</button>
        <button onClick={props.modalSave}>Save</button>
        <div className="modal-inner">
          <div className="item-menu">
            <div className="item-info">
              <div className="item-info-edit">
                <input
                  defaultValue={props.item.core.info.title}
                  onChange={(e) =>
                    setTitle((props.item.core.info.title = e.target.value))
                  }
                ></input>
                <select
                  defaultValue={props.item.core.info.type}
                  onChange={(e) => (props.item.core.info.type = e.target.value)}
                >
                  {typeOptions()}
                </select>
                <select
                  defaultValue={props.item.core.quality}
                  onChange={(e) => (props.item.core.quality = e.target.value)}
                >
                  {qualityOptions()}
                </select>
                <input
                  defaultValue={props.item.core.info.description}
                  onChange={(e) =>
                    setDescription(
                      (props.item.core.info.description = e.target.value)
                    )
                  }
                ></input>
              </div>
              <div className="item-info-preview">
                <Info shown={true} info={props.item.core.info} preview={true} />
              </div>
            </div>
            <div className="item-image">
              <div className="item-image-edit">
                <input type="file" onChange={changeImage}></input>
              </div>
              <div className="item-image-preview">
                <img
                  id="image-preview"
                  alt="Item Preview"
                  src={props.item.img.src}
                ></img>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    return null;
  }
}

function Hand(props) {
  const temp = props.things;

  function renderItem(item) {
    if (!item) {
      return null;
    }

    return (
      <Tetragon
        key={item.id}
        type={item.type}
        id={item.id}
        pos={item.pos}
        dim={item.dim}
        size={item.size}
        slots={item.slots}
        img={item.img}
        active={item} //&& item.id === itm.id ? true : false}
        core={item.core}
      />
    );
  }

  return (
    <div className="Hand">
      <div
        className="itemInHand"
        style={{ marginLeft: props.pos.x, marginTop: props.pos.y }}
      >
        {renderItem(temp.current.hand.item)}
      </div>
    </div>
  );
}

export function Slot(props) {
  function action(e) {
    props.onAction && props.editing ? props.onAction(e, props.id) : "";
  }

  return (
    <div
      onMouseDown={action}
      className={"Slot".concat(props.classes ? props.classes : "")}
      empty={(!props.item).toString()}
      item={props.item ? props.item.id : "false"}
      id={props.id}
      hovered={props.hovered.toString()}
      index={props.index}
    >
      {props.children}
      <div className="slotInner"></div>
    </div>
  );
}

export class Tetragon extends React.Component {
  constructor(props) {
    super(props);
    this.state = { typeToSelect: "item", hovered: false };
    this.myRef = React.createRef();
  }

  handleAction = (e) => {
    this.props.onDefineAction(e, this.props.id);
  };

  handleHover = (e) => {
    this.setState({ hovered: true });
  };

  handleUnhover = (e) => {
    this.setState({ hovered: false });
  };

  readRarity = () => {
    var quality;
    switch (this.props.core.quality) {
      case "Rare":
        quality = "var(--rare-color)";
        break;
      default:
        break;
    }
    return quality;
  };

  render() {
    let cssProperties = {
      width: this.props.size.col * 100 + "%",
      height: this.props.size.row * 100 + "%",
      zIndex: this.props.active || this.state.hovered ? 100 : 5,
    };
    const color = this.readRarity();
    let innerCss = {
      background:
        this.props.active && this.props.active.id === this.props.id
          ? "unset"
          : color,
    };
    // set proper background to show items interaction
    cssProperties["--second-background"] = "rgba(200,0,0,0)";

    return (
      <div
        ref={this.myRef}
        className="Tetragon"
        onMouseOver={this.handleHover}
        onMouseOut={this.handleUnhover}
        onMouseDown={this.handleAction}
        onContextMenu={(e) => e.preventDefault()}
        style={cssProperties}
        highlighten={this.props.highlighten ? this.props.highlighten : ""}
        id={this.props.id}
      >
        <div className="tetragonInner" style={innerCss}></div>
        <Info
          overflowing={this.props.overflowing}
          info={this.props.core.info ? this.props.core.info : null}
          shown={!this.props.active && this.state.hovered}
          itemRectBottom={
            this.myRef.current
              ? this.myRef.current.getBoundingClientRect().bottom
              : null
          }
          itemRectTop={
            this.myRef.current
              ? this.myRef.current.getBoundingClientRect().top
              : null
          }
        />
        <Image
          src={this.props.img.src}
          slot={this.props.slot}
          item={this.props}
          pos={{ x: this.props.img.pos.x, y: this.props.img.pos.y }}
          dim={{ x: this.props.img.dim.x, y: this.props.img.dim.y }}
          overflow={this.state.typeToSelect === "item" ? "hidden" : "initial"}
        />
        {/*{this.props.pos.x}:{this.props.pos.y}
        <br />
        {this.props.id}
        <br />
        {this.props.active.toString()}
              */}
      </div>
    );
  }
}

export function Info(props) {
  const top = {
    transform: "translate(-50%, -100%)",
    top: "0%",
    position: "absolute",
  };
  const bottom = {
    transform: "translate(-50%, 0%)",
    top: "100%",
    position: "absolute",
  };
  const center = {
    transform: "translate(-50%, -50%)",
    top: "50%",
    position: "fixed",
  };
  const preview = {
    transform: "none",
    top: "auto",
    position: "relative",
  };
  const [position, setPosition] = useState(top);
  const myRef = useRef(null);
  let description = "";

  useEffect(() => {
    let pos = top;
    if (!props.preview) {
      const node = myRef.current;
      if (node) {
        if (props.itemRectTop < node.offsetHeight) {
          pos = bottom;
        }
        if (
          props.overflowing ||
          node.getBoundingClientRect().left < 0 ||
          node.getBoundingClientRect().right > document.body.offsetWidth ||
          node.offsetHeight > document.body.offsetHeight - props.itemRectBottom
        ) {
          pos = center;
        }
        setPosition(pos);
        return () => setPosition(top);
      }
    } else {
      setPosition(preview);
    }
  }, [props.shown]);

  function renderLines(desc) {
    return desc.split(" | ").map((line, i) => <Line key={i} text={line} />);
  }

  if (props.shown && props.info) {
    return (
      <div
        className="info-container"
        style={{
          position: position.position,
        }}
      >
        <div
          ref={myRef}
          className="Info"
          style={{
            transform: position.transform,
            top: position.top,
            left: props.preview ? "0" : "50%",
            position: props.preview ? "relative" : "absolute",
          }}
        >
          <h1>{props.info.title}</h1>
          <h2>{props.info.type}</h2>
          {renderLines(props.info.description)}
        </div>
      </div>
    );
  }
  return null;
}

export function Line(props) {
  return <p className="Line">{props.text}</p>;
}

export function Image(props) {
  const margin = { left: props.pos.x, top: props.pos.y };
  const dimensions = {
    width: props.dim.x,
    height: props.dim.y,
  };
  const { sd, md, ld, gd, egd } = useMediaQueries();

  const imageClipDimensions = {
    width: "100%",
    height: "100%",
  };

  const scaleRatio = useMemo(() => {
    let scaleRatio = { x: 1, y: 1 };
    if (props.slot) {
      let slotSize = {
        col:
          props.slot.type === "slot"
            ? props.slot.size.col
              ? props.slot.size.col
              : 1
            : props.item.size.col,
        row:
          props.slot.type === "slot"
            ? props.slot.size.row
              ? props.slot.size.row
              : 1
            : props.item.size.row,
      };
      scaleRatio.x =
        (props.slot.dim.x * slotSize.col) /
        (systemData.responsive.default_px_size * props.item.size.col);
      scaleRatio.y =
        (props.slot.dim.y * slotSize.row) /
        (systemData.responsive.default_px_size * props.item.size.row);
      if (scaleRatio.x < 1 && scaleRatio.y > 1) {
        scaleRatio.y = scaleRatio.x;
      }
      if (scaleRatio.y < 1 && scaleRatio.x > 1) {
        scaleRatio.x = scaleRatio.y;
      }
      if (scaleRatio.y > 1 && scaleRatio.x > 1) {
        scaleRatio = { x: 1, y: 1 };
      }
    }
    return scaleRatio;
  }, [props.slot, sd]);

  return (
    <div
      className="Image"
      style={{
        overflow: props.overflow,
        width: imageClipDimensions.width,
        height: imageClipDimensions.height,
      }}
    >
      <div
        className="img-transformer"
        style={{
          marginLeft: margin.left,
          marginTop: margin.top,
          width: dimensions.width,
          height: dimensions.height,
          transform: "scale(" + scaleRatio.x + ", " + scaleRatio.y + ")",
        }}
      >
        <div className="side top"></div>
        <div className="side right"></div>
        <div className="side bottom"></div>
        <div className="side left"></div>
        <div className="corner top left"></div>
        <div className="corner top right"></div>
        <div className="corner bottom left"></div>
        <div className="corner bottom right"></div>
        <img src={props.src} alt="" draggable="false" />
      </div>
    </div>
  );
}

export function useScreenSize() {
  const isClient = typeof window === "object";

  function getSize() {
    return {
      width: isClient ? window.innerWidth : undefined,
      height: isClient ? window.innerHeight : undefined,
    };
  }

  const [windowSize, setWindowSize] = useState(getSize);

  useEffect(() => {
    if (!isClient) {
      return false;
    }

    function handleResize() {
      setWindowSize(getSize());
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty array ensures that effect is only run on mount and unmount

  return windowSize;
}

export function useMediaQuery(query) {
  const mediaQuery = useMemo(() => window.matchMedia(query), [query]);
  const [match, setMatch] = useState(mediaQuery.matches);

  useEffect(() => {
    const onChange = () => setMatch(mediaQuery.matches);
    mediaQuery.addEventListener("change", onChange);

    return () => mediaQuery.removeEventListener("change", onChange);
  }, [mediaQuery]);

  return match;
}

export function useMediaQueries() {
  // 780 992 1200
  const sd = useMediaQuery(fringes.sd);
  const md = useMediaQuery(fringes.md);
  const ld = useMediaQuery(fringes.ld);
  const gd = useMediaQuery(fringes.gd);
  const egd = useMediaQuery(fringes.egd);

  return { sd, md, ld, gd, egd };
}

console.log(initData(new DataObj(JSON.parse(JSON.stringify(DATA)))));
//const DATA = initData(new DataObj(JSON.parse(JSON.stringify(data))));

export default function App(props) {
  const [current, setCurrent] = useState(props.data);
  const [step, setStep] = useState(0);
  const [hand, setHand] = useState({ x: 0, y: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const history = useRef([]);
  const dataUpdate = useCallback(
    (newData) => {
      setStep(step + 1);
      setCurrent(newData);
    },
    [step]
  );

  const things = useMemo(
    () => ({
      step,
      current,
    }),
    [step, current]
  );

  function moveHand(e) {
    setHand({ x: e.clientX, y: e.clientY });
  }

  return (
    <div className="App" onMouseMove={moveHand}>
      {/*
      <Menu
        onDataUpdate={dataUpdate}
        things={things}
        onEditingSet={setIsEditing}
      />
      */}
      <Hand pos={hand} things={things} />
      <Board onDataUpdate={dataUpdate} things={things} isEditing={isEditing} />
    </div>
  );
}

root.render(
  <StrictMode>
    <App data={initData(new DataObj(JSON.parse(JSON.stringify(DATA))))} />
  </StrictMode>
);
