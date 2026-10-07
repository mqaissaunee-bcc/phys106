# PHYS 106 Astronomy — course site

Original, textbook-free course site for PHYS 106 (Brookdale Community College). Static HTML/CSS/JS, no build step, no CDN dependencies. Hosted on GitHub Pages.

## Structure

```
index.html            Home: module grid with per-student progress
schedule.html         Maps modules to calendar weeks (dates live here only)
syllabus.html         Policies, grading, outcomes
glossary.html         Searchable glossary, rendered from glossary-data.js
my-work.html          Student backup / restore / delete of all their saved data
modules/module-NN.html  One page per module (13 content modules; exams are checkpoints, not modules)
assets/css/site.css   All styling; theme tokens at the top (light, dark, night-red)
assets/js/theme-init.js   Applies saved theme/text size before first paint
assets/js/site.js         Shared behavior: themes, progress, glossary popovers, quiz engine, print
assets/js/glossary-data.js  All glossary terms (add each module's terms here)
assets/js/module-NN-sims.js   That module's simulations and activities
```

## Status

All 13 modules are live (53 simulations, about 160 activities, 80 guided problems, 260 self-check questions, 330 glossary terms). Module 6 ends with a 30-question practice midterm (Modules 1–6); Module 13 ends with a 30-question practice final (Modules 7–13). Exam question banks for Canvas are a separate instructor package.

## Math level

