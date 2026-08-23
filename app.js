const state = {
  sections: [],
  count: 0,
  shuffle: true,
  questions: [], // flattened, with sectionName attached
  index: 0,
  answers: [], // {selected, correct}
};

const setupEl = document.getElementById("setup");
const quizEl = document.getElementById("quiz");
const resultsEl = document.getElementById("results");

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Setup screen ----------
function buildSetup() {
  const list = document.getElementById("sectionList");
  list.innerHTML = "";
  Object.keys(QUIZ_DATA).forEach((sectionName) => {
    const qs = QUIZ_DATA[sectionName];
    const id = "sec-" + sectionName.replace(/\W+/g, "-");
    const label = document.createElement("label");
    label.className = "section-item";
    label.innerHTML = `
      <input type="checkbox" id="${id}" value="${sectionName}" checked />
      <span>${sectionName.replace(/^Section \d+:\s*/, "")}</span>
      <span class="count">${qs.length} Q</span>
    `;
    list.appendChild(label);
  });
}

document.getElementById("selectAll").addEventListener("click", () => {
  document.querySelectorAll("#sectionList input[type=checkbox]").forEach((cb) => (cb.checked = true));
});
document.getElementById("selectNone").addEventListener("click", () => {
  document.querySelectorAll("#sectionList input[type=checkbox]").forEach((cb) => (cb.checked = false));
});

document.getElementById("startBtn").addEventListener("click", () => {
  const checked = Array.from(document.querySelectorAll("#sectionList input[type=checkbox]:checked")).map(
    (cb) => cb.value
  );
  if (checked.length === 0) return;

  let pool = [];
  checked.forEach((sectionName) => {
    QUIZ_DATA[sectionName].forEach((q) => {
      pool.push({ ...q, section: sectionName });
    });
  });

  const shuffleQ = document.getElementById("shuffleQuestions").checked;
  const shuffleOpt = document.getElementById("shuffleOptions").checked;
  const limitVal = document.getElementById("questionLimit").value;

  if (shuffleQ) pool = shuffleArray(pool);

  const limit = limitVal === "all" ? pool.length : Math.min(parseInt(limitVal, 10), pool.length);
  pool = pool.slice(0, limit);

  if (shuffleOpt) {
    pool = pool.map((q) => {
      const order = shuffleArray(q.options.map((_, i) => i));
      const options = order.map((i) => q.options[i]);
      const answer = order.indexOf(q.answer);
      return { ...q, options, answer };
    });
  }

  state.questions = pool;
  state.index = 0;
  state.answers = new Array(pool.length).fill(null);

  setupEl.classList.add("hidden");
  resultsEl.classList.add("hidden");
  quizEl.classList.remove("hidden");
  renderQuestion();
});

// ---------- Quiz screen ----------
function renderQuestion() {
  const q = state.questions[state.index];
  const total = state.questions.length;

  document.getElementById("progressLabel").textContent = `Question ${state.index + 1} of ${total}`;
  document.getElementById("scoreLabel").textContent = `Score: ${state.answers.filter((a) => a && a.correct).length}`;
  document.getElementById("progressFill").style.width = `${((state.index) / total) * 100}%`;

  document.getElementById("sectionTag").textContent = q.section.replace(/^Section \d+:\s*/, "Section ").trim();
  document.getElementById("questionText").textContent = q.q;

  const optionsEl = document.getElementById("optionsList");
  optionsEl.innerHTML = "";
  const letters = ["A", "B", "C", "D", "E", "F"];

  const existingAnswer = state.answers[state.index];

  q.options.forEach((opt, i) => {
    const div = document.createElement("div");
    div.className = "option";
    div.innerHTML = `<span class="letter">${letters[i]}</span><span>${opt}</span>`;
    if (existingAnswer) {
      div.classList.add("disabled");
      if (i === q.answer) div.classList.add("correct");
      if (i === existingAnswer.selected && i !== q.answer) div.classList.add("incorrect");
      if (i === existingAnswer.selected && i === q.answer) div.classList.add("selected");
    } else {
      div.addEventListener("click", () => selectOption(i));
    }
    optionsEl.appendChild(div);
  });

  const feedback = document.getElementById("feedback");
  if (existingAnswer) {
    feedback.classList.remove("hidden");
    feedback.classList.toggle("good", existingAnswer.correct);
    feedback.classList.toggle("bad", !existingAnswer.correct);
    let msg = existingAnswer.correct ? "Correct!" : `Incorrect. Correct answer: ${q.options[q.answer]}`;
    if (q.note) msg += ` — ${q.note}`;
    feedback.textContent = msg;
  } else {
    feedback.classList.add("hidden");
    feedback.textContent = "";
  }

  document.getElementById("prevBtn").disabled = state.index === 0;
  document.getElementById("nextBtn").disabled = !existingAnswer;
  document.getElementById("nextBtn").textContent = state.index === total - 1 ? "Finish" : "Next";
}

