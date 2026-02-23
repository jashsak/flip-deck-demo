"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useDialKit } from "dialkit";

const CARDS = [
  {
    src: "https://images.unsplash.com/photo-1493397212122-2b85dda8106b?w=800&h=1066&fit=crop",
    label: "Architecture",
  },
  {
    src: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&h=1066&fit=crop",
    label: "Coastline",
  },
  {
    src: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&h=1066&fit=crop",
    label: "Abstract",
  },
  {
    src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=1066&fit=crop",
    label: "Portrait",
  },
  {
    src: "https://images.unsplash.com/photo-1470756544705-1848092fbe5f?w=800&h=1066&fit=crop",
    label: "Botanical",
  },
];

const CARD_W = 400;
const CARD_H = 533;

/**
 * Collins-style flipbook.
 *
 * Layout: a CSS grid with two children overlapping in the same cell:
 *   1. carousel (full-width, overflow-x: auto, invisible slides) — captures all input
 *   2. stack (centered, 400px wide, pointer-events: none) — renders the 3D cards
 *
 * The carousel's scrollLeft drives the stack's transforms via scroll events + rAF.
 * Scroll snap is disabled; we implement snap manually on pointerup/touchend
 * with smooth scrollTo, matching Collins' blossom-carousel behavior.
 */
