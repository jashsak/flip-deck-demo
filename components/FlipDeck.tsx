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
 * Collins-style flipbook: a hidden horizontal scroll carousel drives
 * continuous 3D transforms on a stacked set of cards.
 *
 * Architecture:
 * 1. A hidden <div> with overflow-x: auto holds N "slides" (each slide = 1 card width).
 *    The user drags/scrolls this element (it's invisible but covers the stack).
 * 2. On each scroll event (via rAF), we compute a fractional "activeIndex" from scrollLeft.
 * 3. Each card's transform/opacity is derived from its distance to that fractional index.
 *
 * Collins reference values (from source inspection):
 * - Center card: transform: none, opacity: 1
 * - ±1 neighbor: translateX(±25%) translateZ(-200px) rotateY(∓25deg), opacity: 0
 * - ±2: translateZ(-400px), opacity: 0, visibility: hidden
 * - Halfway between cards: both at ±48% translateX, -100px Z, ±20deg rotateY
 * - Perspective: 800px on the stack container
 * - Cards stack via grid-area: 1/1 (all overlap)
 */
export default function FlipDeck() {
  const values = useDialKit("Flip Deck", {
    // 3D positioning
    rotateY: [25, 0, 45],
    translateZ: [200, 50, 600],
    translateX: [25, 0, 50],
    perspective: [800, 300, 2000],

    // Card appearance
    borderRadius: [16, 0, 48],
    shadowOpacity: [0.6, 0, 1],

    // Halfway spread — how far cards fan out at the midpoint
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
  const [cardStyles, setCardStyles] = useState<CardStyle[]>(() =>
    CARDS.map((_, i) => computeCardStyle(i, 0, values))
  );
  const [activeLabel, setActiveLabel] = useState(CARDS[0].label);
  const rafRef = useRef<number>(0);

  // Scroll handler — runs on every scroll event via rAF
  const handleScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const slideWidth = scroller.scrollWidth / CARDS.length;
      const fractionalIndex = scroller.scrollLeft / slideWidth;

      const styles = CARDS.map((_, i) =>
        computeCardStyle(i, fractionalIndex, values)
      );
      setCardStyles(styles);

      // Update label based on nearest card
      const nearest = Math.round(fractionalIndex);
      setActiveLabel(CARDS[Math.min(nearest, CARDS.length - 1)].label);
    });
  }, [values]);

  // Recompute on values change
  useEffect(() => {
    handleScroll();
  }, [handleScroll]);

  return (
    <div className="relative select-none" style={{ width: CARD_W }}>
      {/* The visual 3D stack */}
      <div
        className="grid"
        style={{
          perspective: `${values.perspective}px`,
          transformStyle: "preserve-3d",
          width: CARD_W,
          height: CARD_H + 53, // card + label space
        }}
      >
        {CARDS.map((card, i) => {
          const s = cardStyles[i];
          return (
            <div
              key={i}
              className="col-start-1 row-start-1 relative"
              style={{
                width: CARD_W,
                height: CARD_H,
                gridArea: "1 / 1",
                transform: s.transform,
                opacity: s.opacity,
                visibility: s.visibility,
                transition: "none", // scroll-driven, no CSS transitions
                zIndex: s.zIndex,
              }}
            >
              {/* Shadow layer */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  borderRadius: values.borderRadius,
                  boxShadow: `
                    0px 21px 13px 0px rgba(0,0,0,0.06),
                    0px 9px 9px 0px rgba(0,0,0,0.1),
                    0px 2px 5px 0px rgba(0,0,0,0.11)
                  `,
                  opacity: s.shadowOpacity,
                }}
              />
              {/* Card cover */}
              <div
                className="w-full overflow-hidden"
                style={{
                  borderRadius: values.borderRadius,
                  height: CARD_H,
                }}
              >
                <img
                  src={card.src}
                  alt={card.label}
                  className="w-full h-full object-cover pointer-events-none"
                  draggable={false}
                />
              </div>
              {/* Card label */}
              <p
                className="text-center mt-3 text-base tracking-wide"
                style={{
                  fontFamily: "var(--font-playfair), serif",
                  color: "var(--foreground)",
                  opacity: s.labelOpacity,
                }}
              >
                {card.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Hidden scroll driver — overlays the stack, captures drag/scroll */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="absolute inset-0"
        style={{
          overflowX: "auto",
          overflowY: "hidden",
          scrollSnapType: "x mandatory",
          // Make scrollbar invisible
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
          cursor: "grab",
          zIndex: 20,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${CARDS.length}, ${CARD_W}px)`,
            height: "100%",
          }}
        >
          {CARDS.map((_, i) => (
            <div
              key={i}
              style={{
                width: CARD_W,
                scrollSnapAlign: "center",
              }}
            />
          ))}
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-2">
        {CARDS.map((_, i) => {
          const s = cardStyles[i];
          return (
            <button
              key={i}
              onClick={() => {
                const scroller = scrollerRef.current;
                if (!scroller) return;
                const slideWidth = scroller.scrollWidth / CARDS.length;
                scroller.scrollTo({
                  left: i * slideWidth,
                  behavior: "smooth",
                });
              }}
              className="w-2 h-2 rounded-full transition-colors duration-300"
              style={{
                background:
                  s.opacity > 0.5 ? "var(--foreground)" : "var(--muted)",
                opacity: s.opacity > 0.5 ? 1 : 0.4,
              }}
            />
          );
        })}
      </div>

      {/* Hide scrollbar */}
      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

interface CardStyle {
  transform: string;
  opacity: number;
  visibility: "visible" | "hidden";
  zIndex: number;
  shadowOpacity: number;
  labelOpacity: number;
}

/**
 * Compute a card's 3D style based on its distance from the fractional active index.
 *
 * Collins interpolation (observed from scroll positions 0, 316, 632):
 * - At offset 0 (center): transform: none, opacity: 1
 * - At offset 0.5 (halfway): translateX(±48%), translateZ(-100px), rotateY(±20deg), opacity: 0
 * - At offset 1.0 (neighbor): translateX(±25%), translateZ(-200px), rotateY(±25deg), opacity: 0
 * - At offset 2.0+: translateZ(-400px+), visibility: hidden
 *
 * The halfway state is interesting: cards spread WIDER (48%) but are CLOSER in Z (-100px)
 * and have LESS rotation (20deg) than the resting neighbor state (25%, -200px, 25deg).
 * This creates the "fanning out" feel during the swipe.
 */
function computeCardStyle(
  cardIndex: number,
  fractionalIndex: number,
  v: any
): CardStyle {
  const offset = cardIndex - fractionalIndex; // negative = card is to the left
  const absOffset = Math.abs(offset);
  const sign = offset >= 0 ? 1 : -1;

  // Cards beyond 2 positions away are hidden
  if (absOffset > 2.5) {
    return {
      transform: `translateX(${sign * v.translateX}%) translateZ(${-v.translateZ * 2.5}px) rotateY(${-sign * v.rotateY}deg)`,
      opacity: 0,
      visibility: "hidden",
      zIndex: 0,
      shadowOpacity: 0,
      labelOpacity: 0,
    };
  }

  // Center card (offset ~0)
  if (absOffset < 0.01) {
    return {
      transform: "none",
      opacity: 1,
      visibility: "visible",
      zIndex: 10,
      shadowOpacity: v.shadowOpacity,
      labelOpacity: 1,
    };
  }

  // Interpolation:
  // Collins uses a non-linear path:
  // offset 0→0.5: card fans OUT (wider X, shallow Z, moderate rotation)
  // offset 0.5→1: card tucks IN (narrower X, deeper Z, full rotation)

  let tx: number, tz: number, ry: number, opacity: number;

  if (absOffset <= 0.5) {
    // Phase 1: fanning out. Lerp from center to mid-spread.
    const t = absOffset / 0.5; // 0→1 over this phase
    tx = sign * lerp(0, v.midSpreadX, t);
    tz = -lerp(0, v.midSpreadZ, t);
    ry = -sign * lerp(0, v.midRotateY, t);
    opacity = lerp(1, 0, t);
  } else if (absOffset <= 1) {
    // Phase 2: tucking in. Lerp from mid-spread to neighbor rest.
    const t = (absOffset - 0.5) / 0.5; // 0→1 over this phase
    tx = sign * lerp(v.midSpreadX, v.translateX, t);
    tz = -lerp(v.midSpreadZ, v.translateZ, t);
    ry = -sign * lerp(v.midRotateY, v.rotateY, t);
    opacity = 0;
  } else {
    // Beyond 1: deeper in stack
    tx = sign * v.translateX;
    tz = -(v.translateZ * absOffset);
    ry = -sign * v.rotateY;
    opacity = 0;
  }

  return {
    transform: `translateX(${tx}%) translateZ(${tz}px) rotateY(${ry}deg)`,
    opacity,
    visibility: absOffset <= 2 ? "visible" : "hidden",
    zIndex: Math.round(10 - absOffset * 2),
    shadowOpacity: absOffset <= 1 ? v.shadowOpacity * (1 - absOffset) : 0,
    labelOpacity: absOffset < 0.3 ? 1 - absOffset / 0.3 : 0,
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