function selectOption(i) {
  const q = state.questions[state.index];
  state.answers[state.index] = { selected: i, correct: i === q.answer };
  renderQuestion();
}

document.getElementById("prevBtn").addEventListener("click", () => {
  if (state.index > 0) {
    state.index -= 1;
    renderQuestion();
  }
});

document.getElementById("nextBtn").addEventListener("click", () => {
  if (state.index < state.questions.length - 1) {
    state.index += 1;
    renderQuestion();
  } else {
    showResults();
  }
});

document.getElementById("quitBtn").addEventListener("click", () => {
  if (confirm("Quit this quiz and return to setup? Your progress will be lost.")) {
    quizEl.classList.add("hidden");
    setupEl.classList.remove("hidden");
  }
});

// ---------- Results screen ----------
function showResults() {
  quizEl.classList.add("hidden");
  resultsEl.classList.remove("hidden");

  const total = state.questions.length;
  const correct = state.answers.filter((a) => a && a.correct).length;
  const pct = total ? Math.round((correct / total) * 100) : 0;

  document.getElementById("scoreBig").textContent = `${correct} / ${total}`;
  document.getElementById("scorePct").textContent = `${pct}%`;

  let verdict = "Keep practicing!";
  if (pct >= 90) verdict = "Excellent! You know your Python.";
  else if (pct >= 75) verdict = "Great job!";
  else if (pct >= 50) verdict = "Good effort — review the misses below.";
  document.getElementById("scoreVerdict").textContent = verdict;

  const bySection = {};
  state.questions.forEach((q, i) => {
    const s = q.section;
    bySection[s] = bySection[s] || { correct: 0, total: 0 };
    bySection[s].total += 1;
    if (state.answers[i] && state.answers[i].correct) bySection[s].correct += 1;
  });

  const breakdownEl = document.getElementById("sectionBreakdown");
  breakdownEl.innerHTML = "";
  Object.keys(bySection).forEach((s) => {
    const { correct: c, total: t } = bySection[s];
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<span>${s}</span><span>${c} / ${t}</span>`;
    breakdownEl.appendChild(row);
  });

  const reviewEl = document.getElementById("reviewList");
  reviewEl.innerHTML = "";
  const letters = ["A", "B", "C", "D", "E", "F"];
  state.questions.forEach((q, i) => {
    const a = state.answers[i];
    const item = document.createElement("div");
    item.className = "review-item " + (a && a.correct ? "correct" : "incorrect");
    const yourAns = a ? `${letters[a.selected]}. ${q.options[a.selected]}` : "Not answered";
    let html = `<div class="q">${i + 1}. ${q.q}</div>`;
    html += `<div class="ans-line ${a && a.correct ? "correct-line" : "incorrect-line"}">Your answer: ${yourAns}</div>`;
    if (!a || !a.correct) {
      html += `<div class="ans-line correct-line">Correct answer: ${letters[q.answer]}. ${q.options[q.answer]}</div>`;
    }
    if (q.note) html += `<div class="note">Note: ${q.note}</div>`;
    item.innerHTML = html;
    reviewEl.appendChild(item);
  });
}

document.getElementById("retryBtn").addEventListener("click", () => {
  state.index = 0;
  state.answers = new Array(state.questions.length).fill(null);
  resultsEl.classList.add("hidden");
  quizEl.classList.remove("hidden");
  renderQuestion();
});

document.getElementById("newQuizBtn").addEventListener("click", () => {
  resultsEl.classList.add("hidden");
  setupEl.classList.remove("hidden");
});

buildSetup();
