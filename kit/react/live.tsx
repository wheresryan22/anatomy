"use client";

import * as React from "react";

const STILLNESS = "(prefers-reduced-motion: reduce)";
const MARGIN = "120px 0px";
const LONGEST_FRAME = 1 / 30;

export const asksForStillness = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(STILLNESS).matches;

export function useStillness() {
  return React.useSyncExternalStore(
    (changed) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
      const query = window.matchMedia(STILLNESS);
      query.addEventListener("change", changed);
      return () => query.removeEventListener("change", changed);
    },
    asksForStillness,
    () => false,
  );
}

export function useInView<T extends Element>(ref: React.RefObject<T | null>) {
  const [inView, setInView] = React.useState(false);
  const watched = React.useRef<Element | null>(null);
  const observer = React.useRef<IntersectionObserver | null>(null);
  React.useEffect(() => {
    const node = ref.current;
    if (node === watched.current) return;
    observer.current?.disconnect();
    observer.current = null;
    watched.current = node;
    setInView(false);
    if (!node) return;
    const binding = new IntersectionObserver((entries) => {
      if (watched.current === node && observer.current === binding) setInView(Boolean(entries.at(-1)?.isIntersecting));
    }, { rootMargin: MARGIN });
    observer.current = binding;
    binding.observe(node);
  });
  React.useEffect(() => () => {
    observer.current?.disconnect();
    observer.current = null;
    watched.current = null;
  }, []);
  return inView;
}

export function Stage({ className, children }: { className: string; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  return (
    <div ref={ref} className={className} data-inview={inView ? "" : undefined}>
      {children}
    </div>
  );
}

export function useReadout<T extends Element>() {
  const anchor = React.useRef<T>(null);
  const say = React.useCallback((text: string) => {
    const slot = anchor.current?.closest(".iso-plate")?.querySelector("[data-readout]");
    if (slot && slot.textContent !== text) slot.textContent = text;
  }, []);
  return { anchor, say };
}

export function useLoop(tick: (dt: number, calm: boolean) => boolean, running: boolean) {
  const latest = React.useRef(tick);
  latest.current = tick;
  const frame = React.useRef(0);
  const last = React.useRef(0);
  const kick = React.useCallback(() => {
    if (frame.current) return;
    last.current = 0;
    const step = (now: number) => {
      const dt = last.current ? Math.min((now - last.current) / 1000, LONGEST_FRAME) : 1 / 60;
      last.current = now;
      const more = latest.current(dt, asksForStillness());
      frame.current = more ? requestAnimationFrame(step) : 0;
    };
    frame.current = requestAnimationFrame(step);
  }, []);
  React.useEffect(() => {
    if (running) kick();
    else {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    }
    return () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [running, kick]);
  return kick;
}

export function follow(current: number, target: number, dt: number, seconds: number, calm = false) {
  if (calm) return target;
  const next = current + (target - current) * (1 - Math.exp(-dt / seconds));
  return Math.abs(target - next) < 1e-3 ? target : next;
}

export interface Spring {
  at: number;
  rate: number;
}

export function spring(state: Spring, target: number, dt: number, stiffness: number, damping: number, calm = false) {
  const drag = calm ? 2 * Math.sqrt(stiffness) : damping;
  const steps = Math.max(Math.ceil(dt * 240), 1);
  const slice = dt / steps;
  for (let step = 0; step < steps; step++) {
    state.rate += (target - state.at) * stiffness * slice - state.rate * drag * slice;
    state.at += state.rate * slice;
  }
  if (Math.abs(target - state.at) < 5e-4 && Math.abs(state.rate) < 5e-4) {
    state.at = target;
    state.rate = 0;
  }
  return state.at === target && state.rate === 0;
}

export function useEased(target: number, seconds = 0.12) {
  const [value, setValue] = React.useState(target);
  const shown = React.useRef(target);
  useLoop((dt, calm) => {
    shown.current = follow(shown.current, target, dt, seconds, calm);
    setValue(shown.current);
    return shown.current !== target;
  }, shown.current !== target);
  return value;
}
