// Scene palette and per-object material sets: a white study model with graphite edges.

import * as THREE from 'three';

export const PALETTES = {
  light: {
    bg: '#e6e8e4', ground: '#d6d9d3', floor: '#e3e5e0', floorLine: '#c4c8c2', paint: '#7d868c', paintText: '#5b646a',
    body: '#f4f5f2', dark: '#b2b8bb', steel: '#e3e6e6', rubber: '#5f666b', glass: '#b9cfd8', product: '#c98b34',
    struct: '#e6e8e5', clad: '#cfd8dc', edge: '#262c31', edgeOpacity: 0.62, cladOpacity: 0.16,
    hemiSky: '#ffffff', hemiGround: '#bdbab0', hemi: 1.15, sun: 2.1, env: 0.35, exposure: 1.0, fog: 0.0009,
    figure: '#9aa2a7',
  },
  // factory colours: RAL 7035 housings, graphite drives and frames, stainless, concrete floor
  real: {
    bg: '#d8dde1', ground: '#9b9f9b', floor: '#aeb0aa', floorLine: '#93968f', paint: '#7d868c', paintText: '#5b646a', paintLayer: '#d9a92b',
    body: '#c6cac7', dark: '#5a636b', steel: '#bcc2c6', rubber: '#23272b', glass: '#a7c4d2', product: '#c48a2c',
    struct: '#8f9aa3', clad: '#c5d2d9', edge: '#1f2428', edgeOpacity: 0.13, cladOpacity: 0.2,
    hemiSky: '#ffffff', hemiGround: '#a39f95', hemi: 0.85, sun: 2.6, env: 1.0, exposure: 1.0, fog: 0.0009,
    figure: '#9aa2a7', grain: 1,
    pbr: { body: [0.05, 0.55], dark: [0.35, 0.5], steel: [0.9, 0.28], rubber: [0.0, 0.92], product: [0.0, 0.65], struct: [0.3, 0.55] },
  },
};

// Procedural surface grain in world space (the merged geometry has no UVs):
// paint orange peel, concrete speckle and roughness variation, switched by uGrain.
export const GRAIN = { value: 0 };
export function addGrain(mat, amount = 0.18, scale = 3.5) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uGrain = GRAIN;
    sh.uniforms.uGrainAmt = { value: amount };
    sh.uniforms.uGrainScale = { value: scale };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGrainPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGrainPos = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vGrainPos;
