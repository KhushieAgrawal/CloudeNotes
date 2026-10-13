

const $ = (selector) => document.querySelector(selector);



async function apiRequest(url, options = {}) {

    const response = await fetch(url, {

        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {}),
            ...(sessionStorage.getItem("cloudnotes_token")
                ? { "Authorization": `Bearer ${sessionStorage.getItem("cloudnotes_token")}` }
                : {})
        }

    });



    const data = await response.json().catch(() => ({}));



    if (!response.ok) {

        throw new Error(data.error || `Request failed (${response.status})`);

    }



    return data;

}



function showMessage(element, message, success = false) {

    if (!element) return;

    element.textContent = message;

    element.classList.toggle("success", success);

}



function escapeHTML(value) {

    return String(value).replace(/[&<>"']/g, character => ({

        "&": "&amp;",

        "<": "&lt;",

        ">": "&gt;",

        '"': "&quot;",

        "'": "&#39;"

    })[character]);

}



function formatDate(value) {

    if (!value) return "Just now";



    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Recently";



    return new Intl.DateTimeFormat("en", {

        day: "numeric",

        month: "short",

        year: "numeric"

    }).format(date);

}



// -------------------- LOGIN --------------------



const loginForm = $("#loginForm");



if (loginForm) {

    loginForm.addEventListener("submit", async event => {

        event.preventDefault();



        const email = $("#email").value.trim();

        const password = $("#password").value;

        const message = $("#loginMessage");

        const submitButton = loginForm.querySelector('button[type="submit"]');



        showMessage(message, "");



        if (!email || !password) {

            showMessage(message, "Please enter your email and password.");

            return;

        }



        submitButton.disabled = true;



        try {

            const data = await apiRequest("/login", {
                method: "POST",
                body: JSON.stringify({ email, password })
            });
            sessionStorage.setItem("cloudnotes_token", data.token);



            window.location.assign("/dashboard");

        } catch (error) {

            showMessage(message, error.message);

        } finally {

            submitButton.disabled = false;

        }

    });

}



// -------------------- REGISTRATION --------------------



const registerForm = $("#registerForm");



if (registerForm) {

    registerForm.addEventListener("submit", async event => {

        event.preventDefault();



        const username = $("#username").value.trim();

        const email = $("#registerEmail").value.trim();

        const password = $("#registerPassword").value;

        const message = $("#registerMessage");

        const submitButton = registerForm.querySelector('button[type="submit"]');



        showMessage(message, "");



        if (!username || !email || !password) {

            showMessage(message, "Please complete every field.");

            return;

        }



        if (password.length < 8) {

            showMessage(message, "Password must contain at least 8 characters.");

            return;

        }



        submitButton.disabled = true;

        try {

            const data = await apiRequest("/register", {
                method: "POST",
                body: JSON.stringify({ username, email, password })
            });
            sessionStorage.setItem("cloudnotes_token", data.token);



            // Registration creates a session, so the user is already logged in.

            window.location.assign("/dashboard");

        } catch (error) {

            showMessage(message, error.message);

        } finally {

            submitButton.disabled = false;

        }

    });

}



// -------------------- DASHBOARD --------------------



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



let notes = [];

let editingNoteId = null;

let deletingNoteId = null;

let searchTimer = null;



function renderNotes() {

    if (!notesGrid) return;



    notesCount.textContent =

        `${notes.length} ${notes.length === 1 ? "note" : "notes"}`;



    notesGrid.innerHTML = notes.map(note => `

        <article class="note-card">

            <h3>${escapeHTML(note.title)}</h3>

            <p class="note-content">${escapeHTML(note.content)}</p>

            <p class="note-date">Updated ${formatDate(note.updated_at)}</p>

            <div class="note-actions">

                <button type="button" data-action="edit"

                    data-id="${note.id}">Edit</button>

                <button type="button" class="delete-action"

                    data-action="delete" data-id="${note.id}">Delete</button>

            </div>

        </article>

    `).join("");



    const hasNotes = notes.length > 0;

    notesGrid.hidden = !hasNotes;

    emptyState.hidden = hasNotes;



    if (!hasNotes) {

        const searching = Boolean(searchInput.value.trim());



        emptyTitle.textContent = searching

            ? "No matching notes"

            : "Your space is still empty";



        emptyDescription.textContent = searching

            ? "Try a different search term."

            : "Create your first note and get your ideas flowing.";

    }

}



