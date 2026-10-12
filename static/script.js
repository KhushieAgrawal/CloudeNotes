
const $ = (selector) => document.querySelector(selector);

// Temporary in-memory data for frontend testing only.
let notes = [
    {
        id: 1,
        title: "Cloud Computing",
        content: "Cloud computing provides on-demand access to computing resources over the internet.",
        updatedAt: new Date().toISOString()
    },
    {
        id: 2,
        title: "DBMS Revision",
        content: "Review normalization, primary keys, foreign keys and SQL joins.",
        updatedAt: new Date().toISOString()
    },
    {
        id: 3,
        title: "Machine Learning",
        content: "Revise supervised learning, unsupervised learning and model evaluation.",
        updatedAt: new Date().toISOString()
    }
];

let nextNoteId = 4;
let editingNoteId = null;
let deletingNoteId = null;

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function showMessage(element, message, success = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("success", success);
}

// Demo login only. Real authentication comes from Flask.
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
      alert("Please enter your email and password.");
      return;
    }

    window.location.href = "dashboard.html";
  });
}

// Demo registration only. No account is saved.
const registerForm = $("#registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", event => {
        event.preventDefault();

        const username = $("#username").value.trim();
        const email = $("#registerEmail").value.trim();
        const password = $("#registerPassword").value;
        const message = $("#registerMessage");

        if (!username || !email || !password) {
            showMessage(message, "Please complete every field.");
            return;
        }

        if (password.length < 8) {
            showMessage(message, "Password must contain at least 8 characters.");
            return;
        }

        showMessage(
            message,
            "Demo only: no account was created. You can visit the login page.",
            true
        );
    });
}

// Dashboard elements
const notesGrid = $("#notesGrid");
const searchInput = $("#searchInput");
const notesCount = $("#notesCount");
const emptyState = $("#emptyState");
const emptyTitle = $("#emptyTitle");
const emptyDescription = $("#emptyDescription");

const noteDialog = $("#noteDialog");
const noteForm = $("#noteForm");
const noteTitle = $("#noteTitle");
const noteContent = $("#noteContent");
const dialogTitle = $("#dialogTitle");
const noteMessage = $("#noteMessage");

const deleteDialog = $("#deleteDialog");

function formatDate(value) {
    return new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(new Date(value));
}

function renderNotes() {
    if (!notesGrid) return;

    const query = searchInput.value.trim().toLowerCase();

    const filteredNotes = notes.filter(note =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query)
    );

    notesCount.textContent =
        `${filteredNotes.length} ${filteredNotes.length === 1 ? "note" : "notes"}`;

    notesGrid.innerHTML = filteredNotes.map(note => `
        <article class="note-card">
            <h3>${escapeHTML(note.title)}</h3>
            <p class="note-content">${escapeHTML(note.content)}</p>
            <p class="note-date">Updated ${formatDate(note.updatedAt)}</p>

            <div class="note-actions">
                <button type="button" data-action="edit"
                    data-id="${note.id}">Edit</button>
                <button type="button" class="delete-action"
                    data-action="delete" data-id="${note.id}">Delete</button>
            </div>
        </article>
    `).join("");

    const hasNotes = filteredNotes.length > 0;

    emptyState.hidden = hasNotes;
    notesGrid.hidden = !hasNotes;

    if (!hasNotes) {
        emptyTitle.textContent = query
            ? "No matching notes"
            : "Your space is still empty";

        emptyDescription.textContent = query
            ? "Try a different search term."
            : "Create your first note and get your ideas flowing.";
    }
}

function openCreateDialog() {
    editingNoteId = null;
    noteForm.reset();
    dialogTitle.textContent = "Create a note";
    noteMessage.textContent = "";
    noteDialog.showModal();
}

function openEditDialog(id) {
    const note = notes.find(item => item.id === id);
    if (!note) return;

    editingNoteId = id;
    noteTitle.value = note.title;
    noteContent.value = note.content;
    dialogTitle.textContent = "Edit note";
    noteMessage.textContent = "";
    noteDialog.showModal();
}

function openDeleteDialog(id) {
    deletingNoteId = id;
    deleteDialog.showModal();
}

if (notesGrid) {
    renderNotes();

    $("#newNoteBtn").addEventListener("click", openCreateDialog);
    $("#emptyCreateBtn").addEventListener("click", openCreateDialog);

    searchInput.addEventListener("input", renderNotes);

    notesGrid.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const id = Number(button.dataset.id);

        if (button.dataset.action === "edit") {
            openEditDialog(id);
        } else if (button.dataset.action === "delete") {
            openDeleteDialog(id);
        }
    });

    noteForm.addEventListener("submit", event => {
        event.preventDefault();

        const title = noteTitle.value.trim();
        const content = noteContent.value.trim();

        if (!title || !content) {
            showMessage(noteMessage, "Please enter both a title and content.");
            return;
        }

        if (editingNoteId !== null) {
            const note = notes.find(item => item.id === editingNoteId);

            if (note) {
                note.title = title;
                note.content = content;
                note.updatedAt = new Date().toISOString();
            }
        } else {
            notes.unshift({
                id: nextNoteId++,
                title,
                content,
                updatedAt: new Date().toISOString()
            });
        }

        noteDialog.close();
        noteForm.reset();
        searchInput.value = "";
        renderNotes();
    });

    $("#closeDialogBtn").addEventListener("click", () => {
        noteDialog.close();
    });

    $("#cancelNoteBtn").addEventListener("click", () => {
        noteDialog.close();
    });

    $("#cancelDeleteBtn").addEventListener("click", () => {
        deletingNoteId = null;
        deleteDialog.close();
    });

    $("#confirmDeleteBtn").addEventListener("click", () => {
        if (deletingNoteId === null) return;

        notes = notes.filter(note => note.id !== deletingNoteId);
        deletingNoteId = null;
        deleteDialog.close();
        renderNotes();
    });

    $("#logoutBtn").addEventListener("click", () => {
        window.location.href = "login.html";
    });
}