export default function FlipDeck() {
  const values = useDialKit("Flip Deck", {
    rotateY: [25, 0, 45],
    translateZ: [200, 50, 600],
    translateX: [25, 0, 50],
    perspective: [800, 300, 2000],
    borderRadius: [16, 0, 48],
    shadowOpacity: [0.6, 0, 1],
    midSpreadX: [48, 20, 70],
    midSpreadZ: [100, 20, 300],
    midRotateY: [20, 0, 40],
  }) as any as {
    rotateY: number;
    translateZ: number;
    translateX: number;
    perspective: number;
    borderRadius: number;
    shadowOpacity: number;
    midSpreadX: number;
    midSpreadZ: number;
    midRotateY: number;
  };

  const scrollerRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [activeLabel, setActiveLabel] = useState(CARDS[0].label);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  // Direct DOM manipulation for performance — no React state for card styles
  const updateCards = useCallback(() => {
    const scroller = scrollerRef.current;
    const stack = stackRef.current;
    if (!scroller || !stack) return;

    const slideWidth = scroller.scrollWidth / CARDS.length;
    const fractionalIndex = scroller.scrollLeft / slideWidth;
    const v = valuesRef.current;

    const cards = stack.children;
    for (let i = 0; i < CARDS.length; i++) {
      const el = cards[i] as HTMLElement;
      if (!el) continue;

      const offset = i - fractionalIndex;
      const absOffset = Math.abs(offset);
      const sign = offset >= 0 ? 1 : -1;

      if (absOffset > 2.5) {
        el.style.transform = `translateX(${sign * v.translateX}%) translateZ(${-v.translateZ * 2.5}px) rotateY(${-sign * v.rotateY}deg)`;
        el.style.opacity = "0";
        el.style.visibility = "hidden";
        continue;
      }

      if (absOffset < 0.01) {
        el.style.transform = "none";
        el.style.opacity = "1";
        el.style.visibility = "visible";
        el.style.zIndex = "10";
        continue;
      }

      let tx: number, tz: number, ry: number, opacity: number;

      if (absOffset <= 0.5) {
        const t = absOffset / 0.5;
        tx = sign * lerp(0, v.midSpreadX, t);
        tz = -lerp(0, v.midSpreadZ, t);
        ry = -sign * lerp(0, v.midRotateY, t);
        opacity = lerp(1, 0, t);
      } else if (absOffset <= 1) {
        const t = (absOffset - 0.5) / 0.5;
        tx = sign * lerp(v.midSpreadX, v.translateX, t);
        tz = -lerp(v.midSpreadZ, v.translateZ, t);
        ry = -sign * lerp(v.midRotateY, v.rotateY, t);
        opacity = 0;
      } else {
        tx = sign * v.translateX;
        tz = -(v.translateZ * absOffset);
        ry = -sign * v.rotateY;
        opacity = 0;
      }

      el.style.transform = `translateX(${tx}%) translateZ(${tz}px) rotateY(${ry}deg)`;
      el.style.opacity = String(opacity);
      el.style.visibility = absOffset <= 2 ? "visible" : "hidden";
      el.style.zIndex = String(Math.round(10 - absOffset * 2));
    }

    const nearest = Math.round(fractionalIndex);
    const label = CARDS[Math.min(Math.max(nearest, 0), CARDS.length - 1)].label;
    setActiveLabel(label);
  }, []);

  const handleScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateCards);
  }, [updateCards]);

  // Manual snap on drag end (Collins disables CSS snap, uses JS snap)
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let isDown = false;
    let startX = 0;
    let scrollStart = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDown = true;
      startX = e.clientX;
      scrollStart = scroller.scrollLeft;
      scroller.setPointerCapture(e.pointerId);
      scroller.style.cursor = "grabbing";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const dx = e.clientX - startX;
      scroller.scrollLeft = scrollStart - dx;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDown) return;
      isDown = false;
      scroller.releasePointerCapture(e.pointerId);
      scroller.style.cursor = "grab";

      // Snap to nearest card
      const slideWidth = scroller.scrollWidth / CARDS.length;
      const nearest = Math.round(scroller.scrollLeft / slideWidth);
      const target = Math.min(Math.max(nearest, 0), CARDS.length - 1);
      scroller.scrollTo({
        left: target * slideWidth,
        behavior: "smooth",
      });
    };

    scroller.addEventListener("pointerdown", onPointerDown);
    scroller.addEventListener("pointermove", onPointerMove);
    scroller.addEventListener("pointerup", onPointerUp);
    scroller.addEventListener("pointercancel", onPointerUp);

    return () => {
      scroller.removeEventListener("pointerdown", onPointerDown);
      scroller.removeEventListener("pointermove", onPointerMove);
      scroller.removeEventListener("pointerup", onPointerUp);
      scroller.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  // Initial render + update on values change
  useEffect(() => {
    updateCards();
  }, [values, updateCards]);

  return (
    <div
      className="grid place-items-center w-full"
      style={{ maxWidth: "100vw" }}
    >
      {/* Invisible scroll carousel — full width, captures all input */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        style={{
          gridArea: "1 / 1",
          width: "100%",
          height: CARD_H + 60,
          overflowX: "auto",
          overflowY: "hidden",
          cursor: "grab",
          zIndex: 2,
          // Hide scrollbar
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${CARDS.length}, 80vw)`,
            height: "100%",
          }}
        >
          {CARDS.map((_, i) => (
            <div
              key={i}
              style={{
                opacity: 0,
                scrollSnapAlign: "center",
              }}
            />
          ))}
        </div>
      </div>

      {/* Visual 3D stack — centered, no pointer events */}
      <div
        ref={stackRef}
        style={{
          gridArea: "1 / 1",
          width: CARD_W,
          height: CARD_H + 60,
          perspective: `${values.perspective}px`,
          transformStyle: "preserve-3d",
          pointerEvents: "none",
          display: "grid",
        }}
      >
        {CARDS.map((card, i) => (
          <div
            key={i}
            style={{
              gridArea: "1 / 1",
              width: CARD_W,
              height: CARD_H,
              alignSelf: "start",
            }}
          >
            {/* Shadow layer */}
            <div
              className="absolute inset-0"
              style={{
                borderRadius: values.borderRadius,
                boxShadow: `
                  0px 21px 13px 0px rgba(0,0,0,0.06),
                  0px 9px 9px 0px rgba(0,0,0,0.1),
                  0px 2px 5px 0px rgba(0,0,0,0.11)
                `,
                opacity: 0.5,
                width: CARD_W,
                height: CARD_H,
                position: "absolute",
              }}
            />
            {/* Card cover */}
            <div
              style={{
                borderRadius: values.borderRadius,
                overflow: "hidden",
                width: CARD_W,
                height: CARD_H,
              }}
            >
              <img
                src={card.src}
                alt={card.label}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
                draggable={false}
              />
            </div>
            {/* Card label */}
            <p
              style={{
                textAlign: "center",
                marginTop: 12,
                fontFamily: "var(--font-playfair), serif",
                color: "var(--foreground)",
                fontSize: 16,
                letterSpacing: "0.02em",
              }}
            >
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* Hide scrollbar */}
      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
