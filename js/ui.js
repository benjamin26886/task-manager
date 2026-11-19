/**
 * ui.js
 * -----
 * Everything that reads from or writes to the DOM (the page) lives here.
 *
 * Separating DOM code from data logic (tasks.js) and storage (storage.js) means
 * each file has a single, clear job. Note that we build elements with
 * document.createElement and textContent rather than innerHTML — this is both
 * fast and makes it impossible for a task title like "<script>..." to run as code.
 */

import { STATUSES, STATUS_LABELS } from './tasks.js';

const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

/**
 * Checks whether a YYYY-MM-DD date string is before today in the user's local timezone.
 * Completed tasks are never shown as overdue.
 *
 * @param {string} dueDate - Date in "YYYY-MM-DD" format.
 * @param {string} status - The task's current column.
 * @returns {boolean}
 */
function isOverdue(dueDate, status) {
  if (!dueDate || status === 'done') return false;

  // Appending T00:00:00 forces JavaScript to parse the date in local time
  // instead of UTC (otherwise "2026-05-01" can shift by a day in some timezones).
  const due = new Date(`${dueDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return due < today;
}

/**
 * Turns "2026-05-01" into a short, readable date like "1 May" (or "1 May 2027"
 * if it is in a different year).
 *
 * @param {string} dueDate
 * @returns {string}
 */
function formatDueDate(dueDate) {
  if (!dueDate) return '';

  const date = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dueDate;

  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/**
 * Small helper to create an action button on a task card.
 *
 * @param {object} options
 * @param {string} options.action - Value for data-action (used by event delegation in app.js).
 * @param {string} options.label - Accessible label read by screen readers and shown as a tooltip.
 * @param {string} options.icon - Text/symbol shown inside the button.
 * @param {boolean} [options.disabled=false]
 * @returns {HTMLButtonElement}
 */
function createActionButton({ action, label, icon, disabled = false }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'icon-btn';
  btn.dataset.action = action;
  btn.setAttribute('aria-label', label);
  btn.title = label;
  btn.disabled = disabled;
  btn.textContent = icon;
  return btn;
}

/**
 * Builds a single <li class="task-card"> element from a task object.
 *
 * @param {object} task
 * @returns {HTMLLIElement}
 */
export function createTaskCard(task) {
  const isDone = task.status === 'done';
  const statusIndex = STATUSES.indexOf(task.status);

  const li = document.createElement('li');
  li.className = `task-card priority-${task.priority}${isDone ? ' is-done' : ''}`;
  li.draggable = true;
  li.dataset.id = task.id;

  // 1. Complete / un-complete checkbox
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-check';
  checkbox.checked = isDone;
  checkbox.dataset.action = 'toggle';
  checkbox.setAttribute(
    'aria-label',
    `Mark "${task.title}" as ${isDone ? 'incomplete' : 'complete'}`
  );

  // 2. Task title
  const title = document.createElement('p');
  title.className = 'task-title';
  title.textContent = task.title;

  // 3. Priority and due-date badges
  const meta = document.createElement('div');
  meta.className = 'task-meta';

  const priorityBadge = document.createElement('span');
  priorityBadge.className = 'badge badge-priority';
  priorityBadge.textContent = `${PRIORITY_LABELS[task.priority] || 'Medium'} priority`;
  meta.appendChild(priorityBadge);

  if (task.dueDate) {
    const overdue = isOverdue(task.dueDate, task.status);
    const dueBadge = document.createElement('span');
    dueBadge.className = `badge${overdue ? ' badge-overdue' : ''}`;
    dueBadge.textContent = `${overdue ? 'Overdue · ' : 'Due '}${formatDueDate(task.dueDate)}`;
    meta.appendChild(dueBadge);
  }

  // 4. Action buttons (including keyboard-friendly left/right column moves)
  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const prevStatus = STATUSES[statusIndex - 1];
  const nextStatus = STATUSES[statusIndex + 1];

  actions.append(
    createActionButton({
      action: 'move-left',
      label: prevStatus ? `Move to ${STATUS_LABELS[prevStatus]}` : 'Already in first column',
      icon: '←',
      disabled: !prevStatus,
    }),
    createActionButton({
      action: 'move-right',
      label: nextStatus ? `Move to ${STATUS_LABELS[nextStatus]}` : 'Already in last column',
      icon: '→',
      disabled: !nextStatus,
    }),
    createActionButton({
      action: 'edit',
      label: `Edit "${task.title}"`,
      icon: '✎',
    }),
    createActionButton({
      action: 'delete',
      label: `Delete "${task.title}"`,
      icon: '✕',
    })
  );

  li.append(checkbox, title, meta, actions);
  return li;
}

/**
 * Redraws the three columns, the column counts, the filter buttons, and the
 * "Clear completed" button so the page always matches our current state.
 *
 * @param {object} state
 * @param {object[]} state.allTasks - Every saved task (used for the "Clear completed" button).
 * @param {object[]} state.visibleTasks - Tasks after search and filter are applied.
 * @param {'all'|'active'|'completed'} state.filter
 */
export function renderBoard({ allTasks, visibleTasks, filter }) {
  for (const status of STATUSES) {
    const listEl = document.querySelector(`.task-list[data-status="${status}"]`);
    const countEl = document.querySelector(`[data-count="${status}"]`);

    const tasksInColumn = visibleTasks.filter((task) => task.status === status);

    // replaceChildren() clears the list and inserts the new cards in one step.
    listEl.replaceChildren(...tasksInColumn.map(createTaskCard));
    countEl.textContent = String(tasksInColumn.length);
  }

  // Update which filter pill looks active and tell assistive tech via aria-pressed.
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    const isActive = btn.dataset.filter === filter;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });

  // Disable "Clear completed" when there is nothing in Done to clear.
  const hasCompleted = allTasks.some((task) => task.status === 'done');
  const clearBtn = document.getElementById('clear-completed');
  clearBtn.disabled = !hasCompleted;
}

/**
 * Shows or clears a validation message under a form, and marks the input as
 * invalid so CSS and screen readers both highlight the problem.
 *
 * @param {HTMLInputElement} inputEl
 * @param {HTMLElement} errorEl
 * @param {string} message - Pass an empty string to clear the error.
 */
export function setFormError(inputEl, errorEl, message) {
  errorEl.textContent = message;
  if (message) {
    inputEl.setAttribute('aria-invalid', 'true');
  } else {
    inputEl.removeAttribute('aria-invalid');
  }
}

/**
 * Fills the edit <dialog> with a task's current details and opens it modally.
 *
 * @param {object} task
 */
export function openEditDialog(task) {
  const dialog = document.getElementById('edit-dialog');
  const form = document.getElementById('edit-form');
  const titleInput = document.getElementById('edit-title');
  const errorEl = document.getElementById('edit-error');

  form.dataset.editingId = task.id;
  titleInput.value = task.title;
  document.getElementById('edit-priority').value = task.priority;
  document.getElementById('edit-due').value = task.dueDate || '';
  document.getElementById('edit-status').value = task.status;
  setFormError(titleInput, errorEl, '');

  // showModal() traps Tab focus inside the dialog and lets Esc close it automatically.
  dialog.showModal();
  titleInput.focus();
  titleInput.select();
}

/**
 * Closes the edit dialog if it is open.
 */
export function closeEditDialog() {
  const dialog = document.getElementById('edit-dialog');
  if (dialog.open) {
    dialog.close();
  }
}

/**
 * Applies 'light' or 'dark' to the root <html> element and updates the header
 * button icon and label to match.
 *
 * @param {'light'|'dark'} theme
 */
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;

  const btn = document.getElementById('theme-toggle');
  const icon = btn.querySelector('.theme-icon');
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  btn.setAttribute('aria-label', `Switch to ${nextTheme} theme`);
  btn.title = `Switch to ${nextTheme} theme`;
}

/**
 * Sends a short message to the polite live region so screen-reader users get
 * feedback when tasks are added, moved, or deleted.
 *
 * @param {string} message
 */
export function announce(message) {
  const el = document.getElementById('announcer');
  // Clearing first ensures the same message spoken twice in a row is still announced.
  el.textContent = '';
  window.requestAnimationFrame(() => {
    el.textContent = message;
  });
}