All computed work is aligned to MATH 015 (Prealgebra), the course prerequisite, plus scientific notation, which the course teaches in Module 1. `math-toolkit.html` reviews each skill with the matching MATH 015 section, astronomy examples, TI-30XS keystrokes, and quick checks. Guided problems automatically list the skills they use (detected in `site.js`, or set explicitly with a `skills` list in the problem's JSON) and link to the toolkit. Harder operations (cube roots, fractional powers, logarithmic scales) appear only inside simulations and calculators, which do the math for students. When adding problems, keep required work to: arithmetic, order of operations with whole-number exponents, square roots, percent, ratios and proportions, unit conversions, π, evaluating formulas, one-variable linear equations, and scientific notation.

## Math tools (`mathtools.js`, `mathtools.css`)

A portable pair of files (reads its storage prefix from `<html data-store-prefix="...">`, default `phys106-`):

- **Calculator:** a Calc button on every page opens a TI-30XS-style calculator (×10ⁿ, (−), x², √, ^, π, ans), with normal/SCI display, the answer in words, a history, and "Add history to notes." It uses its own expression parser, so there is no `eval`.
- **Just-in-time refreshers:** in each module, a collapsible scientific-notation refresher appears at the first large number and the first small number (in readings or problems). Module 1, which teaches the topic directly, is skipped. "Scientific notation" skill links on guided problems open the same refresher in a dialog.
- **Numbers in words:** scientific notation in readings gets its value in words, such as "(150 million km)", unless words are already there.
- **Readiness check:** a `.readiness[data-source]` component; used at the top of `math-toolkit.html`.
- **Print buttons:** any `button[data-print]`.

`formula-sheet.html` collects every formula and constant used in the course and prints on about two pages.

## Math emphasis (Concepts or Calculations)

Instructors choose the emphasis with a link. Post `.../phys106/?emphasis=concepts` (or add `?emphasis=concepts` to any page link) in Canvas, and each student's browser remembers it. In Concepts mode, each of the 80 guided problems opens with a reasoning question (multiple choice, with explanation), and the full calculation moves into an "Optional: do the math" panel. `?emphasis=calculations` restores the default. Students can switch with the bar under each module's summary line; the setting is included in My work backups. Concept questions live in `build/concepts.py` and are added to pages by `build/inject_concepts.py`. Run `build/build_all.sh` after any rebuild so they are not lost.

## Orders of magnitude

The calculator's **Magnitude line** view places any answer on a power-of-ten scale with landmarks for length, time, mass, or plain numbers. The **How many zeros** view writes the number out digit by digit and counts the places the decimal point moves. `orders-of-magnitude.html` is the full Explorer: landmark browsing, a two-object comparison, and a "Place it" estimation game.

## External simulations ("Explore further")

Twenty free external simulations, each with a few guided things to try, are placed at the end of the reading section they support; the module plan tables and `simulations.html` link to all of them. Most are from PhET (University of Colorado Boulder) and Columbia University's HTML5 ports of the University of Nebraska–Lincoln astronomy simulations. Two link to the Nebraska HTML5 collection page for its H-R Diagram, Stellar Evolution, and Hubble's Law simulators. The list and placements live in `build/explore.py`, which `build_all.sh` runs after every build. Check that the links still load each term.

## Presentation mode (`present.js`, `present.css`)

Every module page has a **Present** button (top bar and under the module summary) that turns the page into slides for class. The real page elements are moved onto each slide and put back afterward, so simulations, guided problems, glossary popovers, the quiz, and the calculator all work on the slides. Ending the presentation returns to the section that was on screen.

- **Slides:** title, overview video, objectives, time plan, a dark divider for each Part, reading sections split into readable chunks, one slide per simulation and activity, the summary, the quiz, and an end slide that opens the next module in presentation mode. Text is sized to fit each slide; if a slide still has more, the clicker scrolls it before moving on.
- **Clicker and keys:** Page Down / → / ↓ / Space next; Page Up / ← / ↑ back; B or . black screen; W white screen; O slide list; type a number then Enter to jump; + / − text size; F full screen; T timer; ? controls; Esc end. On guided problems the clicker reveals the solution one step at a time first (can be turned off in the start box). In Concepts mode it leaves the closed "Optional: do the math" panel alone.
- **Presenter view:** a second window for the laptop screen, kept in sync, with the next slide, an elapsed timer, a clock, big Back/Next buttons, and glossary definitions for terms on the current slide. Any element with class `speaker-notes` (hidden on the page) shows there as notes for that slide.
- **Links:** `?present=N` opens a module straight into slide N.
- **Adding it to a page:** one line after the other scripts: `<script src="../assets/js/present.js"></script>`. If module pages are regenerated by a build script, add this line to the template so it is not lost. All site-specific selectors are in the `CONFIG` block at the top of `present.js`.

## Hiding the top bar

The ▴ button at the end of the top bar hides the whole bar for more reading room; a small "▾ Menu" tab in the top-right corner brings it back. The choice is remembered (saved with the other display preferences) and applied before the page draws. Below 1180 px wide, the menu links fold behind the "Menu" button so the bar stays on one row.

## Publish with GitHub Desktop

1. Create a new repository in GitHub Desktop and copy these files into it (keep `.nojekyll`).
2. Commit and publish the repository to GitHub as public.
3. On GitHub: Settings → Pages → Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
4. The site appears at `https://<username>.github.io/<repo>/`.

## Conventions

- CSP-safe: all events bound with `addEventListener`; no inline handlers, no `eval`.
- Colors only through CSS tokens; simulations use the `.s-*` SVG classes so they follow every theme.
- WCAG 2.1 AA: skip link, landmarks, 44 px targets, visible focus, `aria-live` readouts, reduced-motion support.
- Student state (sections read, quiz best scores, theme, text size) is stored in `localStorage` under `phys106-*` keys only.
- Glossary terms in readings: `<button class="term" data-term="slug">word</button>`; the slug must exist in `glossary-data.js`.
- Self-check quizzes: JSON in `<script type="application/json">` with `q`, `choices`, `answer` (index), `explain`. Choices are shuffled unless `"fixed": true`.

## Modules, not weeks

Content is organized into 13 modules, each sized for one 2 h 45 min class session plus about an hour of independent work. The midterm follows Module 6 and the final follows Module 13. For 7- or 11-week terms, only `schedule.html` changes.

## Adding a module

Copy `modules/module-02.html`, change `data-week` on `<body>` (e.g. `module-03`), the TOC, sections, activity/quiz JSON, and the sims script. Add glossary terms with `module: N`, then switch its card in `index.html` from "In development" to a link.

Reusable, data-driven components in `site.js` (config lives in a `<script type="application/json">` referenced by `data-source`):

- `.guided` — guided problem: student work box, optional numeric check with tolerance, step-by-step reveal of a worked solution
- `.poe` — predict, observe, explain
- `.order-activity` — put items in order
- `.tf-activity` — two-choice sort (optional custom `labels`)
- `.label-activity` — label a numbered diagram
- `.estimate-activity` — Fermi estimate: gut guess, step chain, comparison with a reference
- `.explain-it` — "explain it to a friend" writing with self-check list and model answer
- `.checklist[data-checklist]` — persisted hands-on steps
- `.quiz` — self-check quiz

### Standard for every module

At least 12 activities, including one or more of each: predict–observe–explain, order or sort, calculator with real data, hands-on (home/outdoor), generated drill, diagram labeling, estimation, and explain-it-to-a-friend. Plus 6 guided problems, and 3+ simulations.

## Notes tool (`notes.js`)

One notebook per module, stored in IndexedDB. Rich-text editing, paste (sanitized) and drag/upload of images, and "Add to notes" buttons injected automatically on worked examples, analogy/misconception callouts, simulations (SVG snapshot + readouts), calculator results, glossary definitions, and every guided/estimation/POE/explain activity. Exports: Word (.docx built in-browser, no library), PDF (browser print), Markdown, HTML. Note: inside a Canvas iframe, downloads need the iframe to allow downloads; the GitHub Pages URL always works.

Homework lives in Canvas. Exam banks and any answer keys are **not** in this repository; keep them in a separate instructor package.

## Backup and restore (`backup.js`, `my-work.html`)

Student data never leaves the browser. The My work page summarizes what is saved per module and lets students download one JSON backup (all `phys106-*` localStorage keys plus every notebook, images included), restore it on any device (merge or replace), or wipe everything on a shared computer. Merge unions Moon-journal entries by id and merges per-module stores. Browsers keep separate storage for the course opened directly vs. inside a Canvas iframe; a backup is also how students move work between the two.

When you publish a new module, add it to the `MODULES` list at the top of `backup.js` (id, title, number of reading sections) so it appears in the summary table.
