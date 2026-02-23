"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useMotionValueEvent,
  type PanInfo,
} from "motion/react";
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

// Card width used for calculating drag-as-fraction
const CARD_W = 400;

export default function FlipDeck() {
  const [activeIndex, setActiveIndex] = useState(0);

  const values = useDialKit("Flip Deck", {
    spring: { type: "spring" as const, visualDuration: 0.5, bounce: 0.15 },

    rotateY: [25, 0, 45],
    translateZ: [200, 50, 600],
    translateX: [25, 0, 50],
    perspective: [1500, 500, 3000],

    borderRadius: [16, 0, 48],
    shadowOpacity: [0.6, 0, 1],

    dragThreshold: [100, 30, 300],

    tiltOnDrag: true,
    tiltAngle: [10, 0, 30],

    // @ts-expect-error DialKit action type
    reset: () => {
      setActiveIndex(0);
      animate(dragX, 0, { type: "spring", visualDuration: 0.2, bounce: 0 });
    },
  }) as any as {
    spring: { type: "spring"; visualDuration: number; bounce: number };
    rotateY: number;
    translateZ: number;
    translateX: number;
    perspective: number;
    borderRadius: number;
    shadowOpacity: number;
    dragThreshold: number;
    tiltOnDrag: boolean;
    tiltAngle: number;
  };

  // dragX represents the raw pixel drag of the active card.
  // We convert it to a fractional "progress" value where
  // -1 = fully swiped left (next card), +1 = fully swiped right (prev card).
  const dragX = useMotionValue(0);
  const progress = useTransform(dragX, [-CARD_W, 0, CARD_W], [-1, 0, 1]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = values.dragThreshold;
      const velocity = info.velocity.x;
      const offset = info.offset.x;

      let newIndex = activeIndex;

      if (offset < -threshold || velocity < -500) {
        newIndex = Math.min(activeIndex + 1, CARDS.length - 1);
      } else if (offset > threshold || velocity > 500) {
        newIndex = Math.max(activeIndex - 1, 0);
      }

      setActiveIndex(newIndex);
      animate(dragX, 0, {
        type: "spring",
        visualDuration: values.spring.visualDuration,
        bounce: values.spring.bounce,
      });
    },
    [activeIndex, values.dragThreshold, values.spring, dragX]
  );

  return (
    <div className="relative select-none">
      <div
        className="relative"
        style={{
          perspective: `${values.perspective}px`,
          width: CARD_W,
          height: 533,
        }}
      >
        {CARDS.map((card, i) => (
          <CardItem
            key={i}
            card={card}
            index={i}
            activeIndex={activeIndex}
            dragX={dragX}
            progress={progress}
            values={values}
            isActive={i === activeIndex}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>

      {/* Label */}
      <p
        className="text-center mt-6 text-lg tracking-wide"
        style={{
          fontFamily: "var(--font-playfair), serif",
          color: "var(--foreground)",
          opacity: 0.8,
        }}
      >
        {CARDS[activeIndex].label}
      </p>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-4">
        {CARDS.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setActiveIndex(i);
              animate(dragX, 0, { type: "spring", visualDuration: 0.2, bounce: 0 });
            }}
            className="w-2 h-2 rounded-full transition-all duration-300"
            style={{
              background: i === activeIndex ? "var(--foreground)" : "var(--muted)",
              opacity: i === activeIndex ? 1 : 0.4,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Each card computes its own transforms from the shared `progress` motion value.
 * This means ALL cards update continuously as the user drags — not just on release.
 */
function CardItem({
  card,
  index,
  activeIndex,
  dragX,
  progress,
  values,
  isActive,
  onDragEnd,
}: {
  card: (typeof CARDS)[number];
  index: number;
  activeIndex: number;
  dragX: any;
  progress: any;
  values: any;
  isActive: boolean;
  onDragEnd: (e: any, info: PanInfo) => void;
}) {
  // The "slot" this card occupies relative to center.
  // When progress = 0, slot = index - activeIndex.
  // When progress = -1 (swiped left), effectively slot shifts by +1.
  // When progress = +1 (swiped right), slot shifts by -1.
  const baseOffset = index - activeIndex;

  // Continuous slot position: how far this card is from center, accounting for drag.
  // slot = baseOffset + progress (because dragging left = progress goes negative = cards shift right)
  const slot = useTransform(progress, (p: number) => baseOffset + p);

  // Now derive all transforms from `slot`
  const x = useTransform(slot, (s: number) => {
    if (Math.abs(s) < 0.01) return 0;
    const sign = s > 0 ? 1 : -1;
    const magnitude = Math.min(Math.abs(s), 2);
    return sign * magnitude * values.translateX * (CARD_W / 100);
  });

  const z = useTransform(slot, (s: number) => {
    const magnitude = Math.min(Math.abs(s), 2);
    return -magnitude * values.translateZ;
  });

  const rotateY = useTransform(slot, (s: number) => {
    if (Math.abs(s) < 0.01) return 0;
    const sign = s > 0 ? 1 : -1;
    const magnitude = Math.min(Math.abs(s), 2);
    // Note: sign is OPPOSITE — left cards rotate positively (face right)
    return -sign * magnitude * values.rotateY;
  });

  const opacity = useTransform(slot, (s: number) => {
    const abs = Math.abs(s);
    if (abs > 2) return 0;
    if (abs > 1) return Math.max(0, 1 - (abs - 1)) * 0.7;
    if (abs < 0.01) return 1;
    // Interpolate between 1 (center) and 0.7 (one step away)
    return 1 - abs * 0.3;
  });

  const zIndex = useTransform(slot, (s: number) => {
    return Math.round(10 - Math.abs(s) * 2);
  });

  const visibility = useTransform(slot, (s: number) =>
    Math.abs(s) > 2.5 ? "hidden" : "visible"
  );

  // Tilt only the active card during drag
  const rotateX = useTransform(dragX, [-300, 0, 300], [
    values.tiltOnDrag ? values.tiltAngle : 0,
    0,
    values.tiltOnDrag ? -values.tiltAngle : 0,
  ]);

  return (
    <motion.div
      className="absolute inset-0"
      drag={isActive ? "x" : false}
      dragConstraints={isActive ? { left: 0, right: 0 } : undefined}
      dragElastic={isActive ? 0.7 : undefined}
      onDragEnd={isActive ? onDragEnd : undefined}
      style={{
        x: isActive ? dragX : x,
        z,
        rotateY,
        opacity,
        zIndex,
        visibility,
        transformStyle: "preserve-3d",
        ...(isActive ? { rotateX } : {}),
      }}
    >
      {/* Shadow layer — pre-rendered, opacity only */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: values.borderRadius,
          boxShadow: `
            0px 21px 13px 0px rgba(0,0,0,0.06),
            0px 9px 9px 0px rgba(0,0,0,0.1),
            0px 2px 5px 0px rgba(0,0,0,0.11)
          `,
          opacity: isActive ? values.shadowOpacity : values.shadowOpacity * 0.5,
          transition: "opacity 0.8s cubic-bezier(0.19, 1, 0.22, 1)",
        }}
      />
      {/* Card content */}
      <div
        className="w-full h-full overflow-hidden"
        style={{ borderRadius: values.borderRadius }}
      >
        <img
          src={card.src}
          alt={card.label}
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
      </div>
    </motion.div>
  );
}
