function lineEnds({ select = null, tolerance = 1, root: rootSlack = 2, mark = 7, least = 0.3, cover = 0.5, show = false } = {}) {
  const plate = select == null ? document.querySelector(".iso-plate") || document.body : document.querySelector(select);
  if (!plate) throw new Error(`Line target not found: ${select}`);
  const box = plate.getBoundingClientRect();
  const style = document.createElement("style");
  style.textContent = `${select || ".iso-plate"} *{pointer-events:none!important}${select || ".iso-plate"} svg,${select || ".iso-plate"} svg *{pointer-events:visiblePainted!important}`;
  document.head.append(style);
  const outsideDefs = (el) => !el.closest("defs, clipPath, mask, pattern, marker, symbol");
  const expanded = [];
  const targetOf = (use) => document.getElementById(use.href.baseVal.slice(1));
  for (let pass = 0; pass < 8; pass++) {
    const uses = [...plate.querySelectorAll("use")].filter((use) => outsideDefs(use) && targetOf(use) && targetOf(use).localName !== "symbol");
    if (!uses.length) break;
    for (const use of uses) {
      const copy = document.createElementNS("http://www.w3.org/2000/svg", "g");
      for (const { name, value } of use.attributes) if (!["href", "xlink:href", "x", "y", "width", "height", "transform"].includes(name)) copy.setAttribute(name, value);
      copy.setAttribute("transform", `${use.getAttribute("transform") || ""} translate(${use.x.baseVal.value} ${use.y.baseVal.value})`);
      const content = targetOf(use).cloneNode(true);
      for (const node of [content, ...content.querySelectorAll("[id]")]) node.removeAttribute("id");
      copy.append(content);
      use.replaceWith(copy);
      expanded.push([copy, use]);
    }
  }
  const skipClass = ["iso-edge", "iso-bevel", "iso-crease", "tb-edge"];
  const svgs = [...(plate.matches("svg") ? [plate] : []), ...plate.querySelectorAll("svg")];
  const shapes = svgs.flatMap((svg) => [...svg.querySelectorAll("path, line, polyline, polygon, circle, ellipse, rect")]).filter(outsideDefs);
  const opacityOf = (el) => {
    let alpha = 1;
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const cs = getComputedStyle(node);
      if (cs.display === "none") return 0;
      alpha *= Number(cs.opacity);
      if (node === plate) break;
    }
    return getComputedStyle(el).visibility === "hidden" ? 0 : alpha;
  };
  const numbers = (text) => (text.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) || []).map(Number);
  const subpathsOf = (d, curveTolerance) => {
    const out = [];
    let current = null;
    let x = 0;
    let y = 0;
    let sx = 0;
    let sy = 0;
    let control = null;
    const push = (px, py) => {
      current.points.push([px, py]);
      x = px;
      y = py;
    };
    const start = (px, py) => {
      current = { points: [[px, py]], closed: false };
      out.push(current);
      x = sx = px;
      y = sy = py;
    };
    let curveBudget = 16384;
    const chordDistance = (point, first, last) => {
      const dx = last[0] - first[0];
      const dy = last[1] - first[1];
      const span = dx * dx + dy * dy;
      const along = span > 0 ? Math.max(0, Math.min(1, ((point[0] - first[0]) * dx + (point[1] - first[1]) * dy) / span)) : 0;
      return Math.hypot(point[0] - first[0] - along * dx, point[1] - first[1] - along * dy);
    };
    const curve = (points) => {
      const pending = [points];
      while (pending.length) {
        if (--curveBudget < 0) throw new Error("Curve audit could not establish its screen-space sampling bound");
        const controlPoints = pending.pop();
        const first = controlPoints[0];
        const last = controlPoints[controlPoints.length - 1];
        if (controlPoints.slice(1, -1).every((point) => chordDistance(point, first, last) <= curveTolerance)) {
          push(...last);
          continue;
        }
        const left = [first];
        const right = [last];
        let level = controlPoints;
        while (level.length > 1) {
          level = level.slice(1).map((point, index) => [(level[index][0] + point[0]) / 2, (level[index][1] + point[1]) / 2]);
          left.push(level[0]);
          right.push(level[level.length - 1]);
        }
        pending.push(right.reverse(), left);
      }
    };
    const cubic = (x1, y1, x2, y2, px, py) => {
      curve([[x, y], [x1, y1], [x2, y2], [px, py]]);
      control = { kind: "cubic", point: [x2, y2] };
    };
    const quad = (x1, y1, px, py) => {
      curve([[x, y], [x1, y1], [px, py]]);
      control = { kind: "quadratic", point: [x1, y1] };
    };
    for (const [, command, args] of d.matchAll(/([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g)) {
      const v = numbers(args);
      const rel = command === command.toLowerCase();
      const C = command.toUpperCase();
      const ox = () => (rel ? x : 0);
      const oy = () => (rel ? y : 0);
      if (C === "Z") {
        if (current) {
          current.closed = true;
          push(sx, sy);
        }
        current = null;
        continue;
      }
      if (C === "M") {
        for (let i = 0; i + 1 < v.length; i += 2) {
          if (i === 0) start(v[0] + ox(), v[1] + oy());
          else push(v[i] + ox(), v[i + 1] + oy());
        }
        control = null;
        continue;
      }
      if (!current) start(x, y);
      if (C === "L") for (let i = 0; i + 1 < v.length; i += 2) push(v[i] + ox(), v[i + 1] + oy());
      else if (C === "H") for (const value of v) push(value + ox(), y);
      else if (C === "V") for (const value of v) push(x, value + oy());
      else if (C === "C") for (let i = 0; i + 5 < v.length; i += 6) cubic(v[i] + ox(), v[i + 1] + oy(), v[i + 2] + ox(), v[i + 3] + oy(), v[i + 4] + ox(), v[i + 5] + oy());
      else if (C === "S")
        for (let i = 0; i + 3 < v.length; i += 4) {
          const reflected = control?.kind === "cubic" ? [2 * x - control.point[0], 2 * y - control.point[1]] : [x, y];
          cubic(reflected[0], reflected[1], v[i] + ox(), v[i + 1] + oy(), v[i + 2] + ox(), v[i + 3] + oy());
        }
      else if (C === "Q") for (let i = 0; i + 3 < v.length; i += 4) quad(v[i] + ox(), v[i + 1] + oy(), v[i + 2] + ox(), v[i + 3] + oy());
      else if (C === "T")
        for (let i = 0; i + 1 < v.length; i += 2) {
          const reflected = control?.kind === "quadratic" ? [2 * x - control.point[0], 2 * y - control.point[1]] : [x, y];
          quad(reflected[0], reflected[1], v[i] + ox(), v[i + 1] + oy());
        }
      else if (C === "A") {
        const arc = document.createElementNS("http://www.w3.org/2000/svg", "path");
        arc.setAttribute("d", `M${x} ${y}${command}${args}`);
        const length = arc.getTotalLength();
        const count = Math.max(8, Math.ceil(length / 2));
        for (let index = 1; index <= count; index++) {
          const point = arc.getPointAtLength(length * index / count);
          push(point.x, point.y);
        }
      }
      if (C !== "C" && C !== "S" && C !== "Q" && C !== "T") control = null;
    }
    return out;
  };
  const geometryOf = (el, curveTolerance) => {
    const tag = el.tagName.toLowerCase();
    const num = (name) => Number(el.getAttribute(name) || 0);
    if (tag === "path") return subpathsOf(el.getAttribute("d") || "", curveTolerance);
    if (tag === "line") return [{ points: [[num("x1"), num("y1")], [num("x2"), num("y2")]], closed: false }];
    if (tag === "polyline" || tag === "polygon") {
      const v = numbers(el.getAttribute("points") || "");
      const points = [];
      for (let i = 0; i + 1 < v.length; i += 2) points.push([v[i], v[i + 1]]);
      if (tag === "polygon" && points.length) points.push(points[0]);
      return [{ points, closed: tag === "polygon" }];
    }
    if (tag === "rect") {
      const [x, y, w, h] = [num("x"), num("y"), num("width"), num("height")];
      const rx = Math.min(w / 2, Math.max(0, el.hasAttribute("rx") ? num("rx") : num("ry")));
      const ry = Math.min(h / 2, Math.max(0, el.hasAttribute("ry") ? num("ry") : num("rx")));
      if (!rx || !ry) return [{ points: [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], closed: true }];
      const points = [];
      for (const [cx, cy, start] of [[x + w - rx, y + ry, -Math.PI / 2], [x + w - rx, y + h - ry, 0], [x + rx, y + h - ry, Math.PI / 2], [x + rx, y + ry, Math.PI]]) {
        for (let index = 0; index <= 32; index++) {
          const angle = start + index * Math.PI / 64;
          points.push([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]);
        }
      }
      points.push(points[0]);
      return [{ points, closed: true }];
    }
    return [];
  };
  const cell = 6;
  const grid = new Map();
  const add = (gx, gy, entry) => {
    const id = `${gx},${gy}`;
    if (!grid.has(id)) grid.set(id, []);
    grid.get(id).push(entry);
  };
  const lines = [];
  let scale = 1;
  for (const el of shapes) {
    const cs = getComputedStyle(el);
    const alpha = opacityOf(el);
    if (alpha < 0.1) continue;
    const ctm = el.getScreenCTM();
    if (!ctm) continue;
    const map = ([px, py]) => [ctm.a * px + ctm.c * py + ctm.e, ctm.b * px + ctm.d * py + ctm.f];
    const tag = el.tagName.toLowerCase();
    const stroked = cs.stroke !== "none" && parseFloat(cs.strokeWidth) > 0 && Number(cs.strokeOpacity) > 0.05;
    const filled = cs.fill !== "none" && Number(cs.fillOpacity) > 0.05;
    if (tag === "circle" || tag === "ellipse") {
      if (!stroked && !filled) continue;
      const cx = Number(el.getAttribute("cx") || 0);
      const cy = Number(el.getAttribute("cy") || 0);
      const rx = Number(el.getAttribute(tag === "circle" ? "r" : "rx") || 0);
      const ry = Number(el.getAttribute(tag === "circle" ? "r" : "ry") || 0);
      if (rx <= 0 || ry <= 0) continue;
      const points = Array.from({ length: 128 }, (_, index) => {
        const angle = index * Math.PI * 2 / 128;
        return map([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]);
      });
      const entry = { el, kind: "round", points, cx, cy, rx, ry, filled };
      const xs = points.map(([x]) => x);
      const ys = points.map(([, y]) => y);
      for (let gx = Math.floor(Math.min(...xs) / cell); gx <= Math.floor(Math.max(...xs) / cell); gx++) for (let gy = Math.floor(Math.min(...ys) / cell); gy <= Math.floor(Math.max(...ys) / cell); gy++) add(gx, gy, entry);
      continue;
    }
    if (!stroked) continue;
    const owner = el.closest("svg");
    const viewCtm = owner && owner.getScreenCTM();
    if (viewCtm) scale = Math.hypot(viewCtm.a, viewCtm.b) || scale;
    const curveTolerance = 0.15 / Math.max(1, Math.hypot(ctm.a, ctm.b, ctm.c, ctm.d));
    const subpaths = geometryOf(el, curveTolerance).map((sub, index) => ({ ...sub, index, flat: sub.points.map(map) }));
    subpaths.forEach((sub) => {
      for (let i = 0; i < sub.flat.length - 1; i++) {
        const a = sub.flat[i];
        const b = sub.flat[i + 1];
        const entry = { el, kind: "segment", a, b, sub: sub.index, i };
        for (let gx = Math.floor(Math.min(a[0], b[0]) / cell); gx <= Math.floor(Math.max(a[0], b[0]) / cell); gx++) for (let gy = Math.floor(Math.min(a[1], b[1]) / cell); gy <= Math.floor(Math.max(a[1], b[1]) / cell); gy++) add(gx, gy, entry);
      }
    });
    const checked = el.classList.contains("iso-line") && !skipClass.some((name) => el.classList.contains(name)) && alpha >= least;
    if (checked) lines.push({ el, subpaths, alpha, free: el.getAttribute("data-free") });
  }
  const near = (p, reach) => {
    const out = new Set();
    for (let gx = Math.floor((p[0] - reach) / cell); gx <= Math.floor((p[0] + reach) / cell); gx++) for (let gy = Math.floor((p[1] - reach) / cell); gy <= Math.floor((p[1] + reach) / cell); gy++) for (const entry of grid.get(`${gx},${gy}`) || []) out.add(entry);
    return out;
  };
  const segmentDistance = (p, a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const span = dx * dx + dy * dy;
    const t = span > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / span)) : 0;
    return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
  };
  const lengthOf = (flat) => flat.reduce((sum, p, i) => (i ? sum + Math.hypot(p[0] - flat[i - 1][0], p[1] - flat[i - 1][1]) : 0), 0);
  const hidden = (el, p) => {
    const stack = document.elementsFromPoint(p[0], p[1]);
    const at = stack.indexOf(el);
    const above = at < 0 ? stack : stack.slice(0, at);
    return above.some((node) => {
      if (!(node instanceof SVGGeometryElement) || node.contains(el)) return false;
      const cs = getComputedStyle(node);
      return cs.fill !== "none" && Number(cs.fillOpacity) * opacityOf(node) >= cover && node.isPointInFill(new DOMPoint(...inverse(node, p)));
    });
  };
  const inverse = (node, p) => {
    const m = node.getScreenCTM().inverse();
    return [m.a * p[0] + m.c * p[1] + m.e, m.b * p[0] + m.d * p[1] + m.f];
  };
  const clearance = (line, sub, end, p, reach) => {
    let best = Infinity;
    const own = sub.flat;
    const skipNear = 2 * reach;
    const along = [0];
    for (let i = 1; i < own.length; i++) along.push(along[i - 1] + Math.hypot(own[i][0] - own[i - 1][0], own[i][1] - own[i - 1][1]));
    const total = along[along.length - 1];
    for (const entry of near(p, reach * 4)) {
      if (entry.kind === "round") {
        const local = inverse(entry.el, p);
        const inside = ((local[0] - entry.cx) / entry.rx) ** 2 + ((local[1] - entry.cy) / entry.ry) ** 2 <= 1;
        if (entry.filled && inside) best = 0;
        else for (let index = 0; index < entry.points.length; index++) best = Math.min(best, segmentDistance(p, entry.points[index], entry.points[(index + 1) % entry.points.length]));
        continue;
      }
      if (entry.el === line.el && entry.sub === sub.index) {
        const from = along[entry.i];
        const to = along[entry.i + 1];
        const gapFrom = end === "start" ? from : total - to;
        if (gapFrom < skipNear) continue;
      }
      best = Math.min(best, segmentDistance(p, entry.a, entry.b));
    }
    return best;
  };
  const describe = (el) => {
    const item = el.closest("[data-part], [data-name], [data-item], .it");
    const tag = item && item !== el ? (item.getAttribute("data-part") || item.getAttribute("data-name") || item.getAttribute("data-item") || `it k ${item.getAttribute("data-k") || ""}`) : "";
    return `${el.getAttribute("class")}${el.getAttribute("data-tone") ? ` ${el.getAttribute("data-tone")}` : ""}${tag ? ` in ${tag}` : ""}`;
  };
  const problems = [];
  let ends = 0;
  const slack = tolerance * scale;
  const rooted = rootSlack * scale;
  for (const line of lines) {
    for (const sub of line.subpaths) {
      if (sub.closed || sub.flat.length < 2) continue;
      const first = sub.flat[0];
      const last = sub.flat[sub.flat.length - 1];
      if (Math.hypot(first[0] - last[0], first[1] - last[1]) < 0.05 * scale) continue;
      const length = lengthOf(sub.flat);
      if (length < 0.2 * scale) continue;
      const result = {};
      for (const [end, p] of [["start", first], ["end", last]]) {
        if (line.free === "" || line.free === "both" || line.free === end) {
          result[end] = 0;
          continue;
        }
        ends++;
        result[end] = hidden(line.el, p) ? 0 : clearance(line, sub, end, p, Math.max(slack, rooted));
      }
      const straight = sub.flat.length === 2 || sub.flat.every((q) => segmentDistance(q, first, last) < 0.15 * scale);
      const isMark = straight && length <= mark * scale;
      const fail = (end) => result[end] !== undefined && result[end] > slack;
      let bad = [];
      if (isMark) {
        const best = Math.min(result.start ?? Infinity, result.end ?? Infinity);
        if (!(best <= rooted)) bad = ["start", "end"].filter((end) => result[end] !== undefined && result[end] > 0);
      } else bad = ["start", "end"].filter(fail);
      for (const end of bad) {
        const p = end === "start" ? first : last;
        problems.push({ what: describe(line.el), d: (line.el.getAttribute("d") || "").slice(0, 36), end, mark: isMark, gap: result[end] / scale, at: [Math.round((p[0] - box.left) * 10) / 10, Math.round((p[1] - box.top) * 10) / 10], client: p, opacity: Math.round(line.alpha * 100) / 100, length: Math.round((length / scale) * 10) / 10 });
      }
    }
  }
  style.remove();
  for (const [copy, use] of expanded.reverse()) copy.replaceWith(use);
  problems.sort((a, b) => b.gap - a.gap);
  if (show) {
    const ns = "http://www.w3.org/2000/svg";
    const overlay = document.createElementNS(ns, "svg");
    overlay.setAttribute("data-line-ends", "");
    overlay.setAttribute("style", `position:fixed;left:0;top:0;width:${innerWidth}px;height:${innerHeight}px;pointer-events:none;z-index:2147483647;overflow:visible`);
    for (const problem of problems) {
      const ring = document.createElementNS(ns, "circle");
      ring.setAttribute("cx", problem.client[0]);
      ring.setAttribute("cy", problem.client[1]);
      ring.setAttribute("r", 5);
      ring.setAttribute("style", "fill:none;stroke:#ff0050;stroke-width:1.5");
      overlay.append(ring);
    }
    document.body.append(overlay);
  }
  return { ends, lines: lines.length, problems: problems.map(({ client, ...rest }) => rest) };
}

export const LINE_ENDS = lineEnds.toString();