async function loadNotes(search = "") {

    if (!notesGrid) return;



    const query = search.trim();

    const url = query

        ? `/api/notes?search=${encodeURIComponent(query)}`

        : "/api/notes";



    try {

        const data = await apiRequest(url);

        notes = data.notes || [];

        renderNotes();

    } catch (error) {

        if (error.message.includes("Authentication required")) {

            sessionStorage.removeItem("cloudnotes_token");
            window.location.assign("/login");

            return;

        }



        notesGrid.hidden = true;

        emptyState.hidden = false;

        emptyTitle.textContent = "Unable to load notes";

        emptyDescription.textContent = error.message;

    }

}



function openCreateDialog() {

    editingNoteId = null;

    noteForm.reset();

    dialogTitle.textContent = "Create a note";

    showMessage(noteMessage, "");

    noteDialog.showModal();

}



function openEditDialog(id) {

    const note = notes.find(item => item.id === id);

    if (!note) return;



    editingNoteId = id;

    noteTitle.value = note.title;

    noteContent.value = note.content;

    dialogTitle.textContent = "Edit note";

    showMessage(noteMessage, "");

    noteDialog.showModal();

}



function openDeleteDialog(id) {

    deletingNoteId = id;

    deleteDialog.showModal();

}



if (notesGrid) {
    if (!sessionStorage.getItem("cloudnotes_token")) {
        window.location.replace("/login");
    } else {
        loadNotes();
    }



    $("#newNoteBtn").addEventListener("click", openCreateDialog);

    $("#emptyCreateBtn").addEventListener("click", openCreateDialog);



    searchInput.addEventListener("input", () => {

        clearTimeout(searchTimer);

        searchTimer = setTimeout(() => loadNotes(searchInput.value), 250);

    });



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



    noteForm.addEventListener("submit", async event => {

        event.preventDefault();



        const title = noteTitle.value.trim();

        const content = noteContent.value;

        const submitButton = noteForm.querySelector('button[type="submit"]');



        if (!title) {

            showMessage(noteMessage, "Please enter a title.");

            return;

        }



        submitButton.disabled = true;



        try {

            if (editingNoteId !== null) {

                await apiRequest(`/api/notes/${editingNoteId}`, {

                    method: "PUT",

                    body: JSON.stringify({ title, content })

                });

            } else {

                await apiRequest("/api/notes", {

                    method: "POST",

                    body: JSON.stringify({ title, content })

                });

            }



            noteDialog.close();

            noteForm.reset();

            editingNoteId = null;

            searchInput.value = "";

            await loadNotes();

        } catch (error) {

            showMessage(noteMessage, error.message);

        } finally {

            submitButton.disabled = false;

        }

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



    $("#confirmDeleteBtn").addEventListener("click", async () => {

        if (deletingNoteId === null) return;



        const button = $("#confirmDeleteBtn");

        button.disabled = true;



        try {

            await apiRequest(`/api/notes/${deletingNoteId}`, {

                method: "DELETE"

            });



            deletingNoteId = null;

            deleteDialog.close();

            await loadNotes(searchInput.value);

        } catch (error) {

            alert(error.message);

        } finally {

            button.disabled = false;

        }

    });



    $("#logoutBtn").addEventListener("click", async () => {

        const button = $("#logoutBtn");

        button.disabled = true;



        try {

            await apiRequest("/logout", { method: "POST" });
            sessionStorage.removeItem("cloudnotes_token");
            window.location.assign("/login");

        } catch (error) {

            alert(error.message);

            button.disabled = false;

        }

    });

}
