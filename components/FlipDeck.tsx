"use client";

import { useRef, useCallback, useEffect } from "react";
import { useDialKit } from "dialkit";
import ExportFooter from "./ExportFooter";

const CARDS = [
  { src: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&h=1066&fit=crop" },
  { src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=1066&fit=crop" },
  { src: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&h=1066&fit=crop" },
  { src: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=1066&fit=crop" },
  { src: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&h=1066&fit=crop" },
];

const CARD_W = 400;
const CARD_H = 533;
const SLIDE_W = 632;
const CAROUSEL_W = 744;
const CAROUSEL_PAD = 56;

interface FlipDeckValues {
  translateX: number;
  rotateY: number;
  translateZ: number;
  perspective: number;
  overshoot: number;
  zBoost: number;
  borderRadius: number;
  shadowOpacity: number;
  snapSpring: {
    visualDuration?: number;
    bounce?: number;
  };
}

export default function FlipDeck() {
  const values = useDialKit("Flip Deck", {
    translateX: [40, 0, 80],
    rotateY: [25, 0, 45],
    translateZ: [200, 50, 600],
    perspective: [800, 300, 2000],
    overshoot: [30, 0, 60],
    zBoost: [20, 0, 50],
    borderRadius: [16, 0, 48],
    shadowOpacity: [0.6, 0, 1],
    snapSpring: {
      type: "spring" as const,
      visualDuration: 0.4,
      bounce: 0.15,
    },
  }) as unknown as FlipDeckValues;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const valuesRef = useRef(values);

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  const animateSnap = useCallback((targetScroll: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const v = valuesRef.current;
    const spring = v.snapSpring;
    const duration = (spring?.visualDuration ?? 0.4) * 1000;
    const bounce = spring?.bounce ?? 0.15;
    const start = scroller.scrollLeft;
    const delta = targetScroll - start;
    if (Math.abs(delta) < 1) return;
    const startTime = performance.now();
    const omega = (2 * Math.PI) / (duration / 1000);
    const damping = 1 - bounce;
    const step = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const t = Math.min(elapsed / (duration / 1000), 1);
      const decay = Math.exp(-damping * omega * elapsed);
      const osc = 1 - decay * Math.cos(omega * Math.sqrt(1 - damping * damping) * elapsed);
      scroller.scrollLeft = start + delta * Math.min(osc, 1);
      if (t < 1) requestAnimationFrame(step);
      else scroller.scrollLeft = targetScroll;
    };
    requestAnimationFrame(step);
  }, []);

  const updateCards = useCallback(() => {
    const scroller = scrollerRef.current;
    const stack = stackRef.current;
    if (!scroller || !stack) return;
    const scrollLeft = scroller.scrollLeft;
    const v = valuesRef.current;
    const cards = stack.children;
    for (let i = 0; i < CARDS.length; i++) {
      const el = cards[i] as HTMLElement;
      if (!el) continue;
      const progress = (scrollLeft / SLIDE_W) - i;
      const distance = Math.abs(progress);
      if (distance < 0.001) {
        el.style.transform = "translateZ(0.1px)";
        el.style.opacity = "1";
        el.style.visibility = "visible";
        continue;
      }
      const dir = progress > 0 ? -1 : 1;
      const isBehind = progress > 0;
      let tx: number;
      if (distance < 1) {
        const t = distance;
        tx = dir * (v.translateX * t + v.overshoot * Math.sin(Math.PI * t));
      } else { tx = dir * v.translateX; }
      let tz = -v.translateZ * distance;
      if (distance < 1) {
        const boost = v.zBoost * Math.sin(Math.PI * distance);
        tz += isBehind ? -boost : boost;
      }
      const ry = -dir * v.rotateY * Math.min(distance, 1);
      el.style.transform = `translateX(${tx.toFixed(1)}%) translateZ(${tz.toFixed(0)}px) rotateY(${ry.toFixed(1)}deg)`;
      let vis: number;
      if (distance <= 1) vis = 1;
      else if (distance <= 2) vis = Math.max(0, 2 - distance);
      else vis = 0;
      el.style.opacity = String(vis);
      el.style.visibility = vis > 0 ? "visible" : "hidden";
    }
  }, []);

  const handleScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateCards);
  }, [updateCards]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let isDown = false, startX = 0, scrollStart = 0, lastX = 0, lastTime = 0, velocity = 0;
    const onDown = (e: PointerEvent) => {
      isDown = true; startX = e.clientX; lastX = e.clientX;
      lastTime = Date.now(); velocity = 0; scrollStart = scroller.scrollLeft;
      scroller.setPointerCapture(e.pointerId); scroller.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!isDown) return; e.preventDefault();
      const now = Date.now(), dt = now - lastTime;
      if (dt > 0) velocity = (e.clientX - lastX) / dt;
      lastX = e.clientX; lastTime = now;
      scroller.scrollLeft = scrollStart - (e.clientX - startX);
    };
    const onUp = (e: PointerEvent) => {
      if (!isDown) return; isDown = false;
      scroller.releasePointerCapture(e.pointerId); scroller.style.cursor = "grab";
      const cur = scroller.scrollLeft / SLIDE_W, base = Math.round(scrollStart / SLIDE_W);
      let target: number;
      if (Math.abs(velocity) > 0.3) target = velocity < 0 ? base + 1 : base - 1;
      else if (Math.abs(cur - base) > 0.2) target = cur > base ? base + 1 : base - 1;
      else target = base;
      target = Math.min(Math.max(target, 0), CARDS.length - 1);
      animateSnap(target * SLIDE_W);
    };
    scroller.addEventListener("pointerdown", onDown);
    scroller.addEventListener("pointermove", onMove);
    scroller.addEventListener("pointerup", onUp);
    scroller.addEventListener("pointercancel", onUp);
    return () => {
      scroller.removeEventListener("pointerdown", onDown);
      scroller.removeEventListener("pointermove", onMove);
      scroller.removeEventListener("pointerup", onUp);
      scroller.removeEventListener("pointercancel", onUp);
    };
  }, [animateSnap]);

  useEffect(() => { updateCards(); }, [values, updateCards]);

  const getCode = useCallback(() => {
    const v = valuesRef.current;
    const s = v.snapSpring;
    return `Build a 3D card flipbook component (React/Next.js).

ARCHITECTURE:
Two layers overlapping in a CSS grid cell (grid-area: 1/1):
1. Carousel (input layer) — full-width, overflow-x: auto, invisible slides (${SLIDE_W}px each, opacity: 0). Captures pointer drag + scroll.
2. Stack (visual layer) — ${CARD_W}px wide centered, pointer-events: none, perspective: ${v.perspective}px, transform-style: preserve-3d. All cards overlap via grid-area: 1/1.

TUNED PARAMETERS:
- Card: ${CARD_W}×${CARD_H}px, border-radius: ${v.borderRadius}px
- Slide width: ${SLIDE_W}px, carousel width: ${CAROUSEL_W}px, padding: ${CAROUSEL_PAD}px
- Shadow opacity: ${v.shadowOpacity}
- Snap spring: duration ${s?.visualDuration ?? 0.4}s, bounce ${s?.bounce ?? 0.15}

TRANSFORM FORMULA (per card, scroll-driven):
  progress = scrollLeft / ${SLIDE_W} - cardIndex
  // 0 = active, >0 = behind, <0 = ahead
  distance = abs(progress)
  direction = progress > 0 ? -1 : 1

  Active card (distance < 0.001):
    transform: translateZ(0.1px)

  Transitioning (distance < 1):
    translateX = direction * (${v.translateX} * t + ${v.overshoot} * sin(π * t))
      → peaks at ~${v.translateX + v.overshoot}% at midpoint, settles to ${v.translateX}% at rest
    translateZ = -${v.translateZ} * distance ± ${v.zBoost} * sin(π * distance)
      → ±${v.zBoost}px Z-boost separates arriving/departing cards at crossover
    rotateY = -direction * ${v.rotateY} * min(distance, 1)

  At rest (distance ≥ 1):
    translateX = direction * ${v.translateX}%
    translateZ = -${v.translateZ} * distance
    rotateY = -direction * ${v.rotateY}deg

VISIBILITY:
  distance ≤ 1: opacity 1
  distance 1-2: opacity = 2 - distance (fade out)
  distance > 2: hidden

SNAP BEHAVIOR:
  Pointer drag with velocity tracking. Flick > 0.3px/ms advances card.
  Drag > 20% of slide width commits. Otherwise snap back.
  Animate snap with damped spring (duration ${s?.visualDuration ?? 0.4}s, bounce ${s?.bounce ?? 0.15}).

PERFORMANCE:
  Use refs + direct DOM manipulation (el.style.transform). No React state in scroll handler.
  requestAnimationFrame on scroll events. No CSS scroll-snap — JS snap only.

CSS:
.stack { perspective: ${v.perspective}px; transform-style: preserve-3d; }
.card { border-radius: ${v.borderRadius}px; box-shadow: 0 21px 13px rgba(0,0,0,${(0.06*v.shadowOpacity).toFixed(2)}), 0 9px 9px rgba(0,0,0,${(0.1*v.shadowOpacity).toFixed(2)}), 0 2px 5px rgba(0,0,0,${(0.11*v.shadowOpacity).toFixed(2)}); }`;
  }, []);

  return (
    <>
      <div style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="grid place-items-center" style={{ width: CAROUSEL_W, maxWidth: "100vw" }}>
          <div ref={scrollerRef} onScroll={handleScroll} style={{ gridArea: "1/1", width: "100%", height: CARD_H, overflowX: "auto", overflowY: "hidden", cursor: "grab", zIndex: 2, scrollbarWidth: "none", msOverflowStyle: "none", padding: `0 ${CAROUSEL_PAD}px`, scrollPadding: `0 ${CAROUSEL_PAD}px` }}>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${CARDS.length}, ${SLIDE_W}px)`, height: "100%" }}>
              {CARDS.map((_, i) => <div key={i} style={{ width: SLIDE_W, opacity: 0, pointerEvents: "auto" }} />)}
            </div>
          </div>
          <div ref={stackRef} style={{ gridArea: "1/1", width: CARD_W, height: CARD_H, perspective: `${values.perspective}px`, transformStyle: "preserve-3d", pointerEvents: "none", display: "grid", justifySelf: "center" }}>
            {CARDS.map((card, i) => (
              <div key={i} style={{ gridArea: "1/1", width: CARD_W, height: CARD_H, transformStyle: "preserve-3d", position: "relative" }}>
                <div style={{ borderRadius: values.borderRadius, boxShadow: `0 21px 13px rgba(0,0,0,${0.06*values.shadowOpacity}), 0 9px 9px rgba(0,0,0,${0.1*values.shadowOpacity}), 0 2px 5px rgba(0,0,0,${0.11*values.shadowOpacity})`, width: CARD_W, height: CARD_H, position: "absolute", inset: 0 }} />
                <div style={{ borderRadius: values.borderRadius, overflow: "hidden", width: CARD_W, height: CARD_H }}>
                  <img src={card.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none", userSelect: "none" }} draggable={false} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <ExportFooter getCode={getCode} />
      <style>{`div::-webkit-scrollbar { display: none; }`}</style>
    </>
  );
}
