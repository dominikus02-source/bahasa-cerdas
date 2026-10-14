# Main Bersama — mascot family and play UI

14 October 2026. UI work is on `codex/main-bersama-setup-ui-20261014`; no production deployment, database/schema changes, or new game rules.

## Assets

Built-in **image_gen** was used, with the existing tiger and rhino as visual references. Elephant and bear now share the original polished 2D cartoon rendering, cel shading, expressive eyes, dark outlines, and triangular scout neckerchief with the BC emblem. Elephant uses teal; bear uses purple. All four poses are distinct: ready, move, celebrate, podium.

- Runtime: `public/main-bersama/jelajah/mascots/v2/jelajah-{gajah,beruang}-{ready,move,celebrate,podium}.webp`.
- Lossless generated masters: `docs/main-bersama/art-source/mascots/v2/{ready,move,celebrate,podium}/jelajah-{gajah,beruang}-{pose}.png`.
- Masters: 1254×1254 RGBA. Runtime: 1024×1024, alpha retained, 106–134 KiB each. Conversion used Sharp at quality 86 and alpha quality 100.
- Previous elephant/bear assets and all four original mascots are preserved. The registry selects the new versioned files.

## Final prompt set

Each asset was generated separately. The two ready prompts used the existing `jelajah-harimau-ready.webp` and `jelajah-badak-ready.webp` as **style and accessory references**, not edit targets. Variants used the new ready character as the **edit target** and the corresponding existing tiger pose as a **pose reference**.

### Ready — elephant

> Use case: stylized-concept. Generate a new game sprite for BahasaCerdas, not a scene or a sheet. The two input images are STYLE AND ACCESSORY REFERENCES, not edit targets. Subject: ONE full-body anthropomorphic young elephant mascot in a confident READY stance, friendly open smile, large expressive eyes, feet grounded, one hand curled in a friendly confident fist. Match the reference tiger and rhino EXACTLY in illustration medium: polished 2D cartoon game art, bold clean dark contour lines, rich cel shading with soft painted highlights, generous friendly face proportions, visibly sculpted limbs, consistent detailed hands and feet. The elephant is blue-gray with large ears and a recognisable curved trunk; no clothing other than a TEAL triangular scout neckerchief tied around the neck, tails flowing to one side, matching the reference triangular bandana geometry and shading. On the centre of the bandana reproduce the same small BC emblem as in the reference: intertwined letters B and C with blue-to-violet-to-pink colouring and a narrow white border. This neckerchief is the essential accessory; do not make a winter scarf. Three-quarter front view facing slightly RIGHT, equally energetic and mature as the references, not a flat emoji or a toy. Composition: square canvas, only ONE character, entire body visible, centered, character occupies around 90% of image height, a little clear margin around extremities, no cropped feet/ears/trunk. Background: actual TRANSPARENT alpha, clean isolated sprite. NO cast shadow, floor, scenery, text labels, border, medal, podium, props, watermark, duplicate character, checkerboard pattern or black/white opaque backdrop.

### Ready — bear

> Use case: stylized-concept. Generate a new game sprite for BahasaCerdas, not a scene or a sheet. The two input images are STYLE AND ACCESSORY REFERENCES, not edit targets. Subject: ONE full-body anthropomorphic young brown bear mascot in a confident READY stance, friendly open smile, large expressive eyes, feet grounded, one hand curled in a friendly confident fist. Match the reference tiger and rhino EXACTLY in illustration medium: polished 2D cartoon game art, bold clean dark contour lines, rich cel shading with soft painted highlights, generous friendly face proportions, visibly sculpted limbs, consistent detailed hands and feet. The bear has warm medium brown fur, round ears and cream muzzle and belly. No clothing other than a PURPLE triangular scout neckerchief tied around the neck, tails flowing to one side, matching the reference triangular bandana geometry and shading. On the centre of the bandana reproduce the same small BC emblem as in the reference: intertwined letters B and C with blue-to-violet-to-pink colouring and a narrow white border. This neckerchief is the essential accessory; do not make a winter scarf. Three-quarter front view facing slightly RIGHT, equally energetic and mature as the references, not a flat emoji or a toy. Composition: square canvas, only ONE character, entire body visible, centered, character occupies around 90% of image height, a little clear margin around extremities, no cropped feet/ears. Background: actual TRANSPARENT alpha, clean isolated sprite. NO cast shadow, floor, scenery, text labels, border, medal, podium, props, watermark, duplicate character, checkerboard pattern or black/white opaque backdrop.

