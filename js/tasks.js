/**
 * tasks.js
 * --------
 * Pure functions for working with the task list.
 *
 * "Pure" means each function takes data in and returns NEW data out, without
 * touching the page or localStorage and without changing the original array.
 * This makes the logic easy to reason about and easy to test on its own.
 */

/** The board columns, in left-to-right order. */
export const STATUSES = ['todo', 'in-progress', 'done'];

/** Human-friendly names for each status, used in the UI and announcements. */
export const STATUS_LABELS = {
  todo: 'To do',
  'in-progress': 'In progress',
  done: 'Done',
};

/**
 * Generates a unique id for a new task.
 * crypto.randomUUID() is the modern way, but it is only available on secure
 * pages (https or localhost), so we keep a simple fallback just in case.
 *
 * @returns {string}
 */
function generateId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Creates a new task object with sensible defaults.
 *
 * @param {object} details
 * @param {string} details.title - What needs to be done.
 * @param {'low'|'medium'|'high'} [details.priority='medium']
 * @param {string} [details.dueDate=''] - Date in "YYYY-MM-DD" format (from <input type="date">).
 * @returns {object} The new task. New tasks always start in "To do".
 */
export function createTask({ title, priority = 'medium', dueDate = '' }) {
  return {
    id: generateId(),
    title: title.trim(),
    priority,
    dueDate,
    status: 'todo',
    createdAt: Date.now(),
  };
}

/**
 * Adds a task to the end of the list.
 *
 * @param {object[]} tasks
 * @param {object} task
 * @returns {object[]} A new array containing the extra task.
 */
export function addTask(tasks, task) {
  return [...tasks, task];
}

/**
 * Changes some fields of one task, leaving all other tasks untouched.
 *
 * @param {object[]} tasks
 * @param {string} id - The id of the task to change.
 * @param {object} changes - Only the fields that should change, e.g. { title: 'New name' }.
 * @returns {object[]} A new array with the updated task.
 */
export function updateTask(tasks, id, changes) {
  // Spreading { ...task, ...changes } copies the task and overwrites only the changed fields.
  return tasks.map((task) => (task.id === id ? { ...task, ...changes } : task));
}

/**
 * Removes a task from the list.
 *
 * @param {object[]} tasks
 * @param {string} id
 * @returns {object[]} A new array without that task.
 */
export function deleteTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}

/**
 * Moves a task to a column, optionally placing it before another task.
 * Used by drag-and-drop (which cares about position) and by the
 * keyboard "move left/right" buttons (which just append to the column).
 *
 * The order of tasks inside each column is simply their order in the array,
 * so "moving" means taking the task out and re-inserting it at a new index.
 *
 * @param {object[]} tasks
 * @param {string} id - The task being moved.
 * @param {string} status - The column it is moving to.
 * @param {string|null} [beforeId=null] - Place the task just before this task.
 *   If null, the task goes to the end of the column.
 * @returns {object[]} A new, re-ordered array.
 */
export function moveTask(tasks, id, status, beforeId = null) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return tasks;

  const remaining = tasks.filter((t) => t.id !== id);
  const moved = { ...task, status };

  const insertAt = beforeId ? remaining.findIndex((t) => t.id === beforeId) : -1;

  if (insertAt === -1) {
    return [...remaining, moved];
  }
  // Rebuild the array: everything before the target, the moved task, then the rest.
  return [...remaining.slice(0, insertAt), moved, ...remaining.slice(insertAt)];
}

/**
 * Ticks or unticks a task.
 * Completing a task moves it to "Done"; un-completing it sends it back to "To do".
 *
 * @param {object[]} tasks
 * @param {string} id
 * @returns {object[]}
 */
export function toggleComplete(tasks, id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return tasks;

  const newStatus = task.status === 'done' ? 'todo' : 'done';
  return moveTask(tasks, id, newStatus);
}

/**
 * Removes every task in the "Done" column.
 *
 * @param {object[]} tasks
 * @returns {object[]}
 */
export function clearCompleted(tasks) {
  return tasks.filter((task) => task.status !== 'done');
}

/**
 * Works out which tasks should be visible for the current filter and search.
 * This does NOT change the saved data — it only decides what to show.
 *
 * @param {object[]} tasks
 * @param {'all'|'active'|'completed'} filter
 * @param {string} query - Search text typed by the user.
 * @returns {object[]} The tasks that match.
 */
export function filterTasks(tasks, filter, query) {
  const search = query.trim().toLowerCase();

  return tasks.filter((task) => {
    if (filter === 'active' && task.status === 'done') return false;
    if (filter === 'completed' && task.status !== 'done') return false;

    // Lower-casing both sides makes the search case-insensitive.
    return search === '' || task.title.toLowerCase().includes(search);
  });
}
