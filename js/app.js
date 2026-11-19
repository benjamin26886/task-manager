/**
 * app.js
 * ------
 * The entry point that wires everything together:
 *   - holds the current application state in one object
 *   - loads saved tasks (or seeds a few starter tasks on first visit)
 *   - listens for user actions (forms, clicks, keyboard shortcuts, drag-and-drop)
 *   - calls tasks.js to update data, storage.js to save it, and ui.js to redraw
 */

import { loadTasks, saveTasks, loadTheme, saveTheme } from './storage.js';
import {
  STATUSES,
  STATUS_LABELS,
  createTask,
  addTask,
  updateTask,
  deleteTask,
  moveTask,
  toggleComplete,
  clearCompleted,
  filterTasks,
} from './tasks.js';
import {
  renderBoard,
  setFormError,
  openEditDialog,
  closeEditDialog,
  applyTheme,
  announce,
} from './ui.js';

/**
 * A few friendly starter tasks shown only the very first time someone opens the app
 * (when localStorage has no saved key yet), so the board isn't just three empty boxes.
 *
 * @returns {object[]}
 */
function getStarterTasks() {
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      ...createTask({
        title: 'Drag a card to another column (or use the ← → buttons)',
        priority: 'medium',
        dueDate: today,
      }),
      status: 'todo',
    },
    {
      ...createTask({
        title: 'Click ✎ on any card to edit its title, due date or status',
        priority: 'low',
      }),
      status: 'in-progress',
    },
    {
      ...createTask({
        title: 'Try the search bar and dark mode toggle',
        priority: 'high',
      }),
      status: 'done',
    },
  ];
}

// ----- Application state -----
// Having one central state object makes it clear what the app currently "knows".
const state = {
  tasks: [],
  filter: 'all', // 'all' | 'active' | 'completed'
  search: '',
  draggedId: null,
};

/**
 * Saves the current task list (when needed) and redraws the board.
 * Calling this single function after every change guarantees the screen and
 * localStorage never get out of sync.
 *
 * @param {boolean} [persist=true] - Set to false when only filter/search changed.
 */
function commit(persist = true) {
  if (persist) {
    saveTasks(state.tasks);
  }
  const visibleTasks = filterTasks(state.tasks, state.filter, state.search);
  renderBoard({
    allTasks: state.tasks,
    visibleTasks,
    filter: state.filter,
  });
}

// ----- Initial load -----
function init() {
  // Sync the theme button with whatever theme index.html picked on startup.
  const currentTheme =
    loadTheme() || (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  applyTheme(currentTheme);

  const hasSavedBefore = localStorage.getItem('task-manager.tasks') !== null;
  state.tasks = hasSavedBefore ? loadTasks() : getStarterTasks();
  commit(!hasSavedBefore);
}

// ----- Theme toggle -----
document.getElementById('theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  saveTheme(next);
});

// ----- Add-task form -----
const taskForm = document.getElementById('task-form');
const titleInput = document.getElementById('task-title');
const prioritySelect = document.getElementById('task-priority');
const dueInput = document.getElementById('task-due');
const formError = document.getElementById('form-error');

// Clear the error message as soon as the user starts typing again.
titleInput.addEventListener('input', () => {
  if (formError.textContent) {
    setFormError(titleInput, formError, '');
  }
});

taskForm.addEventListener('submit', (event) => {
  event.preventDefault(); // stop the browser from reloading the page

  const title = titleInput.value.trim();
  if (!title) {
    setFormError(titleInput, formError, 'Please enter a task title before adding.');
    titleInput.focus();
    return;
  }

  const newTask = createTask({
    title,
    priority: prioritySelect.value,
    dueDate: dueInput.value,
  });

  state.tasks = addTask(state.tasks, newTask);
  commit();

  taskForm.reset();
  prioritySelect.value = 'medium';
  setFormError(titleInput, formError, '');
  titleInput.focus();
  announce(`Added "${newTask.title}" to To do.`);
});

// ----- Search & filter toolbar -----
const searchInput = document.getElementById('search');

searchInput.addEventListener('input', () => {
  state.search = searchInput.value;
  commit(false);
});

// Handy shortcut: press "/" anywhere (when not already typing in a field) to jump to search.
document.addEventListener('keydown', (event) => {
  const tag = document.activeElement?.tagName;
  const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

  if (event.key === '/' && !isTyping) {
    event.preventDefault();
    searchInput.focus();
  }
});

document.querySelector('.filters').addEventListener('click', (event) => {
  const btn = event.target.closest('.filter-btn');
  if (!btn) return;

  state.filter = btn.dataset.filter;
  commit(false);
});

document.getElementById('clear-completed').addEventListener('click', () => {
  const completedCount = state.tasks.filter((t) => t.status === 'done').length;
  if (completedCount === 0) return;

  state.tasks = clearCompleted(state.tasks);
  commit();
  announce(`Cleared ${completedCount} completed ${completedCount === 1 ? 'task' : 'tasks'}.`);
});

// ----- Board actions (event delegation) -----
// Instead of attaching listeners to every card (which would be lost each time we redraw),
// we attach ONE listener to the board and check which button was clicked via data-action.
const board = document.getElementById('board');

