# Task Manager

A clean, accessible kanban-style task manager built with **vanilla HTML, CSS, and JavaScript (ES Modules)** — no frameworks, no build tools, and no external dependencies.

Organise tasks across **To do**, **In progress**, and **Done** columns, set priorities and due dates, filter and search in real time, and switch between light and dark themes. Everything is saved automatically in your browser's `localStorage`.

---

## Features

- **Kanban board with 3 columns** — *To do*, *In progress*, and *Done*, with live task counts per column.
- **Drag-and-drop & keyboard navigation** — Drag cards between columns (and reorder within a column), or use the `←` and `→` buttons on each card for full keyboard accessibility.
- **Priorities & due dates** — Colour-coded priority stripes (*Low*, *Medium*, *High*) and automatic **Overdue** badges when a due date has passed.
- **Edit tasks in a modal dialog** — Uses the native HTML `<dialog>` element for built-in focus trapping and `Esc`-to-close behaviour.
- **Instant search & status filters** — Filter by *All*, *Active*, or *Completed*, and press `/` anywhere to jump straight to the search bar.
- **Light & dark theme** — Respects your operating system preference on first visit and remembers your choice in `localStorage` without a flash of unstyled theme on reload.
- **Accessible by design** — Skip link, semantic landmarks, `aria-live` announcements for screen readers, visible `:focus-visible` outlines, and `prefers-reduced-motion` support.

---

## Tech Used

- **HTML5** — Semantic elements, native `<dialog>`, ARIA attributes, and live regions.
- **CSS3** — Custom properties (CSS variables) for theming, CSS Grid & Flexbox for responsive layout, and `color-mix()` for subtle badge tints.
- **Vanilla JavaScript (ES2022+)** — Native ES Modules (`import` / `export`), pure state-update functions, event delegation, HTML5 Drag and Drop API, and `localStorage`.

---

## How to Run Locally

Because this project uses native JavaScript ES Modules (`<script type="module">`), browsers require it to be served over `http://` rather than opened directly as a `file://` URL.

Pick any one of the options below from inside the `task-manager` folder:

### Option 1: Python (built in on macOS and Linux)

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000> in your browser.

### Option 2: Node.js (`npx`)

```bash
npx serve .
```

### Option 3: VS Code Live Server

Install the **Live Server** extension in VS Code, right-click `index.html`, and choose **Open with Live Server**.

---

## Project Structure

```text
task-manager/
├── index.html        # App shell, add-task form, kanban columns, and <dialog> modal
├── css/
│   └── style.css     # Light/dark theme variables, responsive grid, card & dialog styles
├── js/
│   ├── app.js        # Entry point: state, event listeners, drag-and-drop, keyboard shortcuts
│   ├── tasks.js      # Pure functions for creating, updating, moving, and filtering tasks
│   ├── ui.js         # DOM rendering, modal dialog helpers, theme toggle, ARIA announcer
│   └── storage.js    # Safe localStorage read/write helpers with data normalisation
├── LICENSE           # MIT License
└── README.md         # Project documentation
```

---

## What I Learned

- **Separating state, storage, and DOM rendering** across small ES modules (`tasks.js`, `storage.js`, `ui.js`, `app.js`) makes code much easier to read and debug than keeping everything in one big script.
- **Writing pure functions** (returning new arrays with `map`, `filter`, and spread syntax instead of mutating in place) prevents subtle bugs where the UI and saved data drift out of sync.
- **Event delegation** on the board container means we only attach one click listener instead of re-binding listeners every time the task list re-renders.
- **Defensive `localStorage` handling** — wrapping `JSON.parse` in `try/catch` and normalising loaded objects prevents corrupted or hand-edited storage data from crashing the app.
- **Building accessible interactive components** — pairing drag-and-drop with keyboard move buttons and `aria-live` announcements ensures everyone can use the board.

---

## Future Improvements

- Subtasks / checklists inside each card.
- Custom tags or categories with colour filters.
- Export and import tasks as a `.json` backup file.
- Optional keyboard reordering up and down within the same column.
- Automated unit tests for the pure functions in `js/tasks.js`.

---

## License

Released under the [MIT License](LICENSE) — © 2026 Nicholas.
