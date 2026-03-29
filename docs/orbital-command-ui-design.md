# Orbital Command UI Design

## Understanding Summary
- Redesign the frontend into a premium sci-fi control room.
- Prioritize a balanced mix of spectacle and readability.
- Treat the whole page as one unified cinematic system.
- Keep performance conservative on mid-range devices.
- Use a cold base palette with selective warm danger accents.
- Preserve the current frontend architecture where possible.
- Optimize the code while applying the visual pass.

## Assumptions
- The work is limited to the frontend UI in `frontend/src`.
- "Optimize the code" means improving UI structure, styling reuse, and render cost.
- Existing React component boundaries should remain mostly intact.
- Motion should rely on lightweight transform and opacity changes.
- Decorative effects that do not improve hierarchy should be removed or reduced.

## Decision Log
- Visual direction: Premium sci-fi control room
- Chosen approach: Orbital Command
- Priority: Balanced spectacle and readability
- Scope: Whole page as a unified cinematic system
- Constraint: Performance-first on mid-range devices
- Palette: Cold sci-fi base with warm danger accents only when meaningful

## Final Design

### Visual System
- Build around blue-charcoal space tones, silver structural lines, and restrained cyan activity cues.
- Reserve orange and red for threat states, alerts, and breach escalation.
- Use one atmospheric page shell instead of many overlapping glow treatments.
- Keep motion slow, deliberate, and state-driven rather than constant and decorative.

### Layout Direction
- Hero, dashboard, analytics, and alerts should feel like one command deck.
- Promote the top dashboard rail into the page's operational anchor.
- Keep the network map as the tactical centerpiece.
- Treat terminal and analytics as secondary consoles with matching panel logic.

### Alert Treatment
- Alerts should read as precision warning modules, not generic toast cards.
- Use slimmer geometry, compact typography, and one meaningful animated cue.
- Reduce visual mass so alerts remain visible without dominating the screen.

### Optimization Strategy
- Consolidate repeated panel and overlay styles.
- Reduce blur and shadow variety.
- Prefer transform and opacity animation only.
- Remove decorative effects that do not improve hierarchy or clarity.
