"use client";

import { useState, useRef, useCallback } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
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

export default function FlipDeck() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

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
    reset: () => setActiveIndex(0),
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
  const dragX = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Map drag to tilt
  const tiltX = useTransform(dragX, [-300, 0, 300], [
    values.tiltOnDrag ? values.tiltAngle : 0,
    0,
    values.tiltOnDrag ? -values.tiltAngle : 0,
  ]);

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
      animate(dragX, 0, { type: "spring", visualDuration: 0.3, bounce: 0.1 });
    },
    [activeIndex, values.dragThreshold, dragX]
  );

  function getCardStyle(index: number) {
    const offset = index - activeIndex;

    if (Math.abs(offset) > 2) {
      return { opacity: 0, visibility: "hidden" as const, pointerEvents: "none" as const };
    }

    const absOffset = Math.abs(offset);
    const sign = offset > 0 ? 1 : -1;

    if (offset === 0) {
      return {
        zIndex: 10,
        x: 0,
        z: 0,
        rotateY: 0,
        opacity: 1,
        visibility: "visible" as const,
      };
    }

    return {
      zIndex: 10 - absOffset,
      x: `${sign * values.translateX}%`,
      z: -(absOffset * values.translateZ),
      rotateY: -sign * values.rotateY,
      opacity: absOffset === 1 ? 0.7 : 0,
      visibility: absOffset <= 1 ? ("visible" as const) : ("hidden" as const),
    };
  }

  return (
    <div className="relative select-none" ref={containerRef}>
      <div
        className="relative"
        style={{
          perspective: `${values.perspective}px`,
          width: 400,
          height: 533,
        }}
      >
        {CARDS.map((card, i) => {
          const style = getCardStyle(i);
          const isActive = i === activeIndex;

          return (
            <motion.div
              key={i}
              className="absolute inset-0"
              drag={isActive ? "x" : false}
              dragConstraints={isActive ? { left: 0, right: 0 } : undefined}
              dragElastic={isActive ? 0.7 : undefined}
              onDragEnd={isActive ? handleDragEnd : undefined}
              style={{
                zIndex: style.zIndex,
                transformStyle: "preserve-3d",
                ...(isActive ? { x: dragX, rotateX: tiltX } : {}),
              }}
              animate={
                isActive
                  ? {
                      z: 0,
                      rotateY: 0,
                      opacity: 1,
                      visibility: "visible" as const,
                    }
                  : {
                      x: style.x ?? 0,
                      z: style.z ?? 0,
                      rotateY: style.rotateY ?? 0,
                      opacity: style.opacity,
                      visibility: style.visibility,
                    }
              }
              transition={values.spring}
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
        })}
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
            onClick={() => setActiveIndex(i)}
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
