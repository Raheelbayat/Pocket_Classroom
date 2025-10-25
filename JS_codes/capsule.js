import StorageDefault from "./storage.js";

const Storage = (StorageDefault && typeof StorageDefault.listIndex === "function")
  ? StorageDefault
  : (StorageDefault.default && typeof StorageDefault.default.listIndex === "function")
  ? StorageDefault.default
  : (() => {
      console.error("Storage module invalid or not loaded properly.");
      return {
        listIndex: () => [],
        saveCapsule: () => {},
        loadCapsule: () => null,
        deleteCapsule: () => {},
        getProgress: () => ({ bestScore: 0, knownFlashcards: [] }),
        saveProgress: () => {},
        exportCapsuleJSON: () => "{}",
        importCapsule: () => null
      };
    })();

// Escape HTML
function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// author page

function createFlashcardRow(f = { front: "", back: "" }) {
  const row = document.createElement("div");
  row.className = "d-flex gap-2 mb-2 align-items-start";
  row.innerHTML = `
    <label class="visually-hidden">Front</label>
    <input class="form-control" placeholder="Front" value="${escapeHtml(f.front)}">
    <label class="visually-hidden">Back</label>
    <input class="form-control" placeholder="Back" value="${escapeHtml(f.back)}">
    <button class="btn btn-danger btn-sm" aria-label="Remove flashcard">Remove</button>
  `;
  row.querySelector("button").addEventListener("click", () => {
    row.remove();
    autosaveDraft();
  });
  row.querySelectorAll("input").forEach(inp => inp.addEventListener("input", autosaveDraft));
  return row;
}

