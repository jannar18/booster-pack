---
version: "1.0.0"
name: "Lumen — Aurora Grove"
description: "A tactile mobile card-opening game with luminous glass UI, an original violet-and-gold foil pack, painterly creature cards, and physically responsive 3D motion."
colors:
  sky-top: "#eef5fb"
  sky-bottom: "#b8cee4"
  ink: "#20314e"
  ink-soft: "#647695"
  violet: "#6245a2"
  violet-deep: "#43276f"
  gold: "#f5aa47"
  glass: "rgba(248, 251, 255, 0.72)"
  glass-strong: "rgba(245, 249, 254, 0.92)"
  glass-edge: "rgba(255, 255, 255, 0.78)"
typography:
  interface:
    fontFamily: "ui-rounded, SF Pro Rounded, Avenir Next, Segoe UI, system-ui, sans-serif"
    fontWeight: "750"
  display:
    fontFamily: "ui-rounded, SF Pro Rounded, Avenir Next, Segoe UI, system-ui, sans-serif"
    fontWeight: "800"
rounded:
  sm: "0.625rem"
  md: "1rem"
  lg: "1.15rem"
  pill: "999px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.25rem"
  "6": "1.5rem"
  "8": "2rem"
components:
  glass-control:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.ink}"
    border: "1px solid {colors.glass-edge}"
    rounded: "{rounded.md}"
    backdropFilter: "blur(1rem) saturate(150%)"
  primary-action:
    backgroundColor: "linear-gradient(180deg, #ffc55c, #ef8d28)"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    typography: "{typography.interface}"
  card:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "5.4% / 3.9%"
---

# Lumen — Design System

## Experience

Lumen treats opening a pack as a small physical ritual. The interface stays quiet while the pack and cards own the stage: soft sky depth, restrained glass controls, foil shimmer, deliberate camera movement, and direct drag gestures.

The art direction evokes a premium collectible-card game without borrowing existing characters, marks, card layouts, or franchise language. Aurora Grove is the first original set.

## Layout

The scene fills the visual viewport and respects safe-area insets. Pack and card framing are calculated from both viewport axes so the complete object remains visible on phones, tablets, and wide desktop windows. Controls float above the WebGL canvas without affecting scene geometry.

## Motion

Gestures are direct and interruptible. Selection uses horizontal drag with a width-relative threshold. The cut follows the pointer across the pack seam. Reveals stage one card at a time, with depth, scale, and rotation settling before the next interaction. Reduced-motion users receive shortened transitions.

## Persistence

Opened cards are stored locally in the browser. The collection sheet uses the same frosted material and original card rendering as the reveal experience, keeping the transition from opening to library spatially coherent.

