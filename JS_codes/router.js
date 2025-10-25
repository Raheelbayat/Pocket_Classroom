import { initCapsules } from "./capsule.js";
import Storage from "./storage.js";

const Router = {
  routes: {
    "/": () => `
      <div class="container my-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h3 class="mb-0">Library</h3>
            <p class="text-muted mb-0">Your saved capsules</p>
          </div>
          <div class="d-flex gap-2">
            <button id="importJsonBtn" class="btn btn-json">Import JSON</button>
            <button class="btn btn-primary1 fw-bold" id="newCapsBtnFromLibrary">New Capsule</button>
          </div>
        </div>
        <div id="capsuleContainer" class="container-3-for-newCapsule mt-4"></div>
      </div>
    `,

    "/author": () => `
      <div class="container my-4">
        <h3 class="mb-3 mb-0">Create Capsule</h3>
        <form id="capsuleForm" class="mb-3">
          <div class="mb-2">
            <input type="text" id="metaTitle" class="form-control" placeholder="Title" required>
          </div>
          <div class="mb-2">
            <input type="text" id="metaSubject" class="form-control" placeholder="Subject">
          </div>
          <div class="mb-2">
            <select id="metaLevel" class="form-select">
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
          <div class="mb-2">
            <textarea id="metaDescription" class="form-control" placeholder="Description"></textarea>
          </div>
          <div class="mb-2">
            <textarea id="notesEditor" class="form-control" placeholder="Notes (one per line)"></textarea>
          </div>
          <div class="mb-3">
            <h5>Flashcards</h5>
            <div id="flashcardsContainer"></div>
            <button type="button" class="btn btn-lightblue btn-sm mt-2" id="addFlashcardBtn">Add Flashcard</button>
          </div>
          <div class="mb-3">
            <h5>Quiz Questions</h5>
            <div id="quizContainer"></div>
            <button type="button" class="btn btn-lightgreen btn-sm mt-2" id="addQuestionBtn">Add Question</button>
          </div>
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
        <h3 class="mb-3 mb-0">Learn Capsules</h3>
        <div class="mb-3">
          <select id="selectCapsule" class="form-select">
            <option value="">Select a capsule</option>
          </select>
        </div>
        <div id="learnContent" class="mt-3">
          <div id="notesTab" style="display:none;">

            <div id="notesDisplay"></div>
          </div>
          <div id="flashcardsTab" style="display:none;">

            <div id="flashcardContainer"></div>
          </div>
          
          <div id="quizTab" style="display:none;">
            <div id="quizContainerLearn"></div>
          </div>
        </div>
        <div class="mt-3 d-flex gap-2">
          <button type="button" class="btn btn-lightblue" id="showNotesBtn">Notes</button>
          <button type="button" class="btn btn-lightgreen" id="showFlashcardsBtn">Flashcards</button>
          <button type="button" class="btn btn-pink" id="showQuizBtn">Quiz</button>
        </div>
      </div>

  <div class="tab-content">
    <!-- Notes -->
    <div class="tab-pane fade show active" id="notes" role="tabpanel">
      <div id="notesContainer" class="p-3 border rounded bg-white" style="min-height:150px;">
        <!-- Notes from capsule appear here -->
      </div>
    </div>

    <!-- Flashcards -->
    <div class="tab-pane fade" id="flashcards" role="tabpanel">
      <div id="flashcardsContainerLearn" class="d-flex flex-wrap gap-3">
        <!-- Flashcards from capsule appear here. It is not working right now dear teacher  -->
      </div>
    </div>

    <!-- Quiz -->
    <div class="tab-pane fade" id="quiz" role="tabpanel">
      <div id="quizContainerLearn">
        <!-- Quiz questions from capsule appear here. It is not working right now dear teacher -->
      </div>
    </div>
  </div>
</div>

    `
  },

  init: () => {
    document.querySelectorAll("a.nav-link").forEach(link => {
      link.addEventListener("click", e => {
        e.preventDefault();
        Router.nav(link.getAttribute("href"));
      });
    });

    window.addEventListener("popstate", e => {
      Router.nav(e.state?.route || "/", false);
    });

    Router.nav(window.location.pathname, false);
  },

  nav: (route, addToHistory = true) => {
    const entry = document.querySelector("#entry");
    if (!entry) return console.error("#entry element missing in HTML!");

    if (addToHistory) history.pushState({ route }, "", route);
    entry.innerHTML = Router.routes[route]?.() || "<h1>Page not found</h1>";

    initCapsules();

    // Library pathway to Author
    const newCapsBtn = document.getElementById("newCapsBtnFromLibrary");
    if (newCapsBtn) newCapsBtn.addEventListener("click", () => Router.nav("/author"));

    // JSON Import
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
            const id = Storage.importCapsule(parsed);
            if (id) {
              alert(`Imported capsule "${parsed.capsule.meta.title}"`);
              Router.nav("/");
            } else {
              alert("Failed to import capsule.");
            }
          } catch {
            alert("Invalid JSON file.");
          }
        });
        fileInput.click();
      });
    });

    // Learn page tab buttons
    if (route === "/learn") {
      const notesTab = document.getElementById("notesTab");
      const flashcardsTab = document.getElementById("flashcardsTab");
      const quizTab = document.getElementById("quizTab");
      const notesDisplay = document.getElementById("notesDisplay");
      const flashcardContainer = document.getElementById("flashcardContainer");
      const quizContainerLearn = document.getElementById("quizContainerLearn");
      const selectCaps = document.getElementById("selectCapsule");

      function hideAllTabs() {
        notesTab.style.display = "none";
        flashcardsTab.style.display = "none";
        quizTab.style.display = "none";
      }

      document.getElementById("showNotesBtn").addEventListener("click", () => {
        hideAllTabs();
        notesTab.style.display = "block";
      });
      document.getElementById("showFlashcardsBtn").addEventListener("click", () => {
        hideAllTabs();
        flashcardsTab.style.display = "block";
      });
      document.getElementById("showQuizBtn").addEventListener("click", () => {
        hideAllTabs();
        quizTab.style.display = "block";
      });

      selectCaps.addEventListener("change", () => {
        const id = selectCaps.value;
        if (!id) return;
        const capsule = Storage.loadCapsule(id);
        if (!capsule) return;

        // Notes
        notesDisplay.innerHTML = "";
        if (capsule.notes && capsule.notes.length) {
          capsule.notes.forEach(line => {
            const p = document.createElement("p");
            p.textContent = line;
            notesDisplay.appendChild(p);
          });
        }

        // Flashcards
        flashcardContainer.innerHTML = "";
        if (capsule.flashcards && capsule.flashcards.length) {
          capsule.flashcards.forEach(f => {
            const card = document.createElement("div");
            card.className = "flashcard-wrapper mb-2";
            card.innerHTML = `
              <div class="flashcard">
                <div class="flashcard-face flashcard-front">${f.front}</div>
                <div class="flashcard-face flashcard-back">${f.back}</div>
              </div>`;
            card.querySelector(".flashcard-wrapper, .flashcard").addEventListener("click", () => {
              const fc = card.querySelector(".flashcard");
              fc.classList.toggle("is-flipped");
            });
            flashcardContainer.appendChild(card);
          });
        }

        // Quiz
        quizContainerLearn.innerHTML = "";
        if (capsule.quiz && capsule.quiz.length) {
          capsule.quiz.forEach((q, i) => {
            const card = document.createElement("div");
            card.className = "card card-body mb-2";
            card.innerHTML = `
              <h6>${i+1}. ${q.question}</h6>
              <div class="d-flex flex-column gap-1">
                ${q.choices.map((c,j) => `<button class="btn btn-light btn-sm" data-choice="${j}">${c}</button>`).join("")}
              </div>
              <p class="mt-1 text-success" style="display:none;">Answer: ${q.choices[q.answer]}</p>
              <p class="mt-1 text-muted">${q.explanation || ""}</p>
            `;
            const buttons = card.querySelectorAll("button");
            buttons.forEach(btn => {
              btn.addEventListener("click", () => {
                card.querySelector("p.text-success").style.display = "block";
              });
            });
            quizContainerLearn.appendChild(card);
          });
        }
      });
    }

    window.scrollTo(0, 0);
  }
};

export default Router;
