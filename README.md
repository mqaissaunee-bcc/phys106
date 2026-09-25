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
