# flip-deck-demo

DialKit interaction demo of a 3D scrolling card deck where cards rotate and translate in perspective as you scroll.

## Stack
- Next.js 16, React 19
- DialKit (live parameter tuning)
- Tailwind CSS v4

## Status
Deployed → https://triumphant-renewal-production.up.railway.app

## What it does
Renders 5 landscape photography cards in a horizontal scroll container. As you scroll, cards that are off-center rotate on the Y-axis and translate in Z, creating a 3D fan/deck effect. Snap-to-card uses a spring animation with configurable overshoot. All transform values (rotateY, translateX, translateZ, perspective, bounce, shadow) are live-tunable via DialKit.

## Usage
```bash
npm run dev   # http://localhost:3000
```