### Pose variants — applied independently to each character

For each variant, preserve the ready character's identity, proportions, colour, eyes, ears, elephant trunk where applicable, cream belly, dark outlines, cel shading, painted highlights, triangular neckerchief, and centred blue-violet-pink BC emblem with white outline. Keep a single complete full-body character on an actual transparent square canvas, around 90% image height with clear margins. No background, floor, shadow, scenery, text labels, watermark, second character, medal, trophy, rank or podium.

- **Move:** Use case `identity-preserve`. Change only the pose to a dynamic run toward the right in three-quarter view, one leg forward and one back, arms pumping, body leaning forward, scarf tails flowing back and a lively smile. Match the energy of the tiger move reference without including the tiger.
- **Celebrate:** Use case `identity-preserve`. Change only the pose to a cheerful wide smile and both hands raised above shoulder level in victory, feet grounded apart, three-quarter front view slightly right. Elephant trunk raised without covering the face. Retain the coloured BC emblem; do not switch to white letters. No confetti or glitter particles.
- **Podium:** Use case `identity-preserve`. Change only the pose to a proud relaxed upright stance, both hands on hips, broad confident closed-mouth friendly smile, feet grounded apart, three-quarter front view slightly right. Output the character only; the UI supplies the podium.

## Play UI

- One trail per team in the same reading order: Elang, Harimau, Rusa, Badak, Gajah, Beruang. Equal progress has the same relative start/finish position; rank changes cannot change team order. No overlap between mascots.
- The progress board now uses the existing jungle illustration, dark green trail cards, coloured checkpoint diamonds, illuminated progress and finish flags. Teacher controls use two columns; wide classroom/projector screens use three columns for five/six teams. Phones use one column.
- Mascots render at 128px on the regular teacher board, 112px in teacher fullscreen and wide presentation, and 112px on phones. Intermediate presentation widths use 100px to retain all six tracks.
- All selected teams appear in the teacher's status summary; the previous four-team truncation is removed.
- Teacher actions stay in a single toolbar across the class, participant and analysis panels. Same commands and server permission policy.
- Automatic team mode on the classroom/projector surfaces shows the race instead of a misleading shared question. The classroom dock omits manual round controls for automatic teams.
- End-session dialog is consistent across teacher/classroom surfaces, supports Escape and keyboard focus containment, and uses the existing end command.
- Projector has one PIN display and one explicit fullscreen toggle. Read-only projector access remains unchanged.
- Student answer options retain the same selection handler, now with consistent violet selection state and 68px mobile targets.
- Student question progress is a separate adventure header with a 128px mascot (112px on portrait phones), the original question counter and progress value. Landscape phones use a 96px mascot and a two-column answer layout. Countdown and answer submission handlers remain unchanged.

## Verification

Verification uses the actual React components with isolated local fixture data, not production sessions. Preview endpoints do not connect to production data.

- Six-team fullscreen presentation checked at 1366×768: all six lanes within the viewport.
- Student layout checked at 390×844 and 844×390: large mascot, accessible progress value, no horizontal overflow, visible answer confirmation and two-column landscape answers.
- Desktop and mobile layouts, teacher tab navigation, end-dialog cancel/focus loop, classroom menu, projector controls and student answer submission checked in the browser.
- Automated checks: mascot asset alpha/container/size/master invariants; 14,641 progress combinations plus 2–6 lane invariants; six-team capacity; teacher permission controls; manual finish; motion regression.
- Game engine, scoring, API routes, session permissions, realtime transport and database schema are unchanged.

`npm run build` passed (454 pages, TypeScript checked). Asset validation: 332 checks passed, including HTTP 200 checks for all 24 runtime sprites. Motion regression: 45 checks passed. Layout, six-team behavior, teacher controls and manual finish checks passed. The student submit and teacher command functions are unchanged according to an AST comparison against `origin/main`. Existing routing assertions had three baseline failures before this UI work; they are outside this change. Four existing avatar `<img>` lint warnings remain in the teacher room; no new lint errors.
