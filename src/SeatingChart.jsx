import { useState, useRef, useEffect, useCallback } from "react";

/* ──────────────────────── DATA HELPERS ──────────────────────── */
let _uid = Date.now();
const uid = () => String(++_uid);

const C = {
  bg: "#f4f4f4", panel: "#ffffff", canvas: "#fafafa",
  desk: "#eeeeee", deskBorder: "#cccccc", deskSelected: "#fe5000",
  seatEmpty: "#fff", seatBorder: "#aaa",
  seatFilled: "#1a1a1a", seatIEP: "#fe5000", seatSep: "#8b5fbf",
  friend: "#2e86c1", conflict: "#cb3b3b",
  board: "#1a1a1a", boardTxt: "#ffffff",
  accent: "#fe5000", accentBg: "#fff0e5",
  danger: "#b83232", dangerBg: "#fceaea",
  text: "#1a1a1a", muted: "#666666", subtle: "#bbbbbb",
  border: "#dddddd", borderLight: "#eeeeee",
};

const DESK_TEMPLATES = [
  { tid: "single", label: "Single Desk", w: 70, h: 50, seats: [{ rx: 0.5, ry: 1.0 }] },
  { tid: "pair", label: "Pair", w: 120, h: 50, seats: [{ rx: 0.29, ry: 1.0 }, { rx: 0.71, ry: 1.0 }] },
  { tid: "group4", label: "Group of 4", w: 120, h: 100, seats: [{ rx: 0.29, ry: 0.0 }, { rx: 0.71, ry: 0.0 }, { rx: 0.29, ry: 1.0 }, { rx: 0.71, ry: 1.0 }] },
  { tid: "group6", label: "Group of 6", w: 180, h: 100, seats: [{ rx: 0.19, ry: 0.0 }, { rx: 0.5, ry: 0.0 }, { rx: 0.81, ry: 0.0 }, { rx: 0.19, ry: 1.0 }, { rx: 0.5, ry: 1.0 }, { rx: 0.81, ry: 1.0 }] },
  { tid: "row3", label: "Row of 3", w: 180, h: 50, seats: [{ rx: 0.17, ry: 1.0 }, { rx: 0.5, ry: 1.0 }, { rx: 0.83, ry: 1.0 }] },
];

const PERIOD_LABELS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "Homeroom", "Advisory", "A Block", "B Block", "C Block", "D Block", "E Block", "F Block", "G Block", "Custom"];

const font = `'Source Serif 4', 'Georgia', serif`;
const sansFont = `'DM Sans', 'Segoe UI', sans-serif`;

/* ──────────────────────── STORAGE ──────────────────────── */
const STORAGE_KEY = "seating-chart-data-v2";

// Storage layer — uses Supabase if available, falls back to localStorage
// Replace these with Supabase calls once you set up your backend (see SETUP-GUIDE.md)
async function loadData(userId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY + (userId ? `-${userId}` : ""));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function saveData(data, userId) {
  try {
    localStorage.setItem(STORAGE_KEY + (userId ? `-${userId}` : ""), JSON.stringify(data));
  } catch (e) { console.error("Save failed", e); }
}

function makeDefaultData() {
  const roomId = uid();
  const classId = uid();
  return {
    rooms: [{
      id: roomId, name: "My Classroom", boardPosition: "top", zoom: 1,
      desks: [],
    }],
    classes: [{
      id: classId, name: "Period 1", period: "1st", roomId,
      students: [], seatAssignments: {},
    }],
    activeClassId: classId,
    templates: [],
  };
}

