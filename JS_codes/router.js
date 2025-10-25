
import { initCapsules, createLearnFlashcard, createLearnQuizCard } from "./capsule.js";
import Storage from "./storage.js";

// utilities
function timeAgo(isoDate) {
  const diff = Math.floor((Date.now() - new Date(isoDate)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// flashcard row
function createFlashcardRow(f = { front: "", back: "" }) {
  const row = document.createElement("div");
  row.className = "d-flex gap-2 mb-2 align-items-start";
  row.innerHTML = `
    <input class="form-control" placeholder="Front" value="${escapeHtml(f.front)}">
    <input class="form-control" placeholder="Back" value="${escapeHtml(f.back)}">
    <button class="btn btn-danger btn-sm">Remove</button>
  `;
  row.querySelector("button").addEventListener("click", () => { row.remove(); autosaveDraft(); });
  row.querySelectorAll("input").forEach(inp => inp.addEventListener("input", autosaveDraft));
  return row;
}

function createQuestionRow(q = { question: "", choices: ["", "", "", ""], answer: 0, explanation: "" }) {
  const row = document.createElement("div");
  row.className = "card card-body mb-2";
  row.innerHTML = `
    <input class="form-control mb-1" placeholder="Question" value="${escapeHtml(q.question)}">
    <div class="d-flex gap-2 mb-1">
      <input class="form-control" placeholder="Choice A" value="${escapeHtml(q.choices[0])}">
      <input class="form-control" placeholder="Choice B" value="${escapeHtml(q.choices[1])}">
    </div>
    <div class="d-flex gap-2 mb-1">
      <input class="form-control" placeholder="Choice C" value="${escapeHtml(q.choices[2])}">
      <input class="form-control" placeholder="Choice D" value="${escapeHtml(q.choices[3])}">
    </div>
    <div class="d-flex gap-2 align-items-center">
      <select class="form-select correct-select" style="width:100px">
        <option value="0">A</option>
        <option value="1">B</option>
        <option value="2">C</option>
        <option value="3">D</option>
      </select>
      <input class="form-control ms-2" placeholder="Explanation" value="${escapeHtml(q.explanation)}">
      <button class="btn btn-danger btn-sm ms-2">Remove</button>
    </div>
  `;
  row.querySelector(".correct-select").value = q.answer;
  row.querySelector("button").addEventListener("click", () => { row.remove(); autosaveDraft(); });
  row.querySelectorAll("input, select").forEach(el => el.addEventListener("input", autosaveDraft));
  return row;
}

function loadDraftToForm() {
  const draft = JSON.parse(localStorage.getItem("capsule_draft") || "{}");
  if (!draft.meta) return;

  ["metaTitle","metaSubject","metaLevel","metaDescription"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = draft.meta[id.replace("meta","").toLowerCase()] || (id === "metaLevel" ? "Beginner" : "");
  });

  const notesEditor = document.getElementById("notesEditor");
  if (notesEditor) notesEditor.value = (draft.notes || []).join("\n");

  const flashcardsContainer = document.getElementById("flashcardsContainer");
  if (flashcardsContainer) {
    flashcardsContainer.innerHTML = "";
    (draft.flashcards || []).forEach(f => flashcardsContainer.appendChild(createFlashcardRow(f)));
  }

  const quizContainer = document.getElementById("quizContainer");
  if (quizContainer) {
    quizContainer.innerHTML = "";
    (draft.quiz || []).forEach(q => quizContainer.appendChild(createQuestionRow(q)));
  }
}

function autosaveDraft() {
  const draft = {
    meta: {
      title: document.getElementById("metaTitle")?.value || "",
      subject: document.getElementById("metaSubject")?.value || "",
      level: document.getElementById("metaLevel")?.value || "Beginner",
      description: document.getElementById("metaDescription")?.value || ""
    },
    notes: (document.getElementById("notesEditor")?.value || "").split("\n").filter(l => l.trim()),
    flashcards: Array.from(document.getElementById("flashcardsContainer")?.children || []).map(r => {
      const inputs = r.querySelectorAll("input");
      return { front: inputs[0].value, back: inputs[1].value };
    }),
    quiz: Array.from(document.getElementById("quizContainer")?.children || []).map(c => {
      const inputs = c.querySelectorAll("input");
      const select = c.querySelector("select");
      return { question: inputs[0].value, choices:[inputs[1].value,inputs[2].value,inputs[3].value,inputs[4].value], answer: parseInt(select.value,10), explanation: inputs[5]?.value || "" };
    })
  };
  localStorage.setItem("capsule_draft", JSON.stringify(draft));
}

// router
const Router = {
  routes: {
    "/": () => `
      <div class="container my-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h3>Library</h3>
            <p class="text-muted mb-0">Your saved capsules</p>
          </div>
          <div class="d-flex gap-2">
            <button id="importJsonBtn" class="btn btn-json">Import JSON</button>
            <button class="btn btn-primary1 fw-bold" id="newCapsBtnFromLibrary">New Capsule</button>
          </div>
        </div>
        <div id="capsuleContainer" class="row g-3 mt-4"></div>
      </div>
    `,
    "/author": () => `
      <div class="container my-4">
        <h3>Create Capsule</h3>
        <form id="capsuleForm">
          <input type="text" id="metaTitle" class="form-control mb-2" placeholder="Title" required>
          <input type="text" id="metaSubject" class="form-control mb-2" placeholder="Subject">
          <select id="metaLevel" class="form-select mb-2">
            <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
          </select>
          <textarea id="metaDescription" class="form-control mb-2" placeholder="Description"></textarea>
          <textarea id="notesEditor" class="form-control mb-2" placeholder="Notes (one per line)"></textarea>

          <h5>Flashcards</h5>
          <div id="flashcardsContainer"></div>
          <button type="button" class="btn btn-lightblue btn-sm mt-2" id="addFlashcardBtn">Add Flashcard</button>

          <h5>Quiz Questions</h5>
          <div id="quizContainer"></div>
          <button type="button" class="btn btn-lightgreen btn-sm mt-2" id="addQuestionBtn">Add Question</button>

          <div class="d-flex gap-2 mt-3">
            <button type="button" class="btn btn-primary1" id="saveCapsuleBtn">Save Capsule</button>
            <button type="button" class="btn btn-salmon" id="clearDraftBtn">Clear Draft</button>
            <button type="button" class="btn btn-json" id="importJsonBtnAuthor">Import JSON</button>
          </div>
        </form>
      </div>
    `,
    "/learn": () => `
      <div class="container my-4">
        <h3>Learn Capsules</h3>
        <div id="capsulesListLearn" class="d-flex flex-wrap gap-2 mb-3"></div>
        <div id="notesContainer" class="p-3 border rounded bg-white mb-3" style="display:none;"></div>
        <div id="flashcardsContainerLearn" class="d-flex flex-wrap gap-3 mb-3" style="display:none;"></div>
        <div id="quizContainerLearn" class="mb-3" style="display:none;"></div>
        <div class="d-flex gap-2">
          <button class="btn btn-lightblue" id="showNotesBtn">Notes</button>
          <button class="btn btn-lightgreen" id="showFlashcardsBtn">Flashcards</button>
          <button class="btn btn-pink" id="showQuizBtn">Quiz</button>
        </div>
      </div>
    `
  },

  init() {
    document.querySelectorAll("a.nav-link").forEach(link => {
      link.addEventListener("click", e => { e.preventDefault(); Router.nav(link.getAttribute("href")); });
    });
    window.addEventListener("popstate", e => Router.nav(e.state?.route || "/", false));
    Router.nav(window.location.pathname, false);
  },

  nav(route, addToHistory = true) {
    const entry = document.querySelector("#entry");
    if (!entry) return console.error("#entry element missing!");
    if (addToHistory) history.pushState({ route }, "", route);
    entry.innerHTML = Router.routes[route]?.() || "<h1>Page not found</h1>";

    initCapsules();
//JSON IMPORT
    const importBtns = [
      document.getElementById("importJsonBtn"),
      document.getElementById("importJsonBtnAuthor")
    ];
    importBtns.forEach(btn => {
      if (!btn) return;
      btn.addEventListener("click", () => {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".json";
        fileInput.addEventListener("change", async e => {
          const file = e.target.files[0];
          if (!file) return;
          const text = await file.text();
          try {
            const parsed = JSON.parse(text);
            Storage.importCapsule(parsed);
            alert(`Imported capsule "${parsed.capsule.meta.title}" successfully!`);
            Router.nav("/");
          } catch {
            alert("Failed to import JSON. Make sure it matches the correct schema.");
          }
        });
        fileInput.click();
      });
    });

    // LIBRARY PAGE
    if (route === "/") {
      const container = document.getElementById("capsuleContainer");
      const capsules = Storage.listIndex();
      container.innerHTML = "";

      if (!capsules.length) {
        container.innerHTML = `<div class="col-12 p-4 bg-light rounded-3 shadow-sm text-center">
          <h3>No capsules yet</h3>
          <p>Create a capsule or import JSON to get started.</p>
        </div>`;
      } else {
        capsules.forEach(meta => {
          const progress = Storage.getProgress(meta.id);
          const col = document.createElement("div");
          col.className = "col-md-4";
          col.innerHTML = `
            <div class="card h-100 shadow-sm">
              <div class="card-body d-flex flex-column">
                <h5 class="card-title mb-1">${meta.title || "Untitled"}</h5>
                <div class="mb-2">
                  <span class="badge bg-info me-1">${meta.level || "Unknown"}</span>
                  <small class="text-muted">${meta.subject || ""}</small>
                  <small class="text-muted float-end">${meta.updatedAt ? timeAgo(meta.updatedAt) : ""}</small>
                </div>
                <div class="mb-2">
                  <small>Best Quiz Score: ${progress.bestScore || 0}%</small>
                  <div class="progress mb-1">
                    <div class="progress-bar bg-success" role="progressbar" style="width:${progress.bestScore || 0}%"></div>
                  </div>
                  <small>Known Flashcards: ${progress.knownFlashcards?.length || 0}</small>
                  <div class="progress">
                    <div class="progress-bar bg-warning" role="progressbar" style="width:${Math.min(progress.knownFlashcards?.length || 0, 100)}%"></div>
                  </div>
                </div>
                <div class="mt-auto d-flex gap-2">
                  <button class="btn btn-primary btn-sm" data-action="edit">Edit</button>
                  <button class="btn btn-secondary btn-sm" data-action="export">Export</button>
                  <button class="btn btn-success btn-sm" data-action="learn">Learn</button>
                  <button class="btn btn-danger btn-sm" data-action="delete">Delete</button>
                </div>
              </div>
            </div>`;
          container.appendChild(col);

          col.querySelectorAll("button").forEach(btn => {
            btn.addEventListener("click", () => {
              const action = btn.dataset.action;
              switch (action) {
                case "edit":
                  localStorage.setItem("capsule_draft", JSON.stringify(Storage.loadCapsule(meta.id)));
                  Router.nav("/author");
                  break;
                case "delete":
                  if (confirm(`Delete "${meta.title}"?`)) { Storage.deleteCapsule(meta.id); Router.nav("/"); }
                  break;
                case "export":
                  const full = Storage.loadCapsule(meta.id);
                  const blob = new Blob([Storage.exportCapsuleJSON(full)], { type: "application/json" });
                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(blob);
                  link.download = `${meta.title || "capsule"}.json`;
                  link.click();
                  break;
                case "learn":
                  Router.nav("/learn");
                  break;
              }
            });
          });
        });
      }

      document.getElementById("newCapsBtnFromLibrary")?.addEventListener("click", () => Router.nav("/author"));
    }

    // author page
    if (route === "/author") {
      loadDraftToForm();

      document.getElementById("addFlashcardBtn")?.addEventListener("click", () => {
        document.getElementById("flashcardsContainer")?.appendChild(createFlashcardRow());
      });

      document.getElementById("addQuestionBtn")?.addEventListener("click", () => {
        document.getElementById("quizContainer")?.appendChild(createQuestionRow());
      });

      document.getElementById("clearDraftBtn")?.addEventListener("click", () => {
        if (confirm("Clear draft?")) { localStorage.removeItem("capsule_draft"); Router.nav("/author"); }
      });

      document.getElementById("saveCapsuleBtn")?.addEventListener("click", () => {
        const draft = JSON.parse(localStorage.getItem("capsule_draft") || "{}");
        if (!draft.meta || !draft.meta.title) return alert("Title required");
        Storage.saveCapsule(draft);
        localStorage.removeItem("capsule_draft");
        alert("Saved successfully!");
        Router.nav("/");
      });
    }

    // learn page
    if (route === "/learn") {
      const notes = document.getElementById("notesContainer");
      const flash = document.getElementById("flashcardsContainerLearn");
      const quiz = document.getElementById("quizContainerLearn");

      function hideAll() { notes.style.display = flash.style.display = quiz.style.display = "none"; }
      document.getElementById("showNotesBtn")?.addEventListener("click", () => { hideAll(); notes.style.display="block"; });
      document.getElementById("showFlashcardsBtn")?.addEventListener("click", () => { hideAll(); flash.style.display="flex"; });
      document.getElementById("showQuizBtn")?.addEventListener("click", () => { hideAll(); quiz.style.display="block"; });
    }

    window.scrollTo(0,0);
  }
};

export default Router;
