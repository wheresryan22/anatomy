// Renderer, camera, post-processing, picking, labels and display modes.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { STATUS_COLORS, addGrain } from '../core/look.js';

const ACCENT = '#2456c9';

export class Viewer {
  constructor(host, look) {
    this.host = host;
    this.look = look;
    this.listeners = {};
    const w = host.clientWidth || 800, h = host.clientHeight || 600;
    const mobile = matchMedia('(pointer: coarse)').matches || Math.min(w, h) < 600;
    this.quality = mobile ? 'standard' : 'high';

    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    r.setSize(w, h);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.12;
    r.domElement.className = 'gl';
    host.appendChild(r.domElement);

    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color(look.p.bg);
    scene.fog = new THREE.FogExp2(look.p.bg, look.p.fog);
    const pm = new THREE.PMREMGenerator(r);
    scene.environment = pm.fromScene(new RoomEnvironment(r), 0.04).texture;

    const cam = (this.camera = new THREE.PerspectiveCamera(36, w / h, 0.3, 1200));
    cam.position.set(8, 58, 78);
    const c = (this.controls = new OrbitControls(cam, r.domElement));
    c.target.set(40, 0, 17);
    c.enableDamping = true;
    c.dampingFactor = 0.09;
    c.maxPolarAngle = 1.49;
    c.minDistance = 2.5;
    c.maxDistance = 320;
    c.zoomToCursor = true;
    c.screenSpacePanning = false;
    c.rotateSpeed = 0.7;
    c.panSpeed = 0.9;
    c.addEventListener('change', () => (this.dirty = true));

    const hemi = (this.hemi = new THREE.HemisphereLight(look.p.hemiSky, look.p.hemiGround, look.p.hemi));
    scene.add(hemi);
    const sun = (this.sun = new THREE.DirectionalLight('#ffffff', look.p.sun));
    sun.position.set(-20, 95, 70);
    sun.target.position.set(36, 0, 14);
    sun.castShadow = true;
    const S = sun.shadow;
    S.mapSize.set(mobile ? 2048 : 4096, mobile ? 2048 : 4096);
    S.camera.left = -86; S.camera.right = 86; S.camera.top = 62; S.camera.bottom = -62;
    S.camera.near = 10; S.camera.far = 260;
    S.bias = -0.0003; S.normalBias = 0.035;
    S.radius = 2.5;
    scene.add(sun, sun.target);

    // post-processing
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: mobile ? 2 : 4 });
    const comp = (this.composer = new EffectComposer(r, rt));
    comp.setPixelRatio(r.getPixelRatio());
    comp.setSize(w, h);
    comp.addPass(new RenderPass(scene, cam));
    this.gtao = new GTAOPass(scene, cam, w, h);
    this.gtao.output = GTAOPass.OUTPUT.Default;
    this.gtao.blendIntensity = 0.7;
    this.gtao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 16, distanceFallOff: 0.8 });
    this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 8, rings: 2, samples: 16 });
    const gt = this.gtao;
    gt.overrideVisibility = function () {
      const cache = this._visibilityCache;
      this.scene.traverse((o) => {
        cache.set(o, o.visible);
        if (o.isPoints || o.isLine || o.isCSS2DObject || (o.isMesh && o.material && o.material.transparent)) o.visible = false;
      });
    };
    gt.enabled = this.quality === 'high';
    comp.addPass(gt);
    const outline = (this.outline = new OutlinePass(new THREE.Vector2(w, h), scene, cam));
    outline.edgeStrength = 5;
    outline.edgeGlow = 0;
    outline.edgeThickness = 1.2;
    outline.pulsePeriod = 0;
    outline.visibleEdgeColor.set(ACCENT);
    outline.hiddenEdgeColor.set('#7d98d8');
    comp.addPass(outline);
    comp.addPass(new OutputPass());
    this.mobile = mobile;
    look.onStyle((p) => this.applyStyle(p));

    // labels
    const lr = (this.labels = new CSS2DRenderer());
    lr.setSize(w, h);
    lr.domElement.className = 'labels';
    host.appendChild(lr.domElement);

    this.ray = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.pickables = [];
    this.hovered = null;
    this.selected = null;
    this.mode = 'model';
    this.isolate = false;
    this.faces = [];
    this.tags = [];
    this.zoneTags = [];
    this.dirty = true;
    this.fly = null;

    new ResizeObserver(() => this.resize()).observe(host);
    this.bindPointer();
  }

  on(name, fn) {
    (this.listeners[name] ||= []).push(fn);
  }
  emit(name, arg) {
    for (const fn of this.listeners[name] || []) fn(arg);
  }

  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.labels.setSize(w, h);
    this.dirty = true;
    // resizing clears the canvas; draw at once so the view never flashes empty
    if (this.plant) this.render();
  }

  setPlant(plant, hall) {
    this.plant = plant;
    this.hall = hall;
    this.scene.add(hall.root);
    this.scene.add(plant.root);
    this.pickables = plant.pickables;
    this.faces = hall.faces;
    for (const e of plant.list) this.addTag(e);
  }

  addTag(e) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'tag';
    el.innerHTML = `<i class="dot"></i><b>${e.tag}</b><span>${e.def.model}</span>`;
    el.title = e.def.name;
    el.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    el.addEventListener('click', (ev) => { ev.stopPropagation(); this.select(e, true); });
    const o = new CSS2DObject(el);
    o.position.copy(e.anchor);
    e.group.add(o);
    e.tagObj = o;
    e.tagEl = el;
    this.tags.push(e);
  }

  addZoneTag(text, pos) {
    const el = document.createElement('div');
    el.className = 'zonetag';
    el.textContent = text;
    const o = new CSS2DObject(el);
    o.position.copy(pos);
    this.scene.add(o);
    this.zoneTags.push(o);
    return o;
  }

  bindPointer() {
    const dom = this.renderer.domElement;
    let down = null;
    let lastMove = 0;
    dom.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    dom.addEventListener('pointermove', (e) => {
      if (this.walk?.active || e.pointerType !== 'mouse' || e.buttons) return;
      const now = performance.now();
      if (now - lastMove < 70) return;
      lastMove = now;
      this.hover(this.pick(e));
    });
    dom.addEventListener('pointerleave', () => this.hover(null));
    dom.addEventListener('pointerup', (e) => {
      if (!down || this.walk?.active) { down = null; return; }
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      if (moved < 6 && performance.now() - down.t < 500) this.select(this.pick(e), false);
      down = null;
    });
    dom.addEventListener('dblclick', (e) => {
      if (this.walk?.active) return;
      const hit = this.pick(e);
      if (hit) this.focus(hit);
    });
  }

  pick(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    const list = this.pickables.filter((m) => m.visible && !(m.material.transparent && m.material.opacity < 0.2));
    const hits = this.ray.intersectObjects(list, false);
    return hits.length ? hits[0].object.userData.eq : null;
  }

  // equipment under the screen centre within `max` metres (walk mode crosshair)
  pickCenter(max = 18) {
    this.ndc.set(0, 0);
    this.ray.setFromCamera(this.ndc, this.camera);
    this.ray.far = max;
    const cp = this.camera.position;
    const sph = this._sph || (this._sph = new THREE.Sphere());
    const list = this.pickables.filter((m) => {
      if (!m.visible || !m.geometry.boundingSphere) return false;
      sph.copy(m.geometry.boundingSphere).applyMatrix4(m.matrixWorld);
      return sph.center.distanceTo(cp) - sph.radius < max;
    });
    const hits = this.ray.intersectObjects(list, false);
    this.ray.far = Infinity;
    return hits.length ? hits[0].object.userData.eq : null;
  }

  hover(eq) {
    if (eq === this.hovered) return;
    if (this.hovered && this.hovered !== this.selected) this.hovered.mats.set({ hover: false });
    this.hovered = eq;
    if (eq && eq !== this.selected) eq.mats.set({ hover: true });
    this.renderer.domElement.style.cursor = eq ? 'pointer' : '';
    this.emit('hover', eq);
    this.dirty = true;
  }

  select(eq, fly) {
    if (this.selected) { this.selected.mats.set({ selected: false, hover: false }); this.selected.tagEl?.classList.remove('sel'); }
    this.selected = eq;
    if (eq) { eq.mats.set({ selected: true, hover: false }); eq.tagEl?.classList.add('sel'); }
    this.outline.selectedObjects = eq ? [eq.group] : [];
    this.applyMode();
    if (eq && fly) this.focus(eq);
    this.emit('select', eq);
    this.dirty = true;
  }

  // frame an equipment item or a box
  focus(eq) {
    const box = new THREE.Box3().setFromObject(eq.group);
    const side = eq.def.side;
    const dir = side ? new THREE.Vector3(0.4, 1.15, 0.75 * side) : null;
    this.frameBox(box, 1.7, dir);
  }

  frameBox(box, k = 1.25, dir = null) {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(1.2, size.length() / 2);
    const fov = (this.camera.fov * Math.PI) / 180;
    const dist = (radius / Math.sin(fov / 2)) * k * 0.62;
    const d = dir ? dir.clone().normalize() : this.camera.position.clone().sub(this.controls.target).normalize();
    if (!dir && d.y < 0.35) { d.y = 0.35; d.normalize(); }
    this.flyTo(center.clone().setY(Math.min(center.y, 2)), center.clone().addScaledVector(d, dist));
  }

  flyTo(target, position, ms = 950) {
    this.fly = {
      t0: performance.now(), ms,
      fromT: this.controls.target.clone(), toT: target,
      fromP: this.camera.position.clone(), toP: position,
    };
  }

  view(name) {
    const V = {
      overview: [[40, 0, 17], [8, 58, 78]],
      plan: [[36, 0, 18], [36.01, 190, 18.6]],
      iso: [[36, 0, 18], [110, 70, 96]],
      north: [[36, 0, 18], [36, 40, -70]],
    }[name];
    if (V) this.flyTo(new THREE.Vector3(...V[0]), new THREE.Vector3(...V[1]));
  }

  setMode(mode) {
    this.mode = mode;
    this.applyMode();
  }

  setIsolate(on) {
    this.isolate = on;
    this.applyMode();
  }

  // tint colours come from the model each frame through statusTint/loadTint
  applyMode(tints) {
    const plant = this.plant;
    if (!plant) return;
    for (const e of plant.list) {
      const ghost = this.isolate && this.selected && e !== this.selected;
      let tint = null, k = 0;
      if (this.mode === 'status') { tint = STATUS_COLORS[e.status] || STATUS_COLORS.off; k = e.status === 'off' ? 0.25 : 0.55; }
      if (this.mode === 'load' && tints) { tint = tints.get(e) || null; k = tint ? 0.6 : 0; }
      if (this.mode === 'load' && !tints) { tint = e.mats.state.tint; k = e.mats.state.k; }
      e.mats.set({ mode: this.mode === 'xray' ? 'xray' : 'model', ghost, tint, k });
    }
    const svcGhost = this.mode === 'xray' || (this.isolate && this.selected);
    plant.peopleMats.set({ ghost: svcGhost });
    this.dirty = true;
  }

  // scene colours that live outside the material sets
  applyStyle(p) {
    this.scene.background.set(p.bg);
    this.scene.fog.color.set(p.bg);
    this.hemi.color.set(p.hemiSky);
    this.hemi.groundColor.set(p.hemiGround);
    this.hemi.intensity = p.hemi;
    this.sun.intensity = p.sun;
    if (this.hall) for (const ch of this.hall.root.children) {
      if (ch.name === 'slab' && ch.material) { ch.material.color.set(p.floor); if (!ch.userData.grain) { addGrain(ch.material, 0.35, 1.6); ch.material.needsUpdate = true; ch.userData.grain = true; } }
      if (ch.name === 'ground' && ch.material) ch.material.color.set(p.ground);
      if (ch.name === 'joints' && ch.material) ch.material.color.set(p.floorLine);
    }
    this.dirty = true;
  }

  // Standard: light GPU load; High: current default; Max: softer shadows, denser ambient occlusion
  setQuality(q) {
    this.quality = q;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(q === 'standard' ? Math.min(dpr, 1) : Math.min(dpr, 2));
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    const size = q === 'standard' ? 2048 : 4096;
    const S = this.sun.shadow;
    if (S.mapSize.x !== size) { S.mapSize.set(size, size); if (S.map) { S.map.dispose(); S.map = null; } }
    S.radius = q === 'max' ? 3.5 : 2.5;
    this.gtao.enabled = q !== 'standard';
    const n = q === 'max' ? 24 : 12;
    this.gtao.updateGtaoMaterial({ samples: n });
    this.gtao.updatePdMaterial({ samples: q === 'max' ? 24 : 16 });
    this.resize();
  }

  setLayer(name, on) {
    const h = this.hall, p = this.plant;
    if (name === 'roof') { h.roof.visible = on; h.roofFrame.visible = on; }
    if (name === 'walls') for (const f of this.faces) f.group.visible = on;
    if (name === 'axes') { h.axes.visible = on; h.zoneLabels.visible = on; }
    if (name === 'services') p.services.visible = on;
    if (name === 'people') { p.people.visible = on; }
    if (name === 'labels') { this.showTags = on; this.labels.domElement.style.display = on ? '' : 'none'; }
    if (name === 'ao') this.gtao.enabled = on;
    this.dirty = true;
  }

  // per-frame upkeep: camera flight, wall fade, label LOD
  frame(dt) {
    const walking = !!(this.walk && this.walk.active);
    if (walking) { this.walk.update(dt); this.fly = null; }
    if (this.fly) {
      const f = this.fly;
      const u = Math.min(1, (performance.now() - f.t0) / f.ms);
      const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      this.controls.target.lerpVectors(f.fromT, f.toT, e);
      this.camera.position.lerpVectors(f.fromP, f.toP, e);
      if (u >= 1) this.fly = null;
      this.dirty = true;
    }
    if (!walking) this.controls.update();
    const cp = this.camera.position;
    // adaptive near plane: whatever stands right in front of the lens is cut away in close-ups
    const near = walking ? 0.05 : Math.min(6, Math.max(0.3, cp.distanceTo(this.controls.target) * 0.28));
    if (Math.abs(near - this.camera.near) / this.camera.near > 0.08) { this.camera.near = near; this.camera.updateProjectionMatrix(); this.dirty = true; }
    const toCam = cp.clone().sub(this.controls.target).normalize();
    for (const f of this.faces) {
      if (f.fixed) continue;
      const out = f.normal.dot(toCam) > 0.12 && this.outside(cp, f.name);
      f.mats.set({ ghost: out || this.mode === 'xray' });
    }
    // labels: equipment tags near, zone names far, overlapping tags hidden
    this._lt = (this._lt || 0) + dt;
    if (this._lt > 0.15) {
      this._lt = 0;
      const v = new THREE.Vector3();
      const dist = walking ? 0 : cp.distanceTo(this.controls.target);
      const W = this.host.clientWidth, H = this.host.clientHeight;
      const cand = [];
      for (const e of this.tags) {
        e.worldAnchor(v);
        const d = v.distanceTo(cp);
        const want = walking ? d < 12 || e === this.selected : e === this.selected || e === this.hovered || (d < 34 && dist < 48) || (this.mode !== 'model' && dist < 70 && d < 60);
        const dot = e.tagEl.firstChild;
        const s = e.status;
        if (dot.dataset.s !== s) { dot.dataset.s = s; dot.style.background = STATUS_COLORS[s] || STATUS_COLORS.off; }
        if (!want || !e.group.visible) { e.tagObj.visible = false; continue; }
        v.project(this.camera);
        if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) { e.tagObj.visible = false; continue; }
        const prio = e === this.selected ? -2 : e === this.hovered ? -1 : d;
        cand.push({ e, x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, prio, w: e.tagEl.offsetWidth || 120 });
      }
      for (const z of this.zoneTags) {
        z.getWorldPosition(v);
        const far = !walking && dist > 40;
        if (!far) { z.visible = false; continue; }
        v.project(this.camera);
        if (v.z > 1) { z.visible = false; continue; }
        cand.push({ zone: z, x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, prio: 1000, w: z.element.offsetWidth || 200 });
      }
      cand.sort((a, b) => a.prio - b.prio);
      const placed = [];
      for (const c of cand) {
        const r = c.zone ? { x0: c.x - c.w / 2 - 4, x1: c.x + c.w / 2 + 4, y0: c.y - 14, y1: c.y + 14 } : { x0: c.x - c.w / 2 - 4, x1: c.x + c.w / 2 + 4, y0: c.y - 26, y1: c.y + 2 };
        const hit = placed.some((p) => r.x0 < p.x1 && r.x1 > p.x0 && r.y0 < p.y1 && r.y1 > p.y0);
        const show = !hit || c.prio < 0;
        if (c.zone) c.zone.visible = show; else c.e.tagObj.visible = show;
        if (show) placed.push(r);
      }
      // overhead services go translucent in close-ups so they do not hide the machines
      if (this.plant) this.plant.servicesMats.set({ ghost: !walking && dist < 24 && this.mode !== 'xray' });
    }
  }

  outside(cp, name) {
    if (name === 'north') return cp.z < 0;
    if (name === 'south') return cp.z > 36;
    if (name === 'west') return cp.x < -24;
    if (name === 'east') return cp.x > 96;
    return false;
  }

  render() {
    this.composer.render();
    this.labels.render(this.scene, this.camera);
    this.dirty = false;
  }
}