board.addEventListener('click', (event) => {
  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) return;

  const card = actionEl.closest('.task-card');
  if (!card) return;

  const id = card.dataset.id;
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;

  const action = actionEl.dataset.action;

  if (action === 'toggle') {
    state.tasks = toggleComplete(state.tasks, id);
    const updated = state.tasks.find((t) => t.id === id);
    commit();
    announce(`Moved "${task.title}" to ${STATUS_LABELS[updated.status]}.`);
    return;
  }

  if (action === 'move-left' || action === 'move-right') {
    const currentIndex = STATUSES.indexOf(task.status);
    const nextIndex = action === 'move-left' ? currentIndex - 1 : currentIndex + 1;
    const nextStatus = STATUSES[nextIndex];
    if (!nextStatus) return;

    state.tasks = moveTask(state.tasks, id, nextStatus);
    commit();

    // Keep keyboard focus on the same button after the card moves to its new column.
    const movedCard = board.querySelector(`.task-card[data-id="${id}"]`);
    const sameBtn = movedCard?.querySelector(`[data-action="${action}"]`);
    if (sameBtn && !sameBtn.disabled) {
      sameBtn.focus();
    } else {
      movedCard?.querySelector('[data-action="edit"]')?.focus();
    }
    announce(`Moved "${task.title}" to ${STATUS_LABELS[nextStatus]}.`);
    return;
  }

  if (action === 'edit') {
    openEditDialog(task);
    return;
  }

  if (action === 'delete') {
    state.tasks = deleteTask(state.tasks, id);
    commit();
    announce(`Deleted "${task.title}".`);
  }
});

// ----- Edit dialog -----
const editDialog = document.getElementById('edit-dialog');
const editForm = document.getElementById('edit-form');
const editTitle = document.getElementById('edit-title');
const editError = document.getElementById('edit-error');

editTitle.addEventListener('input', () => {
  if (editError.textContent) {
    setFormError(editTitle, editError, '');
  }
});

editDialog.querySelector('[data-close-dialog]').addEventListener('click', () => {
  closeEditDialog();
});

// Clicking the dark backdrop outside the dialog box also closes it.
editDialog.addEventListener('click', (event) => {
  if (event.target === editDialog) {
    closeEditDialog();
  }
});

editForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const title = editTitle.value.trim();
  if (!title) {
    setFormError(editTitle, editError, 'Task title cannot be empty.');
    editTitle.focus();
    return;
  }

  const id = editForm.dataset.editingId;
  const newStatus = document.getElementById('edit-status').value;

  state.tasks = updateTask(state.tasks, id, {
    title,
    priority: document.getElementById('edit-priority').value,
    dueDate: document.getElementById('edit-due').value,
    status: newStatus,
  });

  commit();
  closeEditDialog();
  announce(`Saved changes to "${title}".`);
});

// ----- Drag and drop between columns -----
/**
 * Finds the card in a column that is directly below the mouse cursor, so a
 * dropped card lands in the exact spot the user aimed for rather than always
 * jumping to the bottom of the column.
 *
 * @param {HTMLElement} listEl - The <ul class="task-list"> being hovered.
 * @param {number} clientY - The mouse Y coordinate.
 * @returns {HTMLElement|null} The card to insert before, or null for the end.
 */
function getCardAfterCursor(listEl, clientY) {
  const cards = [...listEl.querySelectorAll('.task-card:not(.is-dragging)')];

  return cards.reduce(
    (closest, card) => {
      const box = card.getBoundingClientRect();
      const offset = clientY - (box.top + box.height / 2);

      // Negative offset means the cursor is above this card's midpoint.
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: card };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

board.addEventListener('dragstart', (event) => {
  const card = event.target.closest('.task-card');
  if (!card) return;

  state.draggedId = card.dataset.id;
  card.classList.add('is-dragging');
  event.dataTransfer.effectAllowed = 'move';
  // Setting data is required by Firefox for drag-and-drop to activate.
  event.dataTransfer.setData('text/plain', card.dataset.id);
});

board.addEventListener('dragend', (event) => {
  const card = event.target.closest('.task-card');
  card?.classList.remove('is-dragging');
  state.draggedId = null;
  board.querySelectorAll('.task-list.is-drag-over').forEach((list) => {
    list.classList.remove('is-drag-over');
  });
});

board.addEventListener('dragover', (event) => {
  const listEl = event.target.closest('.task-list');
  if (!listEl || !state.draggedId) return;

  // Calling preventDefault() tells the browser that this list is a valid drop target.
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';

  board.querySelectorAll('.task-list').forEach((list) => {
    list.classList.toggle('is-drag-over', list === listEl);
  });
});

board.addEventListener('dragleave', (event) => {
  const listEl = event.target.closest('.task-list');
  // Ignore dragleave events that fire when moving between child elements inside the same list.
  if (listEl && !listEl.contains(event.relatedTarget)) {
    listEl.classList.remove('is-drag-over');
  }
});

board.addEventListener('drop', (event) => {
  const listEl = event.target.closest('.task-list');
  if (!listEl || !state.draggedId) return;

  event.preventDefault();
  listEl.classList.remove('is-drag-over');

  const newStatus = listEl.dataset.status;
  const afterCard = getCardAfterCursor(listEl, event.clientY);
  const beforeId = afterCard ? afterCard.dataset.id : null;

  const task = state.tasks.find((t) => t.id === state.draggedId);
  state.tasks = moveTask(state.tasks, state.draggedId, newStatus, beforeId);
  state.draggedId = null;
  commit();

  if (task) {
    announce(`Moved "${task.title}" to ${STATUS_LABELS[newStatus]}.`);
  }
});

init();
