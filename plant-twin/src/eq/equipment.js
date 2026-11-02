// A piece of equipment in the twin: static merged body, live parts,
// a three-segment stack light, an anchor for its tag and a status.

import * as THREE from 'three';
import { Assembly } from '../core/kit.js';
import { cachedGeo } from '../core/kit.js';

const LAMP_COLORS = { red: '#ff3b30', amber: '#ffb000', green: '#22d36b', blue: '#3c8cff' };
const lampMats = {};
function lampMat(color, on) {
  const k = color + on;
  if (!lampMats[k]) {
    const c = new THREE.Color(LAMP_COLORS[color]);
    lampMats[k] = new THREE.MeshStandardMaterial({
      color: on ? c : c.clone().multiplyScalar(0.22).lerp(new THREE.Color('#7b8388'), 0.45),
      emissive: on ? c : new THREE.Color('#000000'),
      emissiveIntensity: on ? 1.6 : 0,
      roughness: 0.4,
      transparent: !on,
      opacity: on ? 1 : 0.85,
    });
    lampMats[k].name = `M_Lamp_${color[0].toUpperCase()}${color.slice(1)}_${on ? 'On' : 'Off'}`;
  }
  return lampMats[k];
}

let capMat = null;
const segGeo = () => cachedGeo('lampseg', () => new THREE.CylinderGeometry(0.045, 0.045, 0.075, 16));
const capGeo = () => cachedGeo('lampcap', () => new THREE.CylinderGeometry(0.03, 0.045, 0.025, 16));

// Signal tower: red on top, amber, green at the bottom.
export class StackLight {
  constructor(parent, x, y, z) {
    this.group = new THREE.Group();
    this.group.position.set(x, y, z);
    this.segs = ['green', 'amber', 'red'].map((c, i) => {
      const m = new THREE.Mesh(segGeo(), lampMat(c, false));
      m.position.y = 0.04 + i * 0.078;
      m.userData.color = c;
      this.group.add(m);
      return m;
    });
    const cap = new THREE.Mesh(capGeo(), lampMat('red', false));
    cap.position.y = 0.04 + 3 * 0.078 - 0.025;
    cap.material = capMat ||= new THREE.MeshStandardMaterial({ color: '#6b7378', roughness: 0.6, name: 'M_Lamp_Cap' });
    this.group.add(cap);
    parent.add(this.group);
    this.state = null;
  }

  set(status, time) {
    const blink = Math.floor(time * 1.6) % 2 === 0;
    let on = null, flash = false;
    switch (status) {
      case 'run': on = 'green'; break;
      case 'warmup': on = 'green'; flash = true; break;
      case 'idle': case 'wait': case 'starved': case 'blocked': on = 'amber'; break;
      case 'changeover': on = 'amber'; flash = true; break;
      case 'stop': case 'fault': on = 'red'; flash = true; break;
      default: on = null;
    }
    const key = on + (flash ? blink : '');
    if (key === this.state) return;
    this.state = key;
    for (const s of this.segs) s.material = lampMat(s.userData.color, s.userData.color === on && (!flash || blink));
  }
}

export class Equipment {
  constructor(def, look) {
    this.def = def;
    this.tag = def.tag;
    this.look = look;
    this.mats = look.createSet('eq');
    this.group = new THREE.Group();
    this.group.name = def.tag;
    this.group.userData.eq = this;
    this.lights = [];
    this.anchor = new THREE.Vector3(0, 2, 0);
    this.status = 'off';
    this.update = null;
    this.live = {};
    if (def.pos) this.group.position.set(def.pos[0], def.pos[1] ?? 0, def.pos[2]);
    if (def.ry) this.group.rotation.y = def.ry;
  }

  // Build a merged static body from a drawing function.
  body(fn, opts) {
    const a = new Assembly();
    fn(a);
    const g = a.build(this.mats, opts);
    g.name = 'Body';
    this.group.add(g);
    return g;
  }

  // A separately moving part, merged on its own, attached under `parent`.
  part(fn, parent = this.group, opts) {
    const a = new Assembly();
    fn(a);
    const g = a.build(this.mats, opts);
    parent.add(g);
    return g;
  }

  light(x, y, z) {
    const l = new StackLight(this.group, x, y, z);
    this.lights.push(l);
    return l;
  }

  setStatus(status, time) {
    this.status = status;
    for (const l of this.lights) l.set(status, time);
  }

  worldAnchor(out = new THREE.Vector3()) {
    return this.group.localToWorld(out.copy(this.anchor));
  }

  pickMeshes() {
    const list = [];
    this.group.traverse((o) => { if (o.isMesh && o.userData.layer) list.push(o); });
    return list;
  }
}