uniform float uGrain; uniform float uGrainAmt; uniform float uGrainScale;
float gHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float gNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(gHash(i), gHash(i + vec3(1,0,0)), f.x), mix(gHash(i + vec3(0,1,0)), gHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(gHash(i + vec3(0,0,1)), gHash(i + vec3(1,0,1)), f.x), mix(gHash(i + vec3(0,1,1)), gHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float gN = 0.6 * gNoise(vGrainPos * uGrainScale) + 0.4 * gNoise(vGrainPos * uGrainScale * 9.0);
diffuseColor.rgb *= 1.0 + uGrain * uGrainAmt * (gN - 0.5);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + uGrain * uGrainAmt * 0.8 * (gN - 0.5), 0.04, 1.0);`);
  };
  mat.customProgramCacheKey = () => 'grain';
  return mat;
}

export const STATUS_COLORS = {
  run: '#2f9e64', idle: '#d19a1f', wait: '#d19a1f', starved: '#d19a1f', blocked: '#d97a26',
  stop: '#d2453c', fault: '#d2453c', off: '#8e979c', warmup: '#3c86d8', changeover: '#7a68d0',
};

const SOLID = ['body', 'dark', 'steel', 'rubber', 'product', 'struct'];

export class Look {
  constructor() {
    this.sets = new Set();
    this.name = 'light';
    this.p = PALETTES.light;
    this.listeners = [];
  }

  setStyle(name) {
    if (!PALETTES[name] || name === this.name) return;
    this.name = name;
    this.p = PALETTES[name];
    GRAIN.value = this.p.grain || 0;
    for (const s of this.sets) s.refresh();
    for (const fn of this.listeners) fn(this.p, name);
  }

  onStyle(fn) {
    this.listeners.push(fn);
  }

  createSet(kind = 'eq') {
    const s = new MatSet(this, kind);
    this.sets.add(s);
    return s;
  }

}

export class MatSet {
  constructor(look, kind) {
    this.look = look;
    this.kind = kind;
    this.meshes = [];
    this.lines = [];
    this.m = {
      body: new THREE.MeshStandardMaterial({ roughness: 0.86, metalness: 0.0 }),
      struct: new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.0 }),
      dark: new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0.08 }),
      steel: new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.32 }),
      rubber: new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0.0 }),
      product: new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.0 }),
      glass: new THREE.MeshStandardMaterial({ roughness: 0.08, metalness: 0.1, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      edge: new THREE.LineBasicMaterial({ transparent: true, depthWrite: false }),
    };
    this.base = {};
    for (const k in this.m) if (this.m[k].isMeshStandardMaterial) {
      this.base[k] = [this.m[k].metalness, this.m[k].roughness];
      if (k !== 'glass') addGrain(this.m[k], k === 'struct' ? 0.14 : 0.18);
    }
    this.state = { mode: 'model', tint: null, k: 0, hover: false, ghost: false, selected: false, hidden: false };
    this._tmp = new THREE.Color();
    this.refresh();
  }

  get(layer) {
    if (layer === 'cladding') return this.m.glass;
    return this.m[layer] || this.m.body;
  }

  track(meshes, lines) {
    this.meshes.push(...meshes);
    if (lines) this.lines.push(lines);
    this.applyShadow();
  }

  set(patch) {
    let changed = false;
    for (const k in patch) if (this.state[k] !== patch[k]) { this.state[k] = patch[k]; changed = true; }
    if (changed) this.refresh();
  }

  applyShadow() {
    const ghost = this.state.ghost || this.state.mode === 'xray';
    for (const mesh of this.meshes) mesh.castShadow = !ghost && mesh.userData.layer !== 'glass' && mesh.userData.layer !== 'cladding';
  }

  refresh() {
    const p = this.look.p;
    const st = this.state;
    const ghost = st.ghost;
    const xray = st.mode === 'xray' && !st.selected;
    const tint = st.tint ? this._tmp.set(st.tint) : null;
    for (const L of SOLID) {
      const mat = this.m[L];
      mat.color.set(this.kind === 'paint' && L === 'dark' && p.paintLayer ? p.paintLayer : p[L] ?? p.body);
      const [mt, ro] = (p.pbr && p.pbr[L]) || this.base[L];
      mat.metalness = mt;
      mat.roughness = ro;
      mat.envMapIntensity = p.env === 1 ? 1.0 : 0.45;
      if (tint && L !== 'product') mat.color.lerp(tint, st.k * (L === 'body' || L === 'struct' ? 1 : 0.7));
      const transparent = ghost || xray;
      if (mat.transparent !== transparent) { mat.transparent = transparent; mat.needsUpdate = true; }
      mat.opacity = ghost ? 0.05 : xray ? 0.1 : 1;
      mat.depthWrite = !transparent;
      mat.emissive.set(st.hover || st.selected ? '#3f6fe0' : '#000000');
      mat.emissiveIntensity = st.selected ? 0.1 : st.hover ? 0.16 : 0;
    }
    const g = this.m.glass;
    g.color.set(p.glass);
    g.opacity = ghost ? 0.03 : (this.kind === 'clad' ? p.cladOpacity : 0.2);
    const e = this.m.edge;
    e.color.set(p.edge);
    e.opacity = ghost ? 0.08 : xray ? p.edgeOpacity : this.kind === 'struct' ? p.edgeOpacity * 0.55 : p.edgeOpacity;
    for (const l of this.lines) l.visible = !st.hidden;
    for (const mesh of this.meshes) mesh.visible = !st.hidden;
    this.applyShadow();
  }
}