/* ──────────────────────── MAIN COMPONENT ──────────────────────── */
export default function SeatingChartApp() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebar, setSidebar] = useState("desks");
  const [selectedDeskIds, setSelectedDeskIds] = useState(new Set());
  const [dragState, setDragState] = useState(null);
  const [placingStudentId, setPlacingStudentId] = useState(null);
  const [pickedUpFromKey, setPickedUpFromKey] = useState(null);
  const [seatDrag, setSeatDrag] = useState(null); // { studentId, originKey, mouseX, mouseY }
  const [relMode, setRelMode] = useState(null);
  const [relFirst, setRelFirst] = useState(null);
  const [editStudentId, setEditStudentId] = useState(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showManageRooms, setShowManageRooms] = useState(false);
  const [showTemplateBank, setShowTemplateBank] = useState(false);
  const [printHtml, setPrintHtml] = useState(null);
  const [showAddClass, setShowAddClass] = useState(false);
  const [editClassId, setEditClassId] = useState(null);
  const [testDay, setTestDay] = useState(false);
  const [showRels, setShowRels] = useState(true);
  const [disableSeatMode, setDisableSeatMode] = useState(false);
  const [lockLayout, setLockLayout] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: "", iep: false, iepNotes: "", separateSetting: false, preferFront: false });
  const [newClass, setNewClass] = useState({ name: "", period: "1st", roomId: "" });
  const [newRoomName, setNewRoomName] = useState("");
  const [customPeriod, setCustomPeriod] = useState("");
  const [editRoomId, setEditRoomId] = useState(null);
  const [copyFromClassId, setCopyFromClassId] = useState("");
  const canvasRef = useRef(null);
  const saveTimeout = useRef(null);
  const [undoStack, setUndoStack] = useState([]); // stack of { classId, seatAssignments }

  const pushUndo = () => {
    if (!activeClass) return;
    setUndoStack(prev => [...prev.slice(-19), { classId: activeClass.id, seatAssignments: { ...activeClass.seatAssignments } }]);
  };
  const undo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    updateClass(last.classId, c => ({ ...c, seatAssignments: last.seatAssignments }));
  };

  // Load on mount
  useEffect(() => {
    (async () => {
      const stored = await loadData();
      setData(stored || makeDefaultData());
      setLoading(false);
    })();
  }, []);

  // Auto-save on change
  const persist = useCallback((newData) => {
    setData(newData);
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => saveData(newData), 400);
  }, []);

  if (loading || !data) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: sansFont, color: C.muted }}>
      Loading your seating charts…
    </div>
  );

  /* ──── Derived state ──── */
  const activeClass = data.classes.find(c => c.id === data.activeClassId) || data.classes[0];
  const activeRoom = data.rooms.find(r => r.id === activeClass?.roomId) || data.rooms[0];
  const students = activeClass?.students || [];
  const assignments = activeClass?.seatAssignments || {};
  const desks = activeRoom?.desks || [];
  const assignedIds = new Set(Object.values(assignments));
  const byLastName = (a, b) => {
    const aLast = a.name.trim().split(" ").slice(-1)[0].toLowerCase();
    const bLast = b.name.trim().split(" ").slice(-1)[0].toLowerCase();
    return aLast < bLast ? -1 : aLast > bLast ? 1 : 0;
  };
  const unassigned = students.filter(s => !assignedIds.has(s.id)).sort(byLastName);
  const assigned = students.filter(s => assignedIds.has(s.id)).sort(byLastName);
  const getStudent = (id) => students.find(s => s.id === id);
  const seatKey = (deskId, idx) => `${deskId}:${idx}`;
  const getSeatStudent = (deskId, idx) => { const sid = assignments[seatKey(deskId, idx)]; return sid ? getStudent(sid) : null; };
  const isSeatDisabled = (deskId, idx) => {
    const desk = desks.find(d => d.id === deskId);
    return desk?.disabledSeats?.includes(idx) || false;
  };

  /* ──── Updaters ──── */
  const updateRoom = (roomId, fn) => {
    persist({ ...data, rooms: data.rooms.map(r => r.id === roomId ? fn(r) : r) });
  };
  const updateClass = (classId, fn) => {
    persist({ ...data, classes: data.classes.map(c => c.id === classId ? fn(c) : c) });
  };
  const updateActiveClass = (fn) => updateClass(activeClass.id, fn);
  const updateActiveRoom = (fn) => updateRoom(activeRoom.id, fn);

  /* ──── Desk actions ──── */
  const addDesk = (tpl) => {
    const desk = {
      id: uid(), tid: tpl.tid, x: 250 + Math.random() * 120, y: 180 + Math.random() * 80,
      w: tpl.w, h: tpl.h, seats: tpl.seats.map(s => ({ ...s })), rotation: 0,
    };
    updateActiveRoom(r => ({ ...r, desks: [...r.desks, desk] }));
  };
  const deleteDesk = (deskId) => {
    updateActiveRoom(r => ({ ...r, desks: r.desks.filter(d => d.id !== deskId) }));
    // Clear assignments for this desk across ALL classes using this room
    const newClasses = data.classes.map(c => {
      if (c.roomId !== activeRoom.id) return c;
      const sa = { ...c.seatAssignments };
      Object.keys(sa).forEach(k => { if (k.startsWith(deskId + ":")) delete sa[k]; });
      return { ...c, seatAssignments: sa };
    });
    persist({ ...data, rooms: data.rooms.map(r => r.id === activeRoom.id ? { ...activeRoom, desks: activeRoom.desks.filter(d => d.id !== deskId) } : r), classes: newClasses });
    setSelectedDeskIds(prev => { const next = new Set(prev); next.delete(deskId); return next; });
  };

  /* ──── Seat interactions ──── */

  // Click handler — for disable mode, relationship mode, and sidebar placing
  const handleSeatClick = (deskId, idx) => {
    if (seatDrag) return; // ignore clicks during drag
    const key = seatKey(deskId, idx);
    const current = assignments[key];
    const disabled = isSeatDisabled(deskId, idx);

    // Disable seat mode: toggle this seat on/off
    if (disableSeatMode) {
      updateActiveRoom(r => ({
        ...r,
        desks: r.desks.map(d => {
          if (d.id !== deskId) return d;
          const ds = d.disabledSeats || [];
          const isDisabled = ds.includes(idx);
          return { ...d, disabledSeats: isDisabled ? ds.filter(i => i !== idx) : [...ds, idx] };
        })
      }));
      if (!disabled && current) {
        const newClasses = data.classes.map(c => {
          if (c.roomId !== activeRoom.id) return c;
          const sa = { ...c.seatAssignments };
          delete sa[key];
          return { ...c, seatAssignments: sa };
        });
        persist({ ...data, rooms: data.rooms.map(r => r.id === activeRoom.id ? {
          ...r, desks: r.desks.map(d => {
            if (d.id !== deskId) return d;
            return { ...d, disabledSeats: [...(d.disabledSeats || []), idx] };
          })
        } : r), classes: newClasses });
      }
      return;
    }

    if (disabled) return;

    if (relMode) {
      if (current) {
        if (!relFirst) { setRelFirst(current); return; }
        if (relFirst === current) { setRelFirst(null); return; }
        linkStudents(relFirst, current);
      }
      return;
    }

    // Sidebar placing
    if (placingStudentId) {
      pushUndo();
      const sa = { ...assignments };
      Object.keys(sa).forEach(k => { if (sa[k] === placingStudentId) delete sa[k]; });
      sa[key] = placingStudentId;
      updateActiveClass(c => ({ ...c, seatAssignments: sa }));
      setPlacingStudentId(null);
      setPickedUpFromKey(null);
      return;
    }
  };

  // Mouse down on seat — start dragging a seated student
  const handleSeatMouseDown = (e, deskId, idx) => {
    if (disableSeatMode || relMode || placingStudentId) return;
    const disabled = isSeatDisabled(deskId, idx);
    if (disabled) return;
    const key = seatKey(deskId, idx);
    const current = assignments[key];
    if (!current) return; // nothing to drag from empty seat
    e.stopPropagation();
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    setSeatDrag({
      studentId: current,
      originKey: key,
      mouseX: e.clientX - rect.left,
      mouseY: e.clientY - rect.top,
    });
  };

  // Mouse up on seat — drop student here
  const handleSeatMouseUp = (deskId, idx) => {
    if (!seatDrag) return;
    const disabled = isSeatDisabled(deskId, idx);
    if (disabled) { setSeatDrag(null); return; }
    const targetKey = seatKey(deskId, idx);
    const targetStudent = assignments[targetKey];

    if (targetKey === seatDrag.originKey) {
      // Dropped on same seat — no-op
      setSeatDrag(null);
      return;
    }

    pushUndo();
    const sa = { ...assignments };
    // Swap or move
    if (targetStudent) {
      sa[seatDrag.originKey] = targetStudent; // swap target back to origin
    } else {
      delete sa[seatDrag.originKey]; // vacate origin
    }
    sa[targetKey] = seatDrag.studentId;
    updateActiveClass(c => ({ ...c, seatAssignments: sa }));
    setSeatDrag(null);
  };

  /* ──── Relationships ──── */
  const linkStudents = (id1, id2) => {
    if (id1 === id2) { setRelFirst(null); return; }
    const field = relMode === "friend" ? "friendIds" : "conflictIds";
    updateActiveClass(c => ({
      ...c,
      students: c.students.map(s => {
        if (s.id === id1) { const has = s[field].includes(id2); return { ...s, [field]: has ? s[field].filter(x => x !== id2) : [...s[field], id2] }; }
        if (s.id === id2) { const has = s[field].includes(id1); return { ...s, [field]: has ? s[field].filter(x => x !== id1) : [...s[field], id1] }; }
        return s;
      })
    }));
    setRelFirst(null); setRelMode(null);
  };

  /* ──── Student actions ──── */
  const addStudent = () => {
    if (!newStudent.name.trim()) return;
    updateActiveClass(c => ({ ...c, students: [...c.students, { id: uid(), ...newStudent, friendIds: [], conflictIds: [] }] }));
    setNewStudent({ name: "", iep: false, iepNotes: "", separateSetting: false, preferFront: false });
    setShowAddStudent(false);
  };
  const updateStudent = (sid, upd) => {
    updateActiveClass(c => ({ ...c, students: c.students.map(s => s.id === sid ? { ...s, ...upd } : s) }));
  };
  const deleteStudent = (sid) => {
    updateActiveClass(c => {
      const sa = { ...c.seatAssignments };
      Object.keys(sa).forEach(k => { if (sa[k] === sid) delete sa[k]; });
      return {
        ...c,
        students: c.students.filter(s => s.id !== sid).map(s => ({
          ...s, friendIds: s.friendIds.filter(x => x !== sid), conflictIds: s.conflictIds.filter(x => x !== sid)
        })),
        seatAssignments: sa,
      };
    });
    setEditStudentId(null);
  };
  /* ──── Smart auto-assign ──── */
  const smartAutoAssign = () => {
    if (!activeRoom || !activeClass) return;
    pushUndo();
    const bp = activeRoom.boardPosition || "top";

    // 1) Compute each seat's world position (center of seat circle on canvas)
    const seatInfos = []; // { key, worldX, worldY, deskId, idx, deskIndex }
    desks.forEach((desk, di) => {
      desk.seats.forEach((seat, idx) => {
        if (desk.disabledSeats?.includes(idx)) return; // skip disabled
        const sx = seat.rx * desk.w, sy = seat.ry * desk.h;
        const rad = (desk.rotation * Math.PI) / 180;
        const cx = desk.w / 2, cy = desk.h / 2;
        const dx = sx - cx, dy = sy - cy;
        const wx = desk.x + cx + dx * Math.cos(rad) - dy * Math.sin(rad);
        const wy = desk.y + cy + dx * Math.sin(rad) + dy * Math.cos(rad);
        seatInfos.push({ key: seatKey(desk.id, idx), wx, wy, deskId: desk.id, idx, deskIndex: di });
      });
    });

    // 2) Sort seats by distance to board side (front → back)
    const distToBoard = (s) => {
      if (bp === "top") return s.wy;
      if (bp === "bottom") return -s.wy;
      if (bp === "left") return s.wx;
      return -s.wx; // right
    };
    seatInfos.sort((a, b) => distToBoard(a) - distToBoard(b));

    // 3) Distance between two seat infos
    const seatDist = (a, b) => Math.sqrt((a.wx - b.wx) ** 2 + (a.wy - b.wy) ** 2);
    const sameDeskGroup = (a, b) => a.deskId === b.deskId;

    // 4) Categorize students
    const needsFront = unassigned.filter(s => s.preferFront);
    const iepOther = unassigned.filter(s => s.iep && !s.preferFront);
    const regular = unassigned.filter(s => !s.iep && !s.preferFront);

    // Ordered placement: preferential-front first, then other IEP, then regular
    const placementOrder = [...needsFront, ...iepOther, ...regular];

    // 5) Build result assignments (start with existing)
    const sa = { ...assignments };
    const usedSeatKeys = new Set(Object.keys(sa));
    const placedMap = {}; // studentId → seatInfo

    // Pre-populate placedMap with already-assigned students
    Object.entries(sa).forEach(([k, sid]) => {
      const info = seatInfos.find(si => si.key === k);
      if (info) placedMap[sid] = info;
    });

    // 6) Score a candidate seat for a student (lower = better)
    const scoreSeat = (student, seatInfo) => {
      let score = 0;

      // Prefer front seats for students with preferential front seating
      if (student.preferFront) {
        score += distToBoard(seatInfo) * 2;
      } else {
        score += distToBoard(seatInfo) * 0.3; // mild preference toward front
      }

      // Penalty: friend on same desk group or very close → heavy penalty (we want them apart)
      student.friendIds.forEach(fid => {
        const friendSeat = placedMap[fid];
        if (friendSeat) {
          if (sameDeskGroup(seatInfo, friendSeat)) score += 500;
          else {
            const d = seatDist(seatInfo, friendSeat);
            if (d < 120) score += 300 - d;
          }
        }
      });

      // Penalty: conflict student nearby → very heavy penalty
      student.conflictIds.forEach(cid => {
        const conflictSeat = placedMap[cid];
        if (conflictSeat) {
          if (sameDeskGroup(seatInfo, conflictSeat)) score += 1000;
          else {
            const d = seatDist(seatInfo, conflictSeat);
            if (d < 200) score += 600 - d * 2;
          }
        }
      });

      return score;
    };

    // 7) Place each student in best available seat
    placementOrder.forEach(student => {
      const available = seatInfos.filter(si => !usedSeatKeys.has(si.key));
      if (available.length === 0) return;

      let bestSeat = available[0];
      let bestScore = scoreSeat(student, available[0]);

      for (let i = 1; i < available.length; i++) {
        const sc = scoreSeat(student, available[i]);
        if (sc < bestScore) { bestScore = sc; bestSeat = available[i]; }
      }

      sa[bestSeat.key] = student.id;
      usedSeatKeys.add(bestSeat.key);
      placedMap[student.id] = bestSeat;
    });

    updateActiveClass(c => ({ ...c, seatAssignments: sa }));
  };

  const clearAssignments = () => {
    if (!window.confirm(`Clear all seat assignments for ${activeClass?.name || "this class"}?`)) return;
    pushUndo();
    updateActiveClass(c => ({ ...c, seatAssignments: {} }));
  };

  const separateStudents = students.filter(s => s.separateSetting);

  /* ──── Print-friendly export ──── */
  const printChart = () => {
    if (!activeRoom || !activeClass) return;
    const bp = activeRoom.boardPosition || "top";

    // Build seat data for rendering
    const seatData = [];
    desks.forEach(desk => {
      desk.seats.forEach((seat, idx) => {
        const disabled = desk.disabledSeats?.includes(idx);
        const sx = seat.rx * desk.w, sy = seat.ry * desk.h;
        const rad = (desk.rotation * Math.PI) / 180;
        const cx = desk.w / 2, cy = desk.h / 2;
        const dx = sx - cx, dy = sy - cy;
        const wx = desk.x + cx + dx * Math.cos(rad) - dy * Math.sin(rad);
        const wy = desk.y + cy + dx * Math.sin(rad) + dy * Math.cos(rad);
        const sid = !disabled ? assignments[seatKey(desk.id, idx)] : null;
        const st = sid ? students.find(s => s.id === sid) : null;
        seatData.push({ wx, wy, student: st, deskId: desk.id, idx, disabled });
      });
    });

    // Find canvas bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    desks.forEach(d => {
      const pad = Math.max(d.w, d.h);
      minX = Math.min(minX, d.x - 20); minY = Math.min(minY, d.y - 20);
      maxX = Math.max(maxX, d.x + pad + 20); maxY = Math.max(maxY, d.y + pad + 20);
    });
    seatData.forEach(s => {
      minX = Math.min(minX, s.wx - 30); minY = Math.min(minY, s.wy - 30);
      maxX = Math.max(maxX, s.wx + 30); maxY = Math.max(maxY, s.wy + 30);
    });
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 600; }
    const vw = maxX - minX + 60, vh = maxY - minY + 60;

    // Build desk rects SVG
    const desksSvg = desks.map(d => {
      const cx = d.x + d.w / 2, cy = d.y + d.h / 2;
      return `<g transform="translate(${cx - minX + 30}, ${cy - minY + 30}) rotate(${d.rotation})">
        <rect x="${-d.w/2 + 2}" y="${-d.h/2 + 2}" width="${d.w - 4}" height="${d.h - 4}" rx="4" fill="#e8dcc8" stroke="#c4b494" stroke-width="1.5"/>
      </g>`;
    }).join("\n");

    // Build seat circles + names
    const seatsSvg = seatData.map(s => {
      const x = s.wx - minX + 30, y = s.wy - minY + 30;
      if (s.disabled) {
        return `<g>
          <circle cx="${x}" cy="${y}" r="15" fill="#e0dcd4" stroke="#ccc" stroke-width="1.5"/>
          <line x1="${x - 8}" y1="${y - 8}" x2="${x + 8}" y2="${y + 8}" stroke="#aaa" stroke-width="2"/>
          <line x1="${x + 8}" y1="${y - 8}" x2="${x - 8}" y2="${y + 8}" stroke="#aaa" stroke-width="2"/>
        </g>`;
      }
      const st = s.student;
      const hidden = testDay && st?.separateSetting;
      let fill = "#fff", stroke = "#bbb";
      if (st && !hidden) {
        fill = st.iep ? "#c27a2a" : "#4a7c59";
        stroke = "#fff";
      } else if (hidden) {
        fill = "#8b5fbf44"; stroke = "#8b5fbf";
      }
      const initials = st ? st.name.split(" ").map(n => n[0]).join("") : "";
      const fullName = st && !hidden ? st.name : "";
      return `<g>
        <circle cx="${x}" cy="${y}" r="15" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
        ${st && !hidden ? `<text x="${x}" y="${y + 1}" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="700" fill="#fff" font-family="sans-serif">${initials}</text>` : ""}
        ${hidden ? `<text x="${x}" y="${y + 1}" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="#8b5fbf">✕</text>` : ""}
        ${fullName ? `<text x="${x}" y="${y + 22}" text-anchor="middle" font-size="8" fill="#333" font-family="sans-serif">${fullName}${st.iep ? " ★" : ""}${st.preferFront ? " ↑" : ""}</text>` : ""}
      </g>`;
    }).join("\n");

    // Board line
    let boardSvg = "";
    const bw = vw, bh = vh;
    if (bp === "top") boardSvg = `<rect x="30" y="4" width="${bw - 60}" height="18" rx="3" fill="#2f4f3a"/><text x="${bw/2}" y="16" text-anchor="middle" font-size="9" font-weight="700" fill="#e8f0e8" font-family="sans-serif" letter-spacing="2">BOARD</text>`;
    else if (bp === "bottom") boardSvg = `<rect x="30" y="${bh - 22}" width="${bw - 60}" height="18" rx="3" fill="#2f4f3a"/><text x="${bw/2}" y="${bh - 10}" text-anchor="middle" font-size="9" font-weight="700" fill="#e8f0e8" font-family="sans-serif" letter-spacing="2">BOARD</text>`;
    else if (bp === "left") boardSvg = `<rect x="4" y="30" width="18" height="${bh - 60}" rx="3" fill="#2f4f3a"/><text x="13" y="${bh/2}" text-anchor="middle" font-size="9" font-weight="700" fill="#e8f0e8" font-family="sans-serif" letter-spacing="2" transform="rotate(-90, 13, ${bh/2})">BOARD</text>`;
    else boardSvg = `<rect x="${bw - 22}" y="30" width="18" height="${bh - 60}" rx="3" fill="#2f4f3a"/><text x="${bw - 13}" y="${bh/2}" text-anchor="middle" font-size="9" font-weight="700" fill="#e8f0e8" font-family="sans-serif" letter-spacing="2" transform="rotate(90, ${bw - 13}, ${bh/2})">BOARD</text>`;

    // Relationship lines for print
    let relSvg = "";
    if (showRels) {
      relLines.forEach(l => {
        const x1 = l.x - minX + 30, y1 = l.y - minY + 30;
        const x2 = l.x2 - minX + 30, y2 = l.y2 - minY + 30;
        const color = l.t === "f" ? "#2e86c1" : "#cb3b3b";
        const dash = l.t === "c" ? 'stroke-dasharray="5,3"' : "";
        relSvg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.5" opacity="0.5" ${dash}/>`;
      });
    }

    // Roster table
    const rosterRows = [...students].sort(byLastName).map(st => {
      const seatLoc = Object.entries(assignments).find(([, sid]) => sid === st.id);
      let location = "Unassigned";
      if (st.separateSetting && testDay) location = "Separate Setting";
      else if (seatLoc) {
        const [did] = seatLoc[0].split(":");
        const desk = desks.find(d => d.id === did);
        const tmpl = DESK_TEMPLATES.find(t => t.tid === desk?.tid);
        location = tmpl ? tmpl.label : "Assigned";
      }
      const tags = [st.iep ? "IEP" : "", st.preferFront ? "↑ FRONT" : "", st.separateSetting ? "SEP" : ""].filter(Boolean).join(", ");
      return `<tr>
        <td style="padding:4px 8px;border-bottom:1px solid #ddd;font-size:11px">${st.name}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #ddd;font-size:11px">${tags || "—"}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #ddd;font-size:11px;color:#666">${st.iepNotes || "—"}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #ddd;font-size:11px">${location}</td>
      </tr>`;
    }).join("\n");

    // Separate setting list
    const sepList = separateStudents.length > 0
      ? `<div style="margin-top:20px;page-break-inside:avoid">
          <h3 style="font-size:14px;margin:0 0 6px;color:#8b5fbf">📋 Separate Setting — Send to Other Room</h3>
          <table style="border-collapse:collapse;width:100%">
            <thead><tr style="background:#f5f0ff"><th style="padding:4px 8px;text-align:left;font-size:10px;border-bottom:2px solid #8b5fbf">Student</th><th style="padding:4px 8px;text-align:left;font-size:10px;border-bottom:2px solid #8b5fbf">Accommodations</th></tr></thead>
            <tbody>${separateStudents.map(st => `<tr><td style="padding:4px 8px;border-bottom:1px solid #ddd;font-size:11px">${st.name}</td><td style="padding:4px 8px;border-bottom:1px solid #ddd;font-size:11px;color:#666">${st.iepNotes || "—"}</td></tr>`).join("")}</tbody>
          </table>
        </div>`
      : "";

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${activeClass.period} ${activeClass.name} — Seating Chart</title>
    <style>
      * { box-sizing: border-box; }
      @media print {
        body { margin: 0; }
        .no-print { display: none !important; }
        @page { size: landscape; margin: 0.5in; }
      }
      body { font-family: -apple-system, 'Segoe UI', sans-serif; color: #222; padding: 20px; max-width: 1100px; margin: 0 auto; }
    </style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #2f4f3a;padding-bottom:8px;margin-bottom:16px">
        <div>
          <h1 style="margin:0;font-size:20px;color:#2f4f3a">⊞ ${activeClass.name}</h1>
          <div style="font-size:12px;color:#888;margin-top:2px">${activeClass.period} · ${activeRoom.name}${testDay ? " · TEST DAY" : ""} · ${students.length} students</div>
        </div>
        <button class="no-print" onclick="window.print()" style="padding:8px 20px;background:#2f4f3a;color:#fff;border:none;border-radius:5px;font-size:13px;font-weight:600;cursor:pointer">🖨 Print</button>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:10px;font-size:10px;color:#666">
        <span>● <span style="color:#4a7c59">■</span> Assigned</span>
        <span>● <span style="color:#c27a2a">■</span> IEP ★</span>
        <span>● ↑ Front seating</span>
        <span>● <span style="color:#8b5fbf">■</span> Separate Setting</span>
        <span>● <span style="color:#ccc">■</span> Disabled</span>
        ${showRels ? `<span>● <span style="color:#2e86c1">—</span> Friends</span><span>● <span style="color:#cb3b3b">- -</span> Conflict</span>` : ""}
      </div>

      <svg viewBox="0 0 ${vw} ${vh}" style="width:100%;max-height:55vh;border:1px solid #ddd;border-radius:6px;background:#fafaf7;margin-bottom:16px">
        ${boardSvg}
        ${relSvg}
        ${desksSvg}
        ${seatsSvg}
      </svg>

      <h3 style="font-size:14px;margin:16px 0 6px;color:#2f4f3a">Class Roster</h3>
      <table style="border-collapse:collapse;width:100%">
        <thead><tr style="background:#eee"><th style="padding:4px 8px;text-align:left;font-size:10px;border-bottom:2px solid #999">Name</th><th style="padding:4px 8px;text-align:left;font-size:10px;border-bottom:2px solid #999">Tags</th><th style="padding:4px 8px;text-align:left;font-size:10px;border-bottom:2px solid #999">Accommodations</th><th style="padding:4px 8px;text-align:left;font-size:10px;border-bottom:2px solid #999">Location</th></tr></thead>
        <tbody>${rosterRows}</tbody>
      </table>
      ${sepList}
    </body></html>`;

    setPrintHtml(html);
  };

  /* ──── Class / Room management ──── */
  const switchClass = (cid) => persist({ ...data, activeClassId: cid });
  const addClass = () => {
    if (!newClass.name.trim()) return;
    const rid = newClass.roomId || data.rooms[0]?.id;
    const period = newClass.period === "Custom" ? (customPeriod.trim() || "Custom") : newClass.period;
    let studs = [];
    if (copyFromClassId) {
      const source = data.classes.find(c => c.id === copyFromClassId);
      if (source) studs = source.students.map(s => ({ ...s, id: uid(), friendIds: [], conflictIds: [] }));
    }
    const id = uid();
    persist({
      ...data,
      classes: [...data.classes, { id, name: newClass.name, period, roomId: rid, students: studs, seatAssignments: {} }],
      activeClassId: id,
    });
    setNewClass({ name: "", period: "1st", roomId: "" });
    setCustomPeriod("");
    setCopyFromClassId("");
    setShowAddClass(false);
  };
  const deleteClass = (cid) => {
    if (data.classes.length <= 1) return;
    const remaining = data.classes.filter(c => c.id !== cid);
    persist({ ...data, classes: remaining, activeClassId: remaining[0].id });
    setEditClassId(null);
  };
  const addRoom = () => {
    if (!newRoomName.trim()) return;
    const id = uid();
    persist({ ...data, rooms: [...data.rooms, { id, name: newRoomName, boardPosition: "top", zoom: 1, desks: [] }] });
    setNewRoomName("");
  };
  const deleteRoom = (rid) => {
    if (data.rooms.length <= 1) return;
    const remaining = data.rooms.filter(r => r.id !== rid);
    const newClasses = data.classes.map(c => c.roomId === rid ? { ...c, roomId: remaining[0].id } : c);
    persist({ ...data, rooms: remaining, classes: newClasses });
  };
  const duplicateRoom = (rid) => {
    const source = data.rooms.find(r => r.id === rid);
    if (!source) return;
    const newId = uid();
    const newDesks = source.desks.map(d => ({ ...d, id: uid(), seats: d.seats.map(s => ({ ...s })) }));
    persist({ ...data, rooms: [...data.rooms, { ...source, id: newId, name: source.name + " (Copy)", desks: newDesks }] });
  };

  /* ──── Room Template Bank ──── */
  const templates = data.templates || [];

  const saveAsTemplate = (rid) => {
    const room = data.rooms.find(r => r.id === rid);
    if (!room) return;
    const tmpl = {
      id: uid(),
      name: room.name,
      boardPosition: room.boardPosition,
      zoom: room.zoom || 1,
      desks: room.desks.map(d => ({ ...d, id: uid(), seats: d.seats.map(s => ({ ...s })), disabledSeats: d.disabledSeats ? [...d.disabledSeats] : [] })),
      savedAt: new Date().toISOString(),
    };
    persist({ ...data, templates: [...templates, tmpl] });
  };

  const loadTemplate = (tmplId) => {
    const tmpl = templates.find(t => t.id === tmplId);
    if (!tmpl) return;
    const newRoomId = uid();
    const newDesks = tmpl.desks.map(d => ({ ...d, id: uid(), seats: d.seats.map(s => ({ ...s })), disabledSeats: d.disabledSeats ? [...d.disabledSeats] : [] }));
    const newRoom = { id: newRoomId, name: tmpl.name, boardPosition: tmpl.boardPosition, zoom: tmpl.zoom || 1, desks: newDesks };
    const newPeriod = { id: uid(), name: "Period 1", period: "1st", roomId: newRoomId, students: [], seatAssignments: {} };
    persist({ ...data, rooms: [...data.rooms, newRoom], classes: [...data.classes, newPeriod], activeClassId: newPeriod.id, templates: data.templates || templates });
  };

  const deleteTemplate = (tmplId) => {
    persist({ ...data, templates: templates.filter(t => t.id !== tmplId) });
  };

  const renameTemplate = (tmplId, name) => {
    persist({ ...data, templates: templates.map(t => t.id === tmplId ? { ...t, name } : t) });
  };

  /* ──── Desk selection helpers ──── */
  const selectDesk = (deskId, additive) => {
    if (additive) {
      setSelectedDeskIds(prev => {
        const next = new Set(prev);
        if (next.has(deskId)) next.delete(deskId); else next.add(deskId);
        return next;
      });
    } else {
      setSelectedDeskIds(new Set([deskId]));
    }
  };
  const selectAllDesks = () => setSelectedDeskIds(new Set(desks.map(d => d.id)));
  const deselectAll = () => setSelectedDeskIds(new Set());

  /* ──── Batch desk operations ──── */
  const rotateSelected = () => {
    updateActiveRoom(r => ({ ...r, desks: r.desks.map(d => selectedDeskIds.has(d.id) ? { ...d, rotation: (d.rotation + 90) % 360 } : d) }));
  };
  const zoomRoom = (delta) => {
    if (!activeRoom) return;
    const curZoom = activeRoom.zoom || 1;
    const newZoom = Math.round((curZoom + delta) * 100) / 100;

    // Don't zoom smaller than 0.4 or larger than 2
    if (newZoom < 0.4 || newZoom > 2) return;

    // For zoom-in: check that no desk would be clipped at the new zoom
    if (delta > 0 && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const canvasW = rect.width, canvasH = rect.height;
      const wouldClip = desks.some(d => {
        const right = (d.x + d.w) * newZoom;
        const bottom = (d.y + d.h) * newZoom;
        return right > canvasW || bottom > canvasH;
      });
      if (wouldClip) return; // don't zoom in further
    }

    updateActiveRoom(r => ({ ...r, zoom: newZoom }));
  };

  const roomZoom = activeRoom?.zoom || 1;
  const deleteSelected = () => {
    const ids = selectedDeskIds;
    const newClasses = data.classes.map(c => {
      if (c.roomId !== activeRoom.id) return c;
      const sa = { ...c.seatAssignments };
      Object.keys(sa).forEach(k => { for (const did of ids) { if (k.startsWith(did + ":")) delete sa[k]; } });
      return { ...c, seatAssignments: sa };
    });
    persist({
      ...data,
      rooms: data.rooms.map(r => r.id === activeRoom.id ? { ...r, desks: r.desks.filter(d => !ids.has(d.id)) } : r),
      classes: newClasses,
    });
    setSelectedDeskIds(new Set());
  };

  /* ──── Desk drag ──── */
  const onDeskDown = (e, deskId) => {
    if (relMode) return;
    if (lockLayout) return; // locked — no dragging or selecting
    e.stopPropagation();

    // Shift+click: toggle this desk in/out of selection, no drag
    if (e.shiftKey) {
      selectDesk(deskId, true);
      return;
    }

    // Regular click on an unselected desk: select just this one
    let currentSelection = selectedDeskIds;
    if (!selectedDeskIds.has(deskId)) {
      const newSel = new Set([deskId]);
      setSelectedDeskIds(newSel);
      currentSelection = newSel;
    }

    // Start drag for all currently selected desks
    const rect = canvasRef.current.getBoundingClientRect();
    const dragIds = currentSelection.has(deskId) ? currentSelection : new Set([deskId]);
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    const origins = {};
    desks.forEach(d => { if (dragIds.has(d.id)) origins[d.id] = { x: d.x, y: d.y }; });
    setDragState({ deskId, startX, startY, origins, dragIds });
  };
  const onCanvasMove = (e) => {
    // Seat drag — track mouse position
    if (seatDrag) {
      const rect = canvasRef.current.getBoundingClientRect();
      setSeatDrag(prev => ({ ...prev, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top }));
      return;
    }
    // Desk drag
    if (!dragState) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const z = activeRoom?.zoom || 1;
    const dx = (e.clientX - rect.left - dragState.startX) / z;
    const dy = (e.clientY - rect.top - dragState.startY) / z;
    updateActiveRoom(r => ({
      ...r,
      desks: r.desks.map(d => {
        if (!dragState.dragIds.has(d.id)) return d;
        const orig = dragState.origins[d.id];
        return { ...d, x: Math.max(0, orig.x + dx), y: Math.max(0, orig.y + dy) };
      })
    }));
  };
  const onCanvasUp = () => {
    setDragState(null);
    if (seatDrag) setSeatDrag(null); // cancel drag if released on empty space
  };

  /* ──── Relationship lines ──── */
  const getSeatPos = (desk, idx) => {
    const s = desk.seats[idx];
    const sx = s.rx * desk.w, sy = s.ry * desk.h;
    const rad = (desk.rotation * Math.PI) / 180;
    const cx = desk.w / 2, cy = desk.h / 2;
    const dx = sx - cx, dy = sy - cy;
    return { x: desk.x + cx + dx * Math.cos(rad) - dy * Math.sin(rad), y: desk.y + cy + dx * Math.sin(rad) + dy * Math.cos(rad) };
  };
  const relLines = [];
  if (showRels) {
    const posMap = {};
    Object.entries(assignments).forEach(([k, sid]) => {
      const [did, si] = k.split(":");
      const desk = desks.find(d => d.id === did);
      if (desk) posMap[sid] = getSeatPos(desk, parseInt(si));
    });
    students.forEach(s => {
      s.friendIds.forEach(fid => { if (fid > s.id && posMap[s.id] && posMap[fid]) relLines.push({ ...posMap[s.id], x2: posMap[fid].x, y2: posMap[fid].y, t: "f" }); });
      s.conflictIds.forEach(cid => { if (cid > s.id && posMap[s.id] && posMap[cid]) relLines.push({ ...posMap[s.id], x2: posMap[cid].x, y2: posMap[cid].y, t: "c" }); });
    });
  }

  /* ──── Board style ──── */
  const bp = activeRoom?.boardPosition || "top";
  const boardSt = {
    position: "absolute", background: C.board, color: C.boardTxt, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "11px", fontWeight: 700, letterSpacing: "2.5px", textTransform: "uppercase", zIndex: 5, borderRadius: "3px", fontFamily: sansFont,
    ...(bp === "top" ? { top: 60, left: "12%", right: "12%", height: 28 } :
      bp === "bottom" ? { bottom: 0, left: "12%", right: "12%", height: 28 } :
      bp === "left" ? { left: 0, top: "12%", bottom: "12%", width: 28, writingMode: "vertical-rl" } :
      { right: 0, top: "12%", bottom: "12%", width: 28, writingMode: "vertical-rl" }),
  };

  /* ──── Mini desk preview ──── */
  const MiniDesk = ({ tpl }) => (
    <svg width={tpl.w * 0.42 + 10} height={tpl.h * 0.42 + 10} viewBox={`-12 -12 ${tpl.w + 24} ${tpl.h + 24}`} overflow="visible">
      <rect x={2} y={2} width={tpl.w - 4} height={tpl.h - 4} rx={5} fill={C.desk} stroke={C.deskBorder} strokeWidth={2} />
      {tpl.seats.map((s, i) => <circle key={i} cx={s.rx * tpl.w} cy={s.ry * tpl.h} r={11} fill={C.seatEmpty} stroke={C.seatBorder} strokeWidth={1.5} />)}
    </svg>
  );

  /* ──── Shared styles ──── */
  const s = {
    btn: (active, col) => ({
      padding: "6px 14px", borderRadius: "5px", border: `1px solid ${active ? col || C.accent : C.border}`,
      background: active ? (col || C.accent) + "18" : C.panel, color: active ? col || C.accent : C.text,
      fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: sansFont, whiteSpace: "nowrap", transition: "all .12s",
    }),
    pill: (active) => ({
      padding: "6px 16px", borderRadius: "20px", border: "none", cursor: "pointer", fontFamily: sansFont,
      fontSize: "12px", fontWeight: 600, transition: "all .15s",
      background: active ? C.accent : "transparent", color: active ? "#fff" : C.muted,
    }),
    input: {
      width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: "5px",
      fontSize: "13px", fontFamily: sansFont, background: C.bg, outline: "none", boxSizing: "border-box",
    },
    label: { fontSize: "11px", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "4px", display: "block", fontFamily: sansFont },
    badge: (col) => ({ display: "inline-block", padding: "1px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 700, background: col + "20", color: col, fontFamily: sansFont }),
    modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
    modalBox: { background: C.panel, borderRadius: "10px", padding: "24px", width: 420, maxWidth: "92vw", maxHeight: "82vh", overflowY: "auto", fontFamily: sansFont },
    sectionLabel: { fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.2px", color: C.muted, marginBottom: "8px", fontFamily: sansFont },
    check: { width: 15, height: 15, accentColor: C.accent },
  };

  const Btn = ({ children, primary, danger, small, style: sx, ...rest }) => (
    <button style={{
      padding: small ? "4px 10px" : "7px 16px", borderRadius: "5px", fontSize: small ? "11px" : "13px", fontWeight: 600,
      fontFamily: sansFont, cursor: "pointer", border: "none", transition: "all .12s",
      ...(primary ? { background: C.accent, color: "#fff" } : danger ? { background: C.dangerBg, color: C.danger, border: `1px solid ${C.danger}33` } : { background: C.bg, color: C.text, border: `1px solid ${C.border}` }),
      ...sx,
    }} {...rest}>{children}</button>
  );

  /* ════════════════════════════════════════════ RENDER ════════════════════════════════════════════ */
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: sansFont, background: C.bg, color: C.text, overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Source+Serif+4:wght@600;700&display=swap" rel="stylesheet" />

      {/* ─── TOP NAV ─── */}
      <div style={{ display: "flex", alignItems: "center", background: C.panel, borderBottom: `1px solid ${C.border}`, padding: "0 16px", height: 52, flexShrink: 0, gap: 12 }}>
        <div style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: C.accent, marginRight: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 22 }}>⊞</span> Seating Charts
        </div>
        <div style={{ width: 1, height: 28, background: C.border }} />

        {/* Class tabs */}
        <div style={{ display: "flex", gap: 4, flex: 1, overflow: "auto", padding: "4px 0" }}>
          {data.classes.map(c => {
            const isActive = c.id === activeClass?.id;
            return (
              <button key={c.id} onClick={() => switchClass(c.id)} onDoubleClick={() => setEditClassId(c.id)}
                style={{
                  padding: "6px 16px", borderRadius: 6, border: isActive ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
                  background: isActive ? C.accentBg : "transparent", color: isActive ? C.accent : C.muted,
                  fontSize: 12, fontWeight: isActive ? 700 : 500, cursor: "pointer", fontFamily: sansFont, whiteSpace: "nowrap", transition: "all .12s",
                }}>
                <span style={{ opacity: 0.6, marginRight: 4 }}>{c.period}</span> {c.name}
              </button>
            );
          })}
          <button onClick={() => { setNewClass({ name: "", period: "1st", roomId: activeRoom?.id || "" }); setCopyFromClassId(""); setShowAddClass(true); }}
            style={{ ...s.btn(false), padding: "4px 12px", fontSize: 16, lineHeight: 1, borderStyle: "dashed" }}>+</button>
        </div>

        <div style={{ width: 1, height: 28, background: C.border }} />
        <button onClick={() => setShowManageRooms(true)} style={s.btn(false)} title="Manage room layouts">🏫 Rooms</button>
        <button onClick={() => setShowTemplateBank(true)} style={s.btn(false)} title="Saved layout templates">📦 Templates{templates.length > 0 ? ` (${templates.length})` : ""}</button>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ─── SIDEBAR ─── */}
        <div style={{ width: 250, minWidth: 250, background: C.panel, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Sidebar tabs */}
          <div style={{ display: "flex", padding: "6px 8px", gap: 4, borderBottom: `1px solid ${C.borderLight}` }}>
            {[["desks", "🪑 Desks"], ["students", "👤 Students"], ["settings", "⚙ Settings"]].map(([k, lbl]) => (
              <button key={k} style={s.pill(sidebar === k)} onClick={() => setSidebar(k)}>{lbl}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
            {/* DESKS */}
            {sidebar === "desks" && (
              <>
                <div style={s.sectionLabel}>Add desk shapes</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
                  {DESK_TEMPLATES.map(t => (
                    <button key={t.tid} onClick={() => addDesk(t)}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "10px 6px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", transition: "all .12s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.accentBg; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bg; }}>
                      <MiniDesk tpl={t} />
                      <div style={{ fontSize: 11, fontWeight: 600 }}>{t.label}</div>
                    </button>
                  ))}
                </div>
                <div style={s.sectionLabel}>Quick Actions</div>
                <Btn primary style={{ width: "100%", marginBottom: 6 }} onClick={smartAutoAssign}>✨ Smart Auto-Assign</Btn>
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  <Btn style={{ flex: 1 }} onClick={clearAssignments}>Clear Assignments</Btn>
                  <Btn style={{ flex: 0 }} onClick={undo} disabled={undoStack.length === 0} title={undoStack.length > 0 ? `Undo (${undoStack.length})` : "Nothing to undo"}>↩ Undo</Btn>
                </div>
                <Btn style={{ width: "100%", marginBottom: 6 }} onClick={printChart}>🖨️ Print / Export</Btn>
                <div style={s.sectionLabel}>Selection</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  <Btn style={{ flex: 1 }} onClick={selectAllDesks}>Select All ({desks.length})</Btn>
                  <Btn style={{ flex: 1 }} onClick={deselectAll}>Deselect</Btn>
                </div>
                {selectedDeskIds.size > 0 && (
                  <div style={{ padding: 10, background: C.accentBg, borderRadius: 6, fontSize: 11, color: C.accent, lineHeight: 1.5, marginBottom: 6 }}>
                    <strong>{selectedDeskIds.size} desk{selectedDeskIds.size > 1 ? "s" : ""} selected.</strong> Use the toolbar above to rotate or delete. Shift+click to add/remove individual desks. Drag any selected desk to move them all together.
                  </div>
                )}
                <div style={{ padding: 10, background: C.accentBg, borderRadius: 6, fontSize: 11, color: C.accent, lineHeight: 1.5 }}>
                  <strong>Smart Assign:</strong> Places students with "preferential front seating" closest to the board, separates friends who'll talk, and keeps conflicts far apart. IEP status alone doesn't force front seating — only the explicit checkbox does.</div>
                <div style={{ padding: 10, background: C.bg, borderRadius: 6, fontSize: 11, color: C.muted, lineHeight: 1.5, marginTop: 6 }}>
                  <strong>Tips:</strong> Use the zoom controls (−/+) in the top-left of the canvas to resize the whole room. Click a desk to select, shift+click to multi-select. Room layouts are shared across classes that use this room.
                </div>
              </>
            )}

            {/* STUDENTS */}
            {sidebar === "students" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={s.sectionLabel}>Roster — {students.length} students</div>
                  <Btn primary small onClick={() => setShowAddStudent(true)}>+ Add</Btn>
                </div>
                {unassigned.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#b8860b", marginBottom: 4 }}>Unassigned ({unassigned.length})</div>
                    {unassigned.map(st => (
                      <StudentCard key={st.id} st={st} placing={placingStudentId === st.id}
                        relActive={relMode && relFirst === st.id}
                        onPlace={() => {
                          if (relMode) { if (!relFirst) setRelFirst(st.id); else linkStudents(relFirst, st.id); }
                          else setEditStudentId(st.id);
                        }} />
                    ))}
                  </>
                )}
                {assigned.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.seatFilled, margin: "12px 0 4px" }}>Seated ({assigned.length})</div>
                    {assigned.map(st => (
                      <StudentCard key={st.id} st={st} placing={placingStudentId === st.id}
                        relActive={relMode && relFirst === st.id}
                        onPlace={() => {
                          if (relMode) { if (!relFirst) setRelFirst(st.id); else linkStudents(relFirst, st.id); }
                          else setEditStudentId(st.id);
                        }} />
                    ))}
                  </>
                )}
                {/* Relationship controls */}
                <div style={{ marginTop: 16, padding: 10, background: C.bg, borderRadius: 6, border: `1px solid ${C.borderLight}` }}>
                  <div style={{ ...s.sectionLabel, marginBottom: 6 }}>Mark Relationships</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={s.btn(relMode === "friend", C.friend)} onClick={() => { setRelMode(relMode === "friend" ? null : "friend"); setRelFirst(null); }}>👫 Friends</button>
                    <button style={s.btn(relMode === "conflict", C.conflict)} onClick={() => { setRelMode(relMode === "conflict" ? null : "conflict"); setRelFirst(null); }}>⚡ Conflict</button>
                  </div>
                  {relMode && <div style={{ marginTop: 6, fontSize: 11, color: relMode === "friend" ? C.friend : C.conflict, fontWeight: 600 }}>
                    {relFirst ? "Click a second student to link." : "Click a student to start."}
                  </div>}
                </div>
              </>
            )}

            {/* SETTINGS */}
            {sidebar === "settings" && (
              <>
                <div style={s.sectionLabel}>Board / Front Wall — "{activeRoom?.name}"</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 18 }}>
                  {["top", "bottom", "left", "right"].map(p => (
                    <button key={p} style={{ ...s.btn(bp === p), textTransform: "capitalize" }}
                      onClick={() => updateActiveRoom(r => ({ ...r, boardPosition: p }))}>
                      {p === "top" ? "↑" : p === "bottom" ? "↓" : p === "left" ? "←" : "→"} {p}
                    </button>
                  ))}
                </div>
                <div style={s.sectionLabel}>Display</div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", marginBottom: 8 }}>
                  <input type="checkbox" checked={showRels} onChange={e => setShowRels(e.target.checked)} style={s.check} /> Show relationship lines
                </label>
                <div style={{ ...s.sectionLabel, marginTop: 16 }}>Legend</div>
                {[
                  [C.seatFilled, "circle", "Assigned seat"],
                  [C.seatIEP, "circle", "IEP / 504 student"],
                  [C.accent, "circle", "Preferential front seating"],
                  [C.seatSep, "circle", "Separate setting (test day)"],
                  ["#e0dcd4", "disabled", "Disabled seat"],
                  [C.friend, "line", "Friends — may talk"],
                  [C.conflict, "dash", "Conflict — keep apart"],
                ].map(([col, shape, lbl], i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 5 }}>
                    {shape === "circle" ? <div style={{ width: 14, height: 14, borderRadius: "50%", background: col, flexShrink: 0 }} /> :
                      shape === "disabled" ? <div style={{ width: 14, height: 14, borderRadius: "50%", background: col, flexShrink: 0, position: "relative", border: "1px solid #ccc" }}><div style={{ position: "absolute", top: 2, left: 2, width: 8, height: 8, borderTop: "1.5px solid #aaa", transform: "rotate(45deg)", transformOrigin: "0 0" }} /></div> :
                      <div style={{ width: 20, height: 0, borderTop: `2.5px ${shape === "dash" ? "dashed" : "solid"} ${col}`, flexShrink: 0 }} />}
                    {lbl}
                  </div>
                ))}
                <div style={{ marginTop: 20 }}>
                  <div style={s.sectionLabel}>This Class</div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
                    <strong>{activeClass?.period}</strong> — {activeClass?.name} → Room: <strong>{activeRoom?.name}</strong>
                  </div>
                  <Btn small onClick={() => setEditClassId(activeClass.id)} style={{ marginTop: 4 }}>Edit Class Details</Btn>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ─── CANVAS ─── */}
        <div ref={canvasRef} style={{ flex: 1, position: "relative", overflow: "hidden", background: C.canvas, cursor: seatDrag ? "grabbing" : dragState ? "grabbing" : placingStudentId ? "crosshair" : "default" }}
          onMouseMove={onCanvasMove}
          onMouseUp={onCanvasUp}
          onClick={() => { deselectAll(); if (placingStudentId && !dragState) { setPlacingStudentId(null); setPickedUpFromKey(null); } }}>

          {/* Unified canvas top bar */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", padding: "8px 12px", gap: 6, zIndex: 55, pointerEvents: "none" }}>
            {/* Left: room + zoom */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, pointerEvents: "auto" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, background: C.panel, padding: "4px 10px", borderRadius: 4, border: `1px solid ${C.borderLight}` }}>
                🏫 {activeRoom?.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 3, background: C.panel, padding: "3px 6px", borderRadius: 4, border: `1px solid ${C.borderLight}` }}
                onClick={e => e.stopPropagation()}>
                <button onClick={() => zoomRoom(-0.1)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, color: C.muted, padding: "0 4px", fontFamily: sansFont }}>−</button>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.text, minWidth: 36, textAlign: "center", fontFamily: sansFont }}>{Math.round(roomZoom * 100)}%</span>
                <button onClick={() => zoomRoom(0.1)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, color: C.muted, padding: "0 4px", fontFamily: sansFont }}>+</button>
              </div>
            </div>

            {/* Center: mode banners */}
            <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: 6, pointerEvents: "auto" }}>
              {testDay && <div style={{ background: C.seatSep, color: "#fff", padding: "5px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>TEST DAY</div>}
              {disableSeatMode && <div style={{ background: C.danger, color: "#fff", padding: "5px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>Click seats to disable/enable</div>}
            </div>

            {/* Right: action buttons */}
            <div style={{ display: "flex", gap: 6, pointerEvents: "auto" }}>
              {undoStack.length > 0 && <button style={{ ...s.btn(false), fontWeight: 700 }} onClick={undo} title="Undo last seating change">↩ Undo</button>}
              <button style={s.btn(lockLayout, C.accent)} onClick={() => { setLockLayout(!lockLayout); if (!lockLayout) deselectAll(); }}>{lockLayout ? "🔒 Locked" : "🔓 Lock Layout"}</button>
              <button style={s.btn(disableSeatMode, C.danger)} onClick={() => { if (!disableSeatMode) deselectAll(); setDisableSeatMode(!disableSeatMode); }}>{disableSeatMode ? "✓ Done" : "🚫 Disable Seats"}</button>
              <button style={s.btn(false)} onClick={printChart}>🖨️ Print</button>
              <button style={s.btn(testDay, C.seatSep)} onClick={() => setTestDay(!testDay)}>📝 Test Day</button>
              <button style={s.btn(showRels, C.friend)} onClick={() => setShowRels(!showRels)}>🔗 Lines</button>
            </div>
          </div>

          {/* ══ ZOOM WRAPPER — all room content scales together ══ */}
          <div style={{ transform: `scale(${roomZoom})`, transformOrigin: "0 0", width: `${100 / roomZoom}%`, height: `${100 / roomZoom}%`, position: "relative" }}>

            {/* Board */}
            <div style={boardSt}>Board</div>

            {/* Relationship lines */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 15 }}>
              {relLines.map((l, i) => <line key={i} x1={l.x} y1={l.y} x2={l.x2} y2={l.y2} stroke={l.t === "f" ? C.friend : C.conflict} strokeWidth={2.5} strokeDasharray={l.t === "c" ? "6,4" : "none"} opacity={0.65} />)}
            </svg>

            {/* Desks */}
            {desks.map(desk => {
              const sel = !lockLayout && selectedDeskIds.has(desk.id);
              return (
                <div key={desk.id} style={{ position: "absolute", left: desk.x, top: desk.y, width: desk.w, height: desk.h, zIndex: sel ? 18 : 10, overflow: "visible" }}>
                  <div
                    style={{
                      width: desk.w, height: desk.h, overflow: "visible",
                      transform: `rotate(${desk.rotation}deg)`,
                      transformOrigin: `${desk.w / 2}px ${desk.h / 2}px`,
                      cursor: lockLayout ? "default" : dragState?.dragIds?.has(desk.id) ? "grabbing" : "grab",
                      filter: sel ? "drop-shadow(0 2px 8px rgba(0,0,0,.18))" : "none",
                      outline: sel ? `2px solid ${C.deskSelected}` : "none",
                      outlineOffset: 2, borderRadius: 7,
                    }}
                    onMouseDown={e => onDeskDown(e, desk.id)}
                    onClick={e => e.stopPropagation()}
                  >
                    <svg width={desk.w} height={desk.h} viewBox={`0 0 ${desk.w} ${desk.h}`} overflow="visible">
                      <rect x={2} y={2} width={desk.w - 4} height={desk.h - 4} rx={5} fill={C.desk} stroke={sel ? C.deskSelected : C.deskBorder} strokeWidth={sel ? 2.5 : 1.8} />
                      {desk.seats.map((seat, idx) => {
                        const disabled = desk.disabledSeats?.includes(idx);
                        const st = !disabled ? getSeatStudent(desk.id, idx) : null;
                        const hidden = testDay && st?.separateSetting;
                        const thisKey = seatKey(desk.id, idx);
                        const isDragOrigin = seatDrag?.originKey === thisKey;
                        const isPickedUp = pickedUpFromKey === thisKey;
                        let fill = C.seatEmpty;
                        if (isDragOrigin) fill = "#fff3cd";
                        else if (isPickedUp) fill = "#fff3cd";
                        else if (disabled) fill = "#e0dcd4";
                        else if (st) fill = hidden ? C.seatSep + "44" : st.iep ? C.seatIEP : C.seatFilled;
                        const isRelTarget = relFirst && st?.id === relFirst;
                        const cx = seat.rx * desk.w, cy = seat.ry * desk.h;
                        const seatCursor = disableSeatMode ? "pointer" : disabled ? "not-allowed" : seatDrag ? "copy" : placingStudentId ? "copy" : st ? "grab" : "pointer";
                        return (
                          <g key={idx} style={{ cursor: seatCursor }}
                            onClick={e => { e.stopPropagation(); handleSeatClick(desk.id, idx); }}
                            onMouseDown={e => handleSeatMouseDown(e, desk.id, idx)}
                            onMouseUp={() => handleSeatMouseUp(desk.id, idx)}>
                            <circle cx={cx} cy={cy} r={15} fill={fill}
                              stroke={isDragOrigin || isPickedUp ? "#e6a817" : disableSeatMode && disabled ? C.danger : isRelTarget ? "#f1c40f" : st ? "#fff" : disabled ? "#ccc" : C.seatBorder}
                              strokeWidth={isDragOrigin || isPickedUp ? 3 : disableSeatMode && disabled ? 2.5 : isRelTarget ? 3 : 1.5}
                              strokeDasharray={isDragOrigin || isPickedUp ? "5,3" : "none"} />
                            {disabled && <><line x1={cx - 8} y1={cy - 8} x2={cx + 8} y2={cy + 8} stroke="#aaa" strokeWidth={2} /><line x1={cx + 8} y1={cy - 8} x2={cx - 8} y2={cy + 8} stroke="#aaa" strokeWidth={2} /></>}
                            {st && !hidden && <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="700" fill="#fff" style={{ pointerEvents: "none", fontFamily: sansFont }}>{st.name.split(" ").map(n => n[0]).join("")}</text>}
                            {hidden && <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="12" fill={C.seatSep} style={{ pointerEvents: "none" }}>✕</text>}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>{/* end zoom wrapper */}

          {/* Floating toolbar — outside zoom, positioned in screen coords */}
          {!disableSeatMode && !lockLayout && selectedDeskIds.size > 0 && (() => {
            const selDesks = desks.filter(d => selectedDeskIds.has(d.id));
            if (selDesks.length === 0) return null;
            let topY = Infinity, centerX = 0;
            selDesks.forEach(d => {
              topY = Math.min(topY, d.y);
              centerX += d.x + d.w / 2;
            });
            centerX /= selDesks.length;
            // Convert to screen coords via zoom
            const screenX = centerX * roomZoom;
            const screenY = topY * roomZoom - 44;
            return (
              <div style={{
                position: "absolute", left: screenX, top: Math.max(48, screenY),
                transform: "translateX(-50%)", display: "flex", gap: 3, zIndex: 55,
                background: C.panel, padding: "4px 6px", borderRadius: 6,
                boxShadow: "0 2px 12px rgba(0,0,0,.15)", border: `1px solid ${C.border}`,
                alignItems: "center",
              }} onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                {selectedDeskIds.size > 1 && <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, marginRight: 4, fontFamily: sansFont }}>{selectedDeskIds.size} desks</span>}
                <Btn small onClick={rotateSelected} style={{ padding: "4px 8px" }}>↻ Rotate</Btn>
                <div style={{ width: 1, height: 18, background: C.border, margin: "0 2px" }} />
                <Btn small danger onClick={deleteSelected} style={{ padding: "4px 8px" }}>✕</Btn>
              </div>
            );
          })()}

          {/* Empty state */}
          {desks.length === 0 && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", color: C.subtle }}>
              <div style={{ fontSize: 44, marginBottom: 8, opacity: 0.25 }}>⊞</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Add desks to get started</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Use the sidebar to place desk shapes.</div>
            </div>
          )}

          {/* Placing indicator (sidebar place) */}
          {placingStudentId && !seatDrag && <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", background: C.accent, color: "#fff", padding: "7px 18px", borderRadius: 6, fontSize: 12, fontWeight: 600, zIndex: 55, boxShadow: "0 4px 12px rgba(0,0,0,.2)" }}>
            Click a seat to place {getStudent(placingStudentId)?.name} · <span style={{ opacity: 0.7, cursor: "pointer", textDecoration: "underline" }} onClick={e => { e.stopPropagation(); setPlacingStudentId(null); setPickedUpFromKey(null); }}>Cancel</span>
          </div>}

          {/* Drag indicator — follows cursor */}
          {seatDrag && (() => {
            const st = getStudent(seatDrag.studentId);
            if (!st) return null;
            const initials = st.name.split(" ").map(n => n[0]).join("");
            return (
              <div style={{ position: "absolute", left: seatDrag.mouseX + 12, top: seatDrag.mouseY - 16, pointerEvents: "none", zIndex: 100, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: st.iep ? C.seatIEP : C.seatFilled, color: "#fff", fontSize: 11, fontWeight: 700,
                  fontFamily: sansFont, boxShadow: "0 3px 12px rgba(0,0,0,.3)", border: "2px solid #fff",
                }}>{initials}</div>
                <div style={{ background: C.accent, color: "#fff", padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, fontFamily: sansFont, boxShadow: "0 2px 8px rgba(0,0,0,.2)", whiteSpace: "nowrap" }}>
                  {st.name}
                </div>
              </div>
            );
          })()}

          {/* Separate setting panel */}
          {testDay && separateStudents.length > 0 && (
            <div style={{ position: "absolute", bottom: 14, right: 14, background: C.panel, border: `2px solid ${C.seatSep}`, borderRadius: 10, padding: "12px 16px", zIndex: 55, maxWidth: 220, boxShadow: "0 4px 14px rgba(0,0,0,.1)" }}>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2, color: C.seatSep, marginBottom: 6 }}>📋 Separate Setting</div>
              {separateStudents.map(st => (
                <div key={st.id} style={{ fontSize: 12, fontWeight: 500, padding: "3px 0", borderBottom: `1px solid ${C.borderLight}` }}>
                  {st.name}
                  {st.iepNotes && <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{st.iepNotes}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── MODALS ─── */}

      {/* Add student */}
      {showAddStudent && (
        <div style={s.modal} onClick={() => setShowAddStudent(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 14px", fontFamily: font, fontSize: 20 }}>Add Student</h3>
            <div style={{ marginBottom: 10 }}>
              <label style={s.label}>Name *</label>
              <input style={s.input} value={newStudent.name} onChange={e => setNewStudent({ ...newStudent, name: e.target.value })} placeholder="Full name" autoFocus onKeyDown={e => e.key === "Enter" && addStudent()} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", marginBottom: 8 }}>
              <input type="checkbox" checked={newStudent.iep} onChange={e => setNewStudent({ ...newStudent, iep: e.target.checked })} style={s.check} />
              IEP / 504 plan
            </label>
            {newStudent.iep && (
              <div style={{ marginBottom: 10 }}>
                <label style={s.label}>Accommodation notes</label>
                <textarea style={{ ...s.input, minHeight: 50, resize: "vertical" }} value={newStudent.iepNotes} onChange={e => setNewStudent({ ...newStudent, iepNotes: e.target.value })} placeholder="e.g., Extended time, noise-canceling headphones" />
              </div>
            )}
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6, marginTop: 4 }}>Seating Accommodations</div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", marginBottom: 8 }}>
              <input type="checkbox" checked={newStudent.preferFront} onChange={e => setNewStudent({ ...newStudent, preferFront: e.target.checked })} style={s.check} />
              Preferential seating near front / board
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", marginBottom: 14 }}>
              <input type="checkbox" checked={newStudent.separateSetting} onChange={e => setNewStudent({ ...newStudent, separateSetting: e.target.checked })} style={s.check} />
              Separate setting on test days
            </label>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn onClick={() => setShowAddStudent(false)}>Cancel</Btn>
              <Btn primary onClick={addStudent}>Add Student</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Edit student */}
      {editStudentId && (() => {
        const st = getStudent(editStudentId);
        if (!st) return null;
        return (
          <div style={s.modal} onClick={() => setEditStudentId(null)}>
            <div style={s.modalBox} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontFamily: font, fontSize: 20 }}>Edit Student</h3>
                <Btn danger small onClick={() => deleteStudent(st.id)}>Delete</Btn>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={s.label}>Name</label>
                <input style={s.input} value={st.name} onChange={e => updateStudent(st.id, { name: e.target.value })} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", marginBottom: 8 }}>
                <input type="checkbox" checked={st.iep} onChange={e => updateStudent(st.id, { iep: e.target.checked })} style={s.check} />
                IEP / 504 plan
              </label>
              {st.iep && (
                <div style={{ marginBottom: 10 }}>
                  <label style={s.label}>Accommodation notes</label>
                  <textarea style={{ ...s.input, minHeight: 50, resize: "vertical" }} value={st.iepNotes} onChange={e => updateStudent(st.id, { iepNotes: e.target.value })} />
                </div>
              )}
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6, marginTop: 4 }}>Seating Accommodations</div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", marginBottom: 8 }}>
                <input type="checkbox" checked={st.preferFront} onChange={e => updateStudent(st.id, { preferFront: e.target.checked })} style={s.check} />
                Preferential seating near front / board
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", marginBottom: 14 }}>
                <input type="checkbox" checked={st.separateSetting} onChange={e => updateStudent(st.id, { separateSetting: e.target.checked })} style={s.check} />
                Separate setting on test days
              </label>
              <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 10 }}>
                <div style={{ ...s.sectionLabel, marginBottom: 6 }}>Relationships</div>
                {st.friendIds.length > 0 && <div style={{ marginBottom: 6 }}>
                  <span style={s.badge(C.friend)}>👫 Friends</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                    {st.friendIds.map(fid => { const f = getStudent(fid); return f ? <span key={fid} style={{ fontSize: 12, background: C.bg, padding: "2px 8px", borderRadius: 3, display: "inline-flex", alignItems: "center", gap: 4 }}>{f.name} <span style={{ cursor: "pointer", color: C.danger, fontWeight: 700 }} onClick={() => { updateStudent(st.id, { friendIds: st.friendIds.filter(x => x !== fid) }); updateStudent(fid, { friendIds: f.friendIds.filter(x => x !== st.id) }); }}>×</span></span> : null; })}
                  </div>
                </div>}
                {st.conflictIds.length > 0 && <div style={{ marginBottom: 6 }}>
                  <span style={s.badge(C.conflict)}>⚡ Conflicts</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                    {st.conflictIds.map(cid => { const c = getStudent(cid); return c ? <span key={cid} style={{ fontSize: 12, background: C.bg, padding: "2px 8px", borderRadius: 3, display: "inline-flex", alignItems: "center", gap: 4 }}>{c.name} <span style={{ cursor: "pointer", color: C.danger, fontWeight: 700 }} onClick={() => { updateStudent(st.id, { conflictIds: st.conflictIds.filter(x => x !== cid) }); updateStudent(cid, { conflictIds: c.conflictIds.filter(x => x !== st.id) }); }}>×</span></span> : null; })}
                  </div>
                </div>}
                {st.friendIds.length === 0 && st.conflictIds.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>None yet. Use the relationship buttons in the Students tab.</div>}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
                <div>
                  {!assignedIds.has(st.id) ? (
                    <Btn onClick={() => { setPlacingStudentId(st.id); setPickedUpFromKey(null); setEditStudentId(null); }}>↗ Place in Seat</Btn>
                  ) : (
                    <Btn onClick={() => {
                      // Unassign from current seat
                      const sa = { ...assignments };
                      Object.keys(sa).forEach(k => { if (sa[k] === st.id) delete sa[k]; });
                      updateActiveClass(c => ({ ...c, seatAssignments: sa }));
                    }}>✕ Remove from Seat</Btn>
                  )}
                </div>
                <Btn primary onClick={() => setEditStudentId(null)}>Done</Btn>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add class */}
      {showAddClass && (
        <div style={s.modal} onClick={() => setShowAddClass(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 14px", fontFamily: font, fontSize: 20 }}>New Class</h3>
            <div style={{ marginBottom: 10 }}>
              <label style={s.label}>Class name *</label>
              <input style={s.input} value={newClass.name} onChange={e => setNewClass({ ...newClass, name: e.target.value })} placeholder="e.g., English 10 — Section A" autoFocus />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={s.label}>Period</label>
              <select style={s.input} value={PERIOD_LABELS.includes(newClass.period) ? newClass.period : "Custom"} onChange={e => {
                if (e.target.value === "Custom") { setNewClass({ ...newClass, period: "Custom" }); setCustomPeriod(""); }
                else setNewClass({ ...newClass, period: e.target.value });
              }}>
                {PERIOD_LABELS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {(!PERIOD_LABELS.slice(0, -1).includes(newClass.period)) && newClass.period === "Custom" && (
                <input style={{ ...s.input, marginTop: 6 }} value={customPeriod} onChange={e => setCustomPeriod(e.target.value)} placeholder="Type custom period name…" />
              )}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={s.label}>Room layout</label>
              <select style={s.input} value={newClass.roomId || data.rooms[0]?.id} onChange={e => setNewClass({ ...newClass, roomId: e.target.value })}>
                {data.rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.desks.length} desks)</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Copy roster from (optional)</label>
              <select style={s.input} value={copyFromClassId} onChange={e => setCopyFromClassId(e.target.value)}>
                <option value="">— Start fresh —</option>
                {data.classes.map(c => <option key={c.id} value={c.id}>{c.period} {c.name} ({c.students.length} students)</option>)}
              </select>
              {copyFromClassId && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Student names & IEP info will be copied. Relationships and seat assignments will not.</div>}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn onClick={() => setShowAddClass(false)}>Cancel</Btn>
              <Btn primary onClick={addClass}>Create Class</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Edit class */}
      {editClassId && (() => {
        const cl = data.classes.find(c => c.id === editClassId);
        if (!cl) return null;
        return (
          <div style={s.modal} onClick={() => setEditClassId(null)}>
            <div style={s.modalBox} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontFamily: font, fontSize: 20 }}>Edit Class</h3>
                {data.classes.length > 1 && <Btn danger small onClick={() => deleteClass(cl.id)}>Delete Class</Btn>}
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={s.label}>Class name</label>
                <input style={s.input} value={cl.name} onChange={e => updateClass(cl.id, c => ({ ...c, name: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={s.label}>Period</label>
                {(() => {
                  const stdLabels = PERIOD_LABELS.filter(p => p !== "Custom");
                  const isCustom = !stdLabels.includes(cl.period);
                  return <>
                    <select style={s.input} value={isCustom ? "Custom" : cl.period} onChange={e => {
                      if (e.target.value === "Custom") updateClass(cl.id, c => ({ ...c, period: "" }));
                      else updateClass(cl.id, c => ({ ...c, period: e.target.value }));
                    }}>
                      {PERIOD_LABELS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {isCustom && (
                      <input style={{ ...s.input, marginTop: 6 }} value={cl.period} onChange={e => updateClass(cl.id, c => ({ ...c, period: e.target.value }))} placeholder="Type custom period name…" />
                    )}
                  </>;
                })()}
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>Room layout</label>
                <select style={s.input} value={cl.roomId} onChange={e => updateClass(cl.id, c => ({ ...c, roomId: e.target.value }))}>
                  {data.rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.desks.length} desks)</option>)}
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Btn primary onClick={() => setEditClassId(null)}>Done</Btn>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Manage rooms */}
      {showManageRooms && (
        <div style={s.modal} onClick={() => setShowManageRooms(false)}>
          <div style={{ ...s.modalBox, width: 480 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 4px", fontFamily: font, fontSize: 20 }}>Room Layouts</h3>
            <p style={{ fontSize: 12, color: C.muted, margin: "0 0 16px" }}>Rooms hold desk arrangements. Multiple classes can share the same room. Hit 📦 to save a layout as a reusable template.</p>
            {data.rooms.map(r => {
              const classesUsing = data.classes.filter(c => c.roomId === r.id);
              const isEditing = editRoomId === r.id;
              return (
                <div key={r.id} style={{ padding: "10px 12px", background: C.bg, borderRadius: 8, marginBottom: 6, border: `1px solid ${C.borderLight}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    {isEditing ? (
                      <input style={{ ...s.input, width: "auto", flex: 1, marginRight: 8 }} value={r.name} onChange={e => updateRoom(r.id, rm => ({ ...rm, name: e.target.value }))} autoFocus onBlur={() => setEditRoomId(null)} onKeyDown={e => e.key === "Enter" && setEditRoomId(null)} />
                    ) : (
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{r.desks.length} desks · Used by {classesUsing.length} class{classesUsing.length !== 1 ? "es" : ""}: {classesUsing.map(c => c.period).join(", ") || "none"}</div>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <Btn small onClick={() => setEditRoomId(r.id)}>✏️</Btn>
                      <Btn small onClick={() => duplicateRoom(r.id)}>📋</Btn>
                      <Btn small onClick={() => { saveAsTemplate(r.id); }} title="Save to template bank">📦</Btn>
                      {data.rooms.length > 1 && <Btn small danger onClick={() => deleteRoom(r.id)}>✕</Btn>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <input style={{ ...s.input, flex: 1 }} value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="New room name…" onKeyDown={e => e.key === "Enter" && addRoom()} />
              <Btn primary onClick={addRoom}>Add Room</Btn>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <Btn primary onClick={() => setShowManageRooms(false)}>Done</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Template Bank */}
      {showTemplateBank && (
        <div style={s.modal} onClick={() => setShowTemplateBank(false)}>
          <div style={{ ...s.modalBox, width: 500 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 4px", fontFamily: font, fontSize: 20 }}>📦 Layout Template Bank</h3>
            <p style={{ fontSize: 12, color: C.muted, margin: "0 0 16px" }}>Save room layouts as templates so you can quickly set up any classroom you travel to. Load a template to create a new room with that desk arrangement.</p>
            {templates.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", background: C.bg, borderRadius: 8, border: `1px solid ${C.borderLight}` }}>
                <div style={{ fontSize: 28, marginBottom: 6, opacity: 0.3 }}>📦</div>
                <div style={{ fontSize: 13, color: C.muted }}>No templates saved yet.</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Go to <strong>🏫 Rooms</strong> and click 📦 on a room to save its layout here.</div>
              </div>
            ) : (
              templates.map(tmpl => (
                <div key={tmpl.id} style={{ padding: "10px 12px", background: C.bg, borderRadius: 8, marginBottom: 6, border: `1px solid ${C.borderLight}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{tmpl.name}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>
                        {tmpl.desks.length} desk{tmpl.desks.length !== 1 ? "s" : ""} · {tmpl.desks.reduce((sum, d) => sum + d.seats.filter((_, i) => !d.disabledSeats?.includes(i)).length, 0)} active seats · Board: {tmpl.boardPosition}
                        {tmpl.savedAt && ` · Saved ${new Date(tmpl.savedAt).toLocaleDateString()}`}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <Btn small primary onClick={() => { loadTemplate(tmpl.id); setShowTemplateBank(false); }}>Use</Btn>
                      <Btn small danger onClick={() => deleteTemplate(tmpl.id)}>✕</Btn>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <Btn primary onClick={() => setShowTemplateBank(false)}>Done</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Print preview overlay */}
      {printHtml && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,.6)", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <Btn primary onClick={() => {
              const frame = document.getElementById("print-frame");
              if (frame) frame.contentWindow.print();
            }}>🖨️ Print</Btn>
            <Btn onClick={() => setPrintHtml(null)}>✕ Close</Btn>
          </div>
          <iframe
            id="print-frame"
            srcDoc={printHtml}
            style={{ flex: 1, width: "100%", maxWidth: 1100, border: "none", borderRadius: 8, background: "#fff", boxShadow: "0 8px 40px rgba(0,0,0,.3)" }}
          />
        </div>
      )}
    </div>
  );
}

/* ──────────── Student card sub-component ──────────── */
function StudentCard({ st, placing, relActive, onPlace }) {
  return (
    <div onClick={onPlace} style={{
      display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", marginBottom: 3, borderRadius: 6, cursor: "pointer",
      background: relActive ? "#e0f0ff" : placing ? C.accentBg : "#fafaf7",
      border: `1px solid ${relActive ? C.friend : placing ? C.accent : C.borderLight}`,
      transition: "all .12s", fontFamily: `'DM Sans', sans-serif`,
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        background: relActive ? C.friend : st.iep ? C.seatIEP : C.seatFilled, color: "#fff", fontSize: 9, fontWeight: 700,
      }}>
        {st.name.split(" ").map(n => n[0]).join("")}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{st.name}</div>
        <div style={{ display: "flex", gap: 3, marginTop: 1, flexWrap: "wrap" }}>
          {st.iep && <span style={{ display: "inline-block", padding: "0 5px", borderRadius: 3, fontSize: 9, fontWeight: 700, background: C.seatIEP + "20", color: C.seatIEP }}>IEP</span>}
          {st.preferFront && <span style={{ display: "inline-block", padding: "0 5px", borderRadius: 3, fontSize: 9, fontWeight: 700, background: C.accent + "20", color: C.accent }}>↑ FRONT</span>}
          {st.separateSetting && <span style={{ display: "inline-block", padding: "0 5px", borderRadius: 3, fontSize: 9, fontWeight: 700, background: C.seatSep + "20", color: C.seatSep }}>SEP</span>}
          {st.friendIds.length > 0 && <span style={{ display: "inline-block", padding: "0 5px", borderRadius: 3, fontSize: 9, fontWeight: 700, background: C.friend + "20", color: C.friend }}>👫{st.friendIds.length}</span>}
          {st.conflictIds.length > 0 && <span style={{ display: "inline-block", padding: "0 5px", borderRadius: 3, fontSize: 9, fontWeight: 700, background: C.conflict + "20", color: C.conflict }}>⚡{st.conflictIds.length}</span>}
        </div>
      </div>
    </div>
  );
}
