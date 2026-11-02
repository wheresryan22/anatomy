// First-person walk through the plant: a capsule with gravity collides against a BVH of the
// static geometry, so walls, machines and rails block the way and stairs lead up to platforms.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const H = 1.8;      // body height, m
const R = 0.3;      // capsule radius, m
const EYE = 1.65;   // eye height above the feet, m
const WALK = 4.0;   // m/s
const RUN = 9.0;    // m/s
const GRAVITY = -18;
const JUMP = 4.2;

// Named spots to jump to: feet position [x, z] and heading in degrees (0 = toward +X, 90 = toward +Z).
export const SPOTS = [
  ['Вход со склада сырья', [1.5, 15.8], 0],
  ['Приёмка и дозировка', [12.0, 21.0], 90],
  ['Смесители CMR-1000', [15.0, 12.6], -90],
  ['Линия 1, экструдер', [32.0, 8.5], 0],
  ['Линия 2, охлаждающая лента', [38.0, 15.8], -30],
  ['Линия 3, мельница ACM-50', [44.0, 20.4], 20],
  ['Линия 4, экструдер', [32.0, 27.6], 0],
  ['Тонкий помол и фильтры', [55.0, 15.8], 0],
  ['Фасовка и паллетайзер', [69.6, 18.6], 0],
  ['Лаборатория ОТК', [78.6, 12.2], -90],
  ['Карантин и отгрузка', [85.4, 31.0], 0],
];

export class WalkMode {
  constructor(viewer) {
    this.v = viewer;
    this.active = false;
    this.keys = new Set();
    this.pos = new THREE.Vector3();  // centre of the capsule's top sphere
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = false;
    this.locked = false;
    this.stick = { x: 0, y: 0 };
    this.listeners = [];
    this._seg = new THREE.Line3();
    this._box = new THREE.Box3();
    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();
    this._c = new THREE.Vector3();
    this._d = new THREE.Vector3();
  }

  on(name, fn) { this.listeners.push([name, fn]); }
  emit(name, arg) { for (const [n, fn] of this.listeners) if (n === name) fn(arg); }

  // Static geometry merged into one world-space mesh with a BVH.
  async buildCollider() {
    if (this.collider) return;
    const { MeshBVH } = await import('three-mesh-bvh');
    const v = this.v, plant = v.plant, hall = v.hall;
    const parts = [];
    const take = (mesh) => {
      if (!mesh.isMesh || mesh.isInstancedMesh) return;
      mesh.updateWorldMatrix(true, false);
      let g = new THREE.BufferGeometry();
      g.setAttribute('position', mesh.geometry.getAttribute('position').clone());
      if (mesh.geometry.index) g.setIndex(mesh.geometry.index.clone());
      g = g.index ? g.toNonIndexed() : g;
      g.applyMatrix4(mesh.matrixWorld);
      parts.push(g);
    };
    for (const ch of hall.root.children) {
      if (['slab', 'ground', 'apron', 'steel-frame', 'docks', 'north', 'south', 'west', 'east', 'firewall'].includes(ch.name)) ch.traverse(take);
    }
    for (const e of plant.list) {
      if (e.def.type === 'forklift' || e.def.type === 'container') continue;
      const body = e.group.children.find((c) => c.name === 'Body');
      if (body) body.traverse(take);
    }
    plant.services.traverse(take);
    const merged = mergeGeometries(parts, false);
    for (const g of parts) g.dispose();
    merged.boundsTree = new MeshBVH(merged, { maxLeafTris: 10 });
    this.collider = merged;
  }

  async enter(spot = 0) {
    await this.buildCollider();
    this.active = true;
    this.keys.clear();
    this.teleport(spot);
    this.bind();
    this.v.controls.enabled = false;
    this.v.camera.near = 0.05;
    this.v.camera.updateProjectionMatrix();
    this.emit('change', true);
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    this.unbind();
    if (document.pointerLockElement) document.exitPointerLock();
    const c = this.v.controls;
    c.enabled = true;
    // hand the view back to the orbit camera, looking where we stood
    const look = new THREE.Vector3(Math.cos(this.yaw), 0, Math.sin(this.yaw));
    c.target.copy(this.feet()).addScaledVector(look, 6);
    this.v.camera.position.copy(c.target).add(new THREE.Vector3(-look.x * 14, 12, -look.z * 14));
    this.emit('change', false);
  }

  feet(out = new THREE.Vector3()) {
    return out.copy(this.pos).setY(this.pos.y - (H - R));
  }

  teleport(i) {
    const [, [x, z], deg] = SPOTS[i] || SPOTS[0];
    this.pos.set(x, H - R + 0.05, z);
    this.vel.set(0, 0, 0);
    this.yaw = (deg * Math.PI) / 180;
    this.pitch = -0.05;
    this.spot = i;
  }

