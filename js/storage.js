/**
 * storage.js
 * ----------
 * Everything to do with saving and loading data lives here.
 * Keeping localStorage code in one file means the rest of the app doesn't
 * need to know HOW data is stored — we could swap in a real backend later
 * by changing only this module.
 */

// Prefixing keys with the app name avoids clashes with other apps on the same domain
// (e.g. other projects hosted on the same GitHub Pages account).
const TASKS_KEY = 'task-manager.tasks';
const THEME_KEY = 'task-manager.theme';

const VALID_PRIORITIES = ['low', 'medium', 'high'];
const VALID_STATUSES = ['todo', 'in-progress', 'done'];

/**
 * Makes sure a task loaded from storage has every field we expect.
 * Saved data might be from an older version of the app or edited by hand,
 * so we fill in safe defaults instead of letting the UI crash.
 *
 * @param {object} raw - A task object as parsed from JSON.
 * @returns {object|null} A clean task, or null if it is unusable.
 */
function normalizeTask(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.title !== 'string' || !raw.id) {
    return null;
  }

  return {
    id: String(raw.id),
    title: raw.title.trim(),
    priority: VALID_PRIORITIES.includes(raw.priority) ? raw.priority : 'medium',
    dueDate: typeof raw.dueDate === 'string' ? raw.dueDate : '',
    status: VALID_STATUSES.includes(raw.status) ? raw.status : 'todo',
    createdAt: Number(raw.createdAt) || Date.now(),
  };
}

/**
 * Loads the saved task list from localStorage.
 *
 * @returns {object[]} The saved tasks, or an empty array if nothing is saved
 *   or the saved data is broken.
 */
export function loadTasks() {
  try {
    const json = localStorage.getItem(TASKS_KEY);
    if (!json) return [];

    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];

    // Drop any entries that normalizeTask couldn't repair.
    return parsed.map(normalizeTask).filter(Boolean);
  } catch (error) {
    // JSON.parse throws on corrupted data, and localStorage can throw in some
    // privacy modes. Either way, starting fresh is better than a blank page.
    console.warn('Could not load tasks, starting with an empty list.', error);
    return [];
  }
}

/**
 * Saves the full task list to localStorage.
 * localStorage can only store strings, so we convert the array to JSON first.
 *
 * @param {object[]} tasks - The tasks to save.
 */
export function saveTasks(tasks) {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (error) {
    // Happens if storage is full or disabled. The app still works for this session.
    console.warn('Could not save tasks.', error);
  }
}

/**
 * Reads the user's saved theme choice.
 *
 * @returns {'light'|'dark'|null} The saved theme, or null if the user never chose one.
 */
export function loadTheme() {
  try {
    const theme = localStorage.getItem(THEME_KEY);
    return theme === 'light' || theme === 'dark' ? theme : null;
  } catch {
    return null;
  }
}

/**
 * Remembers the user's theme choice for their next visit.
 *
 * @param {'light'|'dark'} theme
 */
export function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Not critical — the theme just won't be remembered.
  }
}
