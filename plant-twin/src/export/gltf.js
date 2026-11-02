// Export of the plant to glTF binary (.glb) for Unreal Engine, Blender and other tools.
// Each equipment item becomes a node named by its tag, grouped by zone; moving parts keep
// their own pivots; materials are shared by role so they can be restyled in one place.

import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { ZONES } from '../plant/layout.js';

// [material name, base colour (sRGB), metalness, roughness, opacity]
const PALETTE = {
  body: ['M_Equipment_Body', '#d5d8d6', 0.0, 0.5],
  dark: ['M_Equipment_Frame', '#878e94', 0.2, 0.55],
  steel: ['M_Stainless', '#c9cdd0', 0.6, 0.35],
  rubber: ['M_Rubber', '#2b2e31', 0.0, 0.9],
  product: ['M_Powder_Melt', '#c9a15a', 0.0, 0.7],
  struct: ['M_Steel_Structure', '#b4babe', 0.3, 0.5],
  glass: ['M_Glass', '#cfe2ea', 0.0, 0.05, 0.28],
  wall: ['M_Wall_Panel', '#e3e6e7', 0.1, 0.6],
  roof: ['M_Roof_Panel', '#d7dadb', 0.2, 0.55],
  floor: ['M_Concrete_Floor', '#b3b5b0', 0.0, 0.85],
  ground: ['M_Ground', '#8e9290', 0.0, 0.95],
  apron: ['M_Concrete_Apron', '#a6a9a5', 0.0, 0.9],
  paint: ['M_Floor_Paint', '#ddb02c', 0.0, 0.6],
  luminaire: ['M_Luminaire', '#f4f2ea', 0.0, 0.4],
};

const ZONE_ID = {
  100: 'Raw_Store', 110: 'Receiving', 200: 'Dosing', 250: 'Container_Park', 300: 'Mixing', 400: 'Extrusion',
  500: 'Fine_Milling', 600: 'Packing', 700: 'QC_Hold_Dispatch', 800: 'Laboratory', 900: 'Utilities', 910: 'Outdoor',
};

// Object3D.clone copies userData through JSON, and ours holds live references; clone without it.
function cloneTree(src) {
  const saved = new Map();
  src.traverse((o) => { saved.set(o, o.userData); o.userData = o.userData.layer ? { layer: o.userData.layer } : {}; });
  const c = src.clone(true);
  for (const [o, u] of saved) o.userData = u;
  return c;
}

export function zoneNodeName(code) {
  return `Zone_${code}_${ZONE_ID[code] || 'Misc'}`;
}