  bind() {
    const dom = this.v.renderer.domElement;
    this._kd = (e) => {
      if (e.target.closest && e.target.closest('input, select, textarea')) return;
      const k = e.code;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Space'].includes(k)) e.preventDefault();
      this.keys.add(k);
      if (k === 'Space' && this.onGround) { this.vel.y = JUMP; this.onGround = false; }
      if (k === 'KeyE' && this.aim) this.emit('pick', this.aim);
      if (k === 'Escape' && !document.pointerLockElement) this.exit();
    };
    this._ku = (e) => this.keys.delete(e.code);
    this._blur = () => this.keys.clear();
    this._click = () => {
      if (this.aim && (this.locked || this.touch)) { this.emit('pick', this.aim); return; }
      if (!this.locked && dom.requestPointerLock) {
        try { const p = dom.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch { /* pointer lock is optional */ }
      }
    };
    this._plc = () => { this.locked = document.pointerLockElement === dom; this.emit('lock', this.locked); };
    this._mm = (e) => {
      if (this.locked) this.turn(e.movementX, e.movementY);
      else if (this.drag) { this.turn(e.clientX - this.drag[0], e.clientY - this.drag[1]); this.drag = [e.clientX, e.clientY]; }
    };
    this._md = (e) => { if (!this.locked && e.pointerType === 'mouse') this.drag = [e.clientX, e.clientY]; };
    this._mu = () => { this.drag = null; };
    // touch: drag anywhere outside the stick to look around
    this._ts = (e) => {
      this.touch = true;
      for (const t of e.changedTouches) if (!this.lookTouch && !t.target.closest('.stick')) this.lookTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
    };
    this._tm = (e) => {
      for (const t of e.changedTouches) if (this.lookTouch && t.identifier === this.lookTouch.id) {
        this.turn((t.clientX - this.lookTouch.x) * 1.6, (t.clientY - this.lookTouch.y) * 1.6);
        this.lookTouch.x = t.clientX; this.lookTouch.y = t.clientY;
        e.preventDefault();
      }
    };
    this._te = (e) => { for (const t of e.changedTouches) if (this.lookTouch && t.identifier === this.lookTouch.id) this.lookTouch = null; };
    window.addEventListener('keydown', this._kd);
    window.addEventListener('keyup', this._ku);
    window.addEventListener('blur', this._blur);
    dom.addEventListener('click', this._click);
    dom.addEventListener('pointerdown', this._md);
    window.addEventListener('pointerup', this._mu);
    window.addEventListener('mousemove', this._mm);
    document.addEventListener('pointerlockchange', this._plc);
    dom.addEventListener('touchstart', this._ts, { passive: true });
    dom.addEventListener('touchmove', this._tm, { passive: false });
    dom.addEventListener('touchend', this._te);
  }

  unbind() {
    const dom = this.v.renderer.domElement;
    window.removeEventListener('keydown', this._kd);
    window.removeEventListener('keyup', this._ku);
    window.removeEventListener('blur', this._blur);
    dom.removeEventListener('click', this._click);
    dom.removeEventListener('pointerdown', this._md);
    window.removeEventListener('pointerup', this._mu);
    window.removeEventListener('mousemove', this._mm);
    document.removeEventListener('pointerlockchange', this._plc);
    dom.removeEventListener('touchstart', this._ts);
    dom.removeEventListener('touchmove', this._tm);
    dom.removeEventListener('touchend', this._te);
  }

  turn(dx, dy) {
    this.yaw += dx * 0.0024;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - dy * 0.0024));
  }

  update(dt) {
    if (!this.active) return;
    dt = Math.min(dt, 0.05);
    const k = this.keys;
    let f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - this.stick.y;
    let s = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0) + this.stick.x;
    // arrow keys turn, for people without a mouse
    this.yaw += ((k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0)) * dt * 1.9;
    const len = Math.hypot(f, s);
    if (len > 1) { f /= len; s /= len; }
    const run = k.has('ShiftLeft') || k.has('ShiftRight') || Math.hypot(this.stick.x, this.stick.y) > 0.92;
    const speed = run ? RUN : WALK;
    const fx = Math.cos(this.yaw), fz = Math.sin(this.yaw);
    const mx = (fx * f - fz * s) * speed, mz = (fz * f + fx * s) * speed;

    const steps = 5;
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.vel.y += (this.onGround ? 0 : GRAVITY) * h;
      this.pos.x += mx * h;
      this.pos.z += mz * h;
      this.pos.y += this.vel.y * h;
      this.collide(h);
    }
    if (this.pos.y < -20) this.teleport(this.spot || 0);

    const cam = this.v.camera;
    const eye = this.feet(this._d).setY(this.feet(this._d).y + EYE);
    cam.position.copy(eye);
    cam.rotation.set(this.pitch, -this.yaw - Math.PI / 2, 0, 'YXZ');
    cam.updateMatrixWorld();
    this.v.dirty = true;

    // what the crosshair points at
    this._aimT = (this._aimT || 0) + dt;
    if (this._aimT > 0.1) {
      this._aimT = 0;
      const eq = this.v.pickCenter(18);
      if (eq !== this.aim) { this.aim = eq; this.emit('aim', eq); }
    }
  }

  collide(dt) {
    const seg = this._seg;
    const top = this.pos;
    seg.start.copy(top);
    seg.end.copy(top).setY(top.y - (H - 2 * R));
    const box = this._box.makeEmpty();
    box.expandByPoint(seg.start).expandByPoint(seg.end);
    box.min.addScalar(-R);
    box.max.addScalar(R);
    const triPoint = this._a, capPoint = this._b;
    this.collider.boundsTree.shapecast({
      intersectsBounds: (b) => b.intersectsBox(box),
      intersectsTriangle: (tri) => {
        const dist = tri.closestPointToSegment(seg, triPoint, capPoint);
        if (dist < R) {
          const depth = R - dist;
          const dir = capPoint.sub(triPoint).normalize();
          seg.start.addScaledVector(dir, depth);
          seg.end.addScaledVector(dir, depth);
        }
      },
    });
    const delta = this._c.subVectors(seg.start, top);
    this.onGround = delta.y > Math.abs(dt * this.vel.y * 0.25);
    const off = Math.max(0, delta.length() - 1e-5);
    delta.normalize().multiplyScalar(off);
    top.add(delta);
    if (!this.onGround) {
      delta.normalize();
      this.vel.addScaledVector(delta, -delta.dot(this.vel));
    } else {
      this.vel.set(0, 0, 0);
    }
  }

  // position on the plan, for the mini-map: [x, z, yaw]
  where() {
    return [this.pos.x, this.pos.z, this.yaw];
  }
}
