// Entry point: build the scene, warm-start the model, run the loop.

import * as THREE from 'three';
import { Look } from './core/look.js';
import { Viewer } from './view/viewer.js';
import { buildHall } from './scene/building.js';
import { Plant } from './plant/plant.js';
import { PlantModel } from './sim/model.js';
import { UI } from './ui/ui.js';
import { ZONES } from './plant/layout.js';

function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

async function boot() {
  const loading = document.getElementById('loading');
  if (!webglOk()) {
    loading.innerHTML = '<div>Браузер не поддерживает WebGL, 3D-модель недоступна.<br>Откройте страницу в Chrome, Edge, Firefox или Safari с включённым аппаратным ускорением.</div>';
    return;
  }
  try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]); } catch { /* fonts are optional */ }
  await new Promise((r) => requestAnimationFrame(r));

  const look = new Look();
  const stage = document.getElementById('stage');
  const viewer = new Viewer(stage, look);
  const model = new PlantModel();
  // warm start: the plant opens mid-shift with work in progress
  model.advance(3.25 * 3600, 10);
  const hall = buildHall(look);
  const plant = new Plant(look);
  viewer.setPlant(plant, hall);
  for (const z of ZONES) viewer.addZoneTag(`${z.code} · ${z.name}`, new THREE.Vector3((z.x0 + z.x1) / 2, z.outdoor ? 6 : 4.5, (z.z0 + z.z1) / 2));
  const ui = new UI({ model, viewer, plant });
  window.twin = { model, viewer, plant, ui };

  plant.sync(model, 0, 0);
  viewer.render();
  loading.remove();

  let last = performance.now();
  let time = 0;
  const loop = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (ui.playing) {
      time += dt;
      model.advance(dt * ui.speed, ui.speed >= 1200 ? 10 : 5);
    }
    plant.sync(model, ui.playing ? dt : 0, time);
    viewer.frame(dt);
    ui.tick(dt);
    if (ui.playing || viewer.dirty || viewer.fly) viewer.render();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

boot().catch((err) => {
  console.error(err);
  const loading = document.getElementById('loading');
  if (loading) loading.innerHTML = `<div>Не удалось построить сцену: ${String(err && err.message ? err.message : err)}</div>`;
});