export async function exportPlant(twin, opts = {}) {
  const { viewer, plant } = twin;
  const hall = viewer.hall;
  const mats = new Map();
  const geos = new Map();

  const material = (role) => {
    if (!mats.has(role)) {
      const [name, color, metalness, roughness, opacity = 1] = PALETTE[role];
      const m = new THREE.MeshStandardMaterial({ name, color, metalness, roughness, transparent: opacity < 1, opacity, side: THREE.FrontSide });
      if (role === 'luminaire') { m.emissive = new THREE.Color('#fff6e0'); m.emissiveIntensity = 1; }
      if (role === 'glass') m.side = THREE.DoubleSide;
      mats.set(role, m);
    }
    return mats.get(role);
  };

  // stack lights: lit segments glow, unlit ones are plain coloured plastic
  const lamps = new Map();
  const lamp = (src) => {
    if (!lamps.has(src.name)) {
      const on = src.name.endsWith('_On');
      const m = new THREE.MeshStandardMaterial({ name: src.name, color: src.color.clone(), roughness: 0.4 });
      if (on) m.emissive = src.emissive.clone();
      lamps.set(src.name, m);
    }
    return lamps.get(src.name);
  };

  const indexed = (g, keepUV = false) => {
    const key = g.uuid + keepUV;
    if (!geos.has(key)) {
      let ng = g.index ? g : mergeVertices(g, 1e-4);
      if (ng === g) ng = g.clone();
      for (const k of Object.keys(ng.attributes)) if (k !== 'position' && k !== 'normal' && !(k === 'uv' && keepUV)) ng.deleteAttribute(k);
      ng.computeBoundingBox();
      geos.set(key, ng);
    }
    return geos.get(key);
  };

  // Strip view-only objects, index geometry, assign shared materials, name everything.
  const prepare = (node, ctx) => {
    for (const c of [...node.children]) {
      const drop = c.isLine || c.isLineSegments || c.isCSS2DObject || c.isInstancedMesh || c.isLight || c.isCamera
        || (!c.visible && !ctx.keepHidden);
      if (drop) { node.remove(c); continue; }
      c.visible = true;
      if (c.isMesh) {
        c.material = ctx.material(c);
        c.geometry = indexed(c.geometry, !!c.material.map);
        c.castShadow = c.receiveShadow = true;
        c.name = `${ctx.prefix}_${String(ctx.n++).padStart(2, '0')}_${c.userData.layer || 'Mesh'}`;
      } else if (!c.name || c.name === 'Body' || /^[a-z-]+$/.test(c.name)) {
        c.name = `${ctx.prefix}_${c.name === 'Body' ? 'Body' : 'Pivot'}_${String(ctx.n++).padStart(2, '0')}`;
      }
      c.userData = {};
      prepare(c, ctx);
    }
  };

  const byLayer = (override) => (m) => {
    const layer = m.userData.layer;
    if (override && override[layer]) return material(override[layer]);
    if (m.material && /^M_Lamp/.test(m.material.name)) return lamp(m.material);
    if (PALETTE[layer]) return material(layer);
    if (m.material && m.material.map) { m.material.name = m.material.name || 'M_Floor_Label'; return m.material; }
    return material('body');
  };

  const root = new THREE.Group();
  root.name = 'EPK_Plant';

  // building shell
  const building = new THREE.Group();
  building.name = 'Building';
  root.add(building);
  const take = (obj, name, role, override, keepHidden = true) => {
    const c = cloneTree(obj);
    c.name = name;
    c.visible = true;
    if (c.isMesh) {
      c.material = role ? material(role) : c.material;
      c.geometry = indexed(c.geometry, !!c.material.map);
    }
    prepare(c, { prefix: name, n: 1, keepHidden, material: role && !override ? () => material(role) : byLayer(override) });
    building.add(c);
    return c;
  };
  let apron = 0;
  for (const ch of hall.root.children) {
    switch (ch.name) {
      case 'ground': take(ch, 'Ground', 'ground'); break;
      case 'slab': take(ch, 'Floor_Slab', 'floor'); break;
      case 'apron': take(ch, `Apron_${++apron}`, 'apron'); break;
      case 'floor-markings': take(ch, 'Floor_Markings', 'paint'); break;
      case 'zone-labels': if (opts.labels !== false) take(ch, 'Floor_Zone_Names', null, {}); break;
      case 'steel-frame': take(ch, 'Steel_Frame', null, { struct: 'struct', body: 'struct', dark: 'dark' }); break;
      case 'roof-frame': {
        const c = take(ch, 'Roof_Frame', null, { struct: 'struct' });
        const lum = c.children.find((x) => x.name.includes('Pivot') || x.name.includes('luminaires'));
        if (lum) { lum.name = 'Luminaires'; lum.traverse((o) => { if (o.isMesh) o.material = material('luminaire'); }); }
        break;
      }
      case 'roof': take(ch, 'Roof', null, { cladding: 'roof', glass: 'glass' }); break;
      case 'docks': take(ch, 'Docks', null, { dark: 'dark', rubber: 'rubber' }); break;
      case 'north': case 'south': case 'west': case 'east': case 'firewall':
        take(ch, `Wall_${ch.name[0].toUpperCase()}${ch.name.slice(1)}`, null, { cladding: 'wall', glass: 'glass', body: 'body', dark: 'dark', struct: 'struct' });
        break;
      default: break;
    }
  }

  // services
  const svc = cloneTree(plant.services);
  svc.name = 'Services';
  prepare(svc, { prefix: 'Services', n: 1, keepHidden: true, material: byLayer() });
  root.add(svc);

  // equipment by zone
  const zones = new Map();
  for (const z of ZONES) {
    const g = new THREE.Group();
    g.name = zoneNodeName(z.code);
    zones.set(z.code, g);
    root.add(g);
  }
  for (const e of plant.list) {
    // a container docked in a mixer travels with the mixer's cradle
    if (e.group.parent !== plant.root) continue;
    const c = cloneTree(e.group);
    c.name = e.tag;
    c.visible = true;
    prepare(c, { prefix: e.tag, n: 1, keepHidden: false, material: byLayer() });
    zones.get(e.def.zone).add(c);
  }
  for (const [, g] of zones) if (!g.children.length) root.remove(g);

  // the raw-material truck at the west dock
  for (const ch of plant.root.children) {
    if (ch.isGroup && !ch.userData.eq && ch.visible && ch.name === '' && ch !== plant.people && ch !== plant.services) {
      const t = cloneTree(ch);
      t.name = 'Truck_Raw_Delivery';
      prepare(t, { prefix: 'Truck', n: 1, keepHidden: false, material: byLayer() });
      zones.get('100')?.add(t) ?? root.add(t);
    }
  }

  root.updateMatrixWorld(true);
  const exporter = new GLTFExporter();
  const glb = await exporter.parseAsync(root, { binary: true, onlyVisible: true, maxTextureSize: 1024 });
  const stats = { nodes: 0, meshes: 0, tris: 0, materials: 0 };
  const used = new Set();
  root.traverse((o) => { stats.nodes++; if (o.isMesh) { used.add(o.material); stats.materials = used.size; stats.meshes++; stats.tris += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3; } });
  return { glb, stats };
}

// Equipment register for game logic (tooltips, info panels): one row per tag.
export function manifest(twin) {
  return twin.plant.list.map((e) => {
    const d = e.def;
    const p = new THREE.Vector3();
    e.group.getWorldPosition(p);
    return {
      tag: d.tag, name: d.name, model: d.model, type: d.type, zone: d.zone, zoneNode: zoneNodeName(d.zone),
      source: d.src, description: d.desc || '', spec: d.spec || [],
      position_m: [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3)],
    };
  });
}