function createQuestionRow(q = { question: "", choices: ["", "", "", ""], answer: 0, explanation: "" }) {
  const row = document.createElement("div");
  row.className = "card card-body mb-2";
  row.innerHTML = `
    <div class="mb-2">
      <label class="visually-hidden">Question</label>
      <input class="form-control" placeholder="Question" value="${escapeHtml(q.question)}">
    </div>
    <div class="d-flex gap-2 mb-2">
      <label class="visually-hidden">Choice A</label>
      <input class="form-control" placeholder="Choice A" value="${escapeHtml(q.choices[0])}">
      <label class="visually-hidden">Choice B</label>
      <input class="form-control" placeholder="Choice B" value="${escapeHtml(q.choices[1])}">
    </div>
    <div class="d-flex gap-2 mb-2">
      <label class="visually-hidden">Choice C</label>
      <input class="form-control" placeholder="Choice C" value="${escapeHtml(q.choices[2])}">
      <label class="visually-hidden">Choice D</label>
      <input class="form-control" placeholder="Choice D" value="${escapeHtml(q.choices[3])}">
    </div>
    <div class="d-flex gap-2 align-items-center">
      <label class="form-label mb-0 me-2">Correct</label>
      <select class="form-select correct-select" style="width:120px">
        <option value="0">A</option>
        <option value="1">B</option>
        <option value="2">C</option>
        <option value="3">D</option>
      </select>
      <input class="form-control ms-2" placeholder="Explanation" value="${escapeHtml(q.explanation)}">
      <button class="btn btn-danger btn-sm ms-2" aria-label="Remove question">Remove</button>
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

  const mapping = {
    metaTitle: "title",
    metaSubject: "subject",
    metaLevel: "level",
    metaDescription: "description"
  };
  Object.keys(mapping).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = draft.meta[mapping[id]] || (id === "metaLevel" ? "Beginner" : "");
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
      const selects = c.querySelectorAll("select");
      return {
        question: inputs[0].value,
        choices: [inputs[1].value, inputs[2].value, inputs[3].value, inputs[4].value],
        answer: parseInt(selects[0].value, 10),
        explanation: inputs[5]?.value || ""
      };
    })
  };
  localStorage.setItem("capsule_draft", JSON.stringify(draft));
}

// library

function loadStructuredCapsules() {
  const container = document.getElementById("capsuleContainer");
  if (!container) return;

  const capsules = Storage.listIndex();
  container.innerHTML = "";

  if (capsules.length === 0) {
    container.innerHTML = `<section class="p-4 bg-light rounded-3 shadow-sm text-center mt-3" aria-label="No capsules">
      <h3>No capsules yet</h3>
      <p>Create a capsule or import JSON to get started.</p>
    </section>`;
    return;
  }

  capsules.forEach(meta => {
    const div = document.createElement("section");
    div.className = "capsule-item shadow-sm p-3 mb-3 rounded bg-white";
    div.dataset.id = meta.id;
    const timestamp = meta.updatedAt ? new Date(meta.updatedAt).toLocaleString() : "";
    div.innerHTML = `
      <div class="d-flex flex-column justify-content-between h-100">
        <div>
          <h5>${escapeHtml(meta.title || "Untitled")}</h5>
          <small class="text-muted">${escapeHtml(meta.subject || "")} • ${escapeHtml(meta.level || "Unknown")} • ${timestamp}</small>
        </div>
        <div class="mt-3 d-flex gap-2">
          <button class="btn btn-sm btn-primary" data-action="edit" aria-label="Edit ${escapeHtml(meta.title)}">Edit</button>
          <button class="btn btn-sm btn-secondary" data-action="export" aria-label="Export ${escapeHtml(meta.title)}">Export</button>
          <button class="btn btn-sm btn-success" data-action="learn" aria-label="Learn ${escapeHtml(meta.title)}">Learn</button>
          <button class="btn btn-sm btn-danger" data-action="delete" aria-label="Delete ${escapeHtml(meta.title)}">Delete</button>
        </div>
      </div>`;
    container.appendChild(div);
  });

  container.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      const id = btn.closest(".capsule-item").dataset.id;
      const capsuleMeta = Storage.listIndex().find(c => c.id === id);
      if (!capsuleMeta) return;

      switch (action) {
        case "edit":
          localStorage.setItem("capsule_draft", JSON.stringify(Storage.loadCapsule(id)));
          window.app?.router?.nav("/author");
          break;
        case "delete":
          if (confirm(`Delete "${capsuleMeta.title}"?`)) {
            Storage.deleteCapsule(id);
            loadStructuredCapsules();
          }
          break;
        case "export":
          const fullCapsule = Storage.loadCapsule(id);
          const blob = new Blob([Storage.exportCapsuleJSON(fullCapsule)], { type: "application/json" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `${capsuleMeta.title || "capsule"}.json`;
          link.click();
          break;
        case "learn":
          window.location.href = `/learn?capsule=${encodeURIComponent(id)}`;
          break;
      }
    });
  });
}

// learn page

export function createLearnFlashcard(f = { front: "", back: "" }) {
  const wrapper = document.createElement("article");
  wrapper.className = "flashcard-wrapper mb-2";
  wrapper.setAttribute("role", "button");
  wrapper.setAttribute("aria-label", "Flashcard. Press space to flip");
  wrapper.tabIndex = 0;
  wrapper.style.perspective = "1000px";

  const card = document.createElement("div");
  card.className = "flashcard";
  Object.assign(card.style, {
    width: "100%", height: "200px", position: "relative",
    transformStyle: "preserve-3d", transition: "transform 0.6s"
  });

  const front = document.createElement("div");
  front.className = "flashcard-face flashcard-front";
  Object.assign(front.style, {
    background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    position: "absolute", inset: "0", backfaceVisibility: "hidden", borderRadius: "10px",
    boxShadow: "2px 4px 12px rgba(0,0,0,0.15)"
  });
  front.textContent = f.front;

  const back = document.createElement("div");
  back.className = "flashcard-face flashcard-back";
  Object.assign(back.style, {
    background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center",
    position: "absolute", inset: "0", backfaceVisibility: "hidden", borderRadius: "10px",
    boxShadow: "2px 4px 12px rgba(0,0,0,0.15)", transform: "rotateY(180deg)"
  });
  back.textContent = f.back;

  card.append(front, back);
  wrapper.appendChild(card);

  const flipCard = () => {
    const rotated = card.style.transform.includes("180deg");
    card.style.transform = rotated ? "rotateY(0deg)" : "rotateY(180deg)";
    wrapper.setAttribute("aria-pressed", rotated ? "false" : "true");
  };

  wrapper.addEventListener("click", flipCard);
  wrapper.addEventListener("keydown", e => { if (e.code === "Space") { e.preventDefault(); flipCard(); } });

  return wrapper;
}

export function createLearnQuizCard(q = { question: "", choices: [], answer: 0, explanation: "" }, index = 0) {
  const card = document.createElement("article");
  card.className = "card card-body mb-2";
  card.setAttribute("aria-label", `Question ${index + 1}`);

  const questionEl = document.createElement("h6");
  questionEl.textContent = `${index + 1}. ${q.question}`;
  card.appendChild(questionEl);

  const choicesContainer = document.createElement("div");
  choicesContainer.className = "d-flex flex-column gap-1";

  q.choices.forEach((choiceText, i) => {
    const btn = document.createElement("button");
    btn.className = "btn btn-light btn-sm text-start";
    btn.textContent = choiceText;
    btn.dataset.index = i;
    btn.setAttribute("aria-label", `Choice ${i+1}`);
    btn.addEventListener("click", () => {
      choicesContainer.querySelectorAll("button").forEach(b => b.disabled = true);
      if (i === q.answer) btn.classList.add("btn-success");
      else {
        btn.classList.add("btn-danger");
        const correctBtn = choicesContainer.querySelector(`button[data-index='${q.answer}']`);
        if (correctBtn) correctBtn.classList.add("btn-success");
      }
      if (q.explanation) {
        const exp = document.createElement("p");
        exp.className = "mt-1 text-muted";
        exp.textContent = q.explanation;
        card.appendChild(exp);
      }
    });
    choicesContainer.appendChild(btn);
  });

  card.appendChild(choicesContainer);
  return card;
}

// 

export function initCapsules() {
  const path = window.location.pathname;

  // author part
  if (path === "/author") {
    loadDraftToForm();
    ["metaTitle", "metaSubject", "metaLevel", "metaDescription", "notesEditor"].forEach(id => {
      document.getElementById(id)?.addEventListener("input", autosaveDraft);
    });

    document.getElementById("addFlashcardBtn")?.addEventListener("click", () => {
      document.getElementById("flashcardsContainer")?.appendChild(createFlashcardRow());
      autosaveDraft();
    });

    document.getElementById("addQuestionBtn")?.addEventListener("click", () => {
      document.getElementById("quizContainer")?.appendChild(createQuestionRow());
      autosaveDraft();
    });

    document.getElementById("saveCapsuleBtn")?.addEventListener("click", () => {
      const draft = JSON.parse(localStorage.getItem("capsule_draft") || "{}");
      if (!draft.meta?.title) return alert("Please enter a title.");
      draft.createdAt = draft.createdAt || new Date().toISOString();
      Storage.saveCapsule(draft);
      localStorage.removeItem("capsule_draft");
      alert("Capsule saved!");
      window.app?.router?.nav("/");
    });

    document.getElementById("clearDraftBtn")?.addEventListener("click", () => {
      localStorage.removeItem("capsule_draft");
      document.getElementById("capsuleForm")?.reset();
      alert("Draft cleared!");
    });
  }

  // library
  if (path === "/") loadStructuredCapsules();

  // learn
  if (path === "/learn") {
    const capsuleId = new URLSearchParams(window.location.search).get("capsule");
    const capsulesListContainer = document.getElementById("capsulesListLearn");
    const notesContainer = document.getElementById("notesContainer");
    const flashcardsContainer = document.getElementById("flashcardsContainerLearn");
    const quizContainer = document.getElementById("quizContainerLearn");

    function hideAllTabs() {
      notesContainer.style.display = "none";
      flashcardsContainer.style.display = "none";
      quizContainer.style.display = "none";
    }

    const showNotesBtn = document.getElementById("showNotesBtn");
    if (showNotesBtn) showNotesBtn.addEventListener("click", () => { hideAllTabs(); notesContainer.style.display = "block"; });
    const showFlashcardsBtn = document.getElementById("showFlashcardsBtn");
    if (showFlashcardsBtn) showFlashcardsBtn.addEventListener("click", () => { hideAllTabs(); flashcardsContainer.style.display = "flex"; });
    const showQuizBtn = document.getElementById("showQuizBtn");
    if (showQuizBtn) showQuizBtn.addEventListener("click", () => { hideAllTabs(); quizContainer.style.display = "block"; });

    // Keyboard navigation....I dont know why my learn page is not working. I could not fix it....
    document.addEventListener("keydown", e => {
      if (["[", "/", "]", "Space"].includes(e.key)) e.preventDefault();
      if (e.key === "Space") {
        const activeCard = document.activeElement.closest(".flashcard-wrapper");
        if (activeCard) activeCard.click();
      }
      if (e.key === "[") showNotesBtn?.click();
      if (e.key === "/") showFlashcardsBtn?.click();
      if (e.key === "]") showQuizBtn?.click();
    });

    if (!capsuleId) {
      const allCapsules = Storage.listIndex();
      capsulesListContainer.innerHTML = "";
      if (allCapsules.length === 0) {
        capsulesListContainer.innerHTML = `<p>No capsules available. Create one in Author page.</p>`;
      } else {
        allCapsules.forEach(c => {
          const btn = document.createElement("button");
          btn.textContent = `${c.title} (${c.subject || "No subject"})`;
          btn.className = "btn btn-outline-primary m-2";
          btn.addEventListener("click", () => window.location.href = `/learn?capsule=${c.id}`);
          capsulesListContainer.appendChild(btn);
        });
      }
      return;
    }

    // load content+Capsule exists
    const capsule = Storage.loadCapsule(capsuleId);
    if (!capsule) return;

    hideAllTabs();
    notesContainer.style.display = "block";

    notesContainer.innerHTML = "";
    (capsule.notes || []).forEach(n => {
      const p = document.createElement("p");
      p.textContent = n;
      notesContainer.appendChild(p);
    });

    flashcardsContainer.innerHTML = "";
    (capsule.flashcards || []).forEach(f => flashcardsContainer.appendChild(createLearnFlashcard(f)));

    quizContainer.innerHTML = "";
    (capsule.quiz || []).forEach((q,i) => quizContainer.appendChild(createLearnQuizCard(q,i)));
  }

  console.log(`initCapsules loaded for ${path}`);
}
