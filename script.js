const wordData = [
  { word: "How’s it going?", pos: "greeting", zh: "最近怎么样？" },
  { word: "Long time no see.", pos: "small talk", zh: "好久不见。" },
  { word: "I’m on my way.", pos: "plans", zh: "我在路上了。" },
  { word: "Could you say that again?", pos: "clarifying", zh: "你能再说一遍吗？" },
  { word: "That sounds good.", pos: "response", zh: "听起来不错。" },
  { word: "No worries.", pos: "response", zh: "没事/别担心。" },
  { word: "I’m just looking.", pos: "shopping", zh: "我先随便看看。" },
  { word: "Can I get a coffee, please?", pos: "ordering", zh: "请给我来杯咖啡。" },
  { word: "Could I have the bill?", pos: "restaurant", zh: "可以结账吗？" },
  { word: "Where is the restroom?", pos: "asking", zh: "洗手间在哪里？" },
  { word: "What do you recommend?", pos: "restaurant", zh: "你推荐什么？" },
  { word: "Do you have any plans tonight?", pos: "social", zh: "你今晚有安排吗？" },
  { word: "I’ll text you later.", pos: "social", zh: "我晚点给你发消息。" },
  { word: "That works for me.", pos: "agreement", zh: "我可以/没问题。" },
  { word: "Take your time.", pos: "polite", zh: "你慢慢来。" },
  { word: "I’m not sure yet.", pos: "uncertain", zh: "我还不确定。" },
  { word: "Sorry, I’m running late.", pos: "time", zh: "抱歉，我要迟到了。" },
  { word: "Can you help me out?", pos: "request", zh: "你能帮我一下吗？" }
];

const quizData = [
  {
    text: "A: Hey, long time no see! B: Yeah! ___?",
    answer: "How’s it going"
  },
  {
    text: "A: Sorry I’m late. B: ___, I just got here too.",
    answer: "No worries"
  },
  {
    text: "A: Would 7 p.m. be okay? B: Sure, ___.",
    answer: "That works for me"
  },
  {
    text: "A: I can’t hear you clearly. B: Okay. ___?",
    answer: "Could you say that again"
  },
  {
    text: "A: We’re almost out of time. B: Okay, I’ll ___ .",
    answer: "text you later"
  },
  {
    text: "A: Excuse me, I need to wash my hands. B: Sure. ___?",
    answer: "Where is the restroom"
  },
  {
    text: "A: What should I order here? B: You can ask, “___?”",
    answer: "What do you recommend"
  },
  {
    text: "A: I’m almost there. B: Great, see you soon. A: I’m ___ .",
    answer: "on my way"
  }
];

const fallbackReadingData = {
  title: "Daily Conversation · Coffee Shop",
  content:
    "A: Hi, how’s it going? B: Pretty good. Can I get a latte, please? A: Sure. Anything else? B: That’s all, thanks. A: No worries. It’ll be ready in five minutes. B: Great. Could I have it to go? A: Of course."
};

const dialogueSourceUrl =
  "https://raw.githubusercontent.com/declare-lab/dialogue-understanding/master/glove-end-to-end/datasets/_original/dailydialog/train.json";

const storage = {
  knownWords: "english-sprint-known-words",
  sentenceScore: "english-sprint-sentence-score",
  readDone: "english-sprint-read-done",
  completedChapters: "english-sprint-completed-chapters"
};

const state = {
  knownWords: new Set(JSON.parse(localStorage.getItem(storage.knownWords) || "[]")),
  sentenceScore: Number(localStorage.getItem(storage.sentenceScore) || 0),
  readDone: localStorage.getItem(storage.readDone) === "1",
  quizIndex: 0,
  dialogues: [],
  dialogueIndex: 0,
  showTranslation: false,
  renderToken: 0,
  isSpeaking: false,
  currentSpeakingLine: -1,
  speechSessionId: 0,
  chapterPickerPage: 0,
  completedChapters: new Set(JSON.parse(localStorage.getItem(storage.completedChapters) || "[]"))
};

const elements = {
  wordGrid: document.getElementById("wordGrid"),
  knownWordCount: document.getElementById("knownWordCount"),
  sentenceScore: document.getElementById("sentenceScore"),
  loadedDialogueCount: document.getElementById("loadedDialogueCount"),
  chapterPickerBtn: document.getElementById("chapterPickerBtn"),
  chapterModal: document.getElementById("chapterModal"),
  chapterModalMask: document.getElementById("chapterModalMask"),
  chapterPrevBtn: document.getElementById("chapterPrevBtn"),
  chapterNextBtn: document.getElementById("chapterNextBtn"),
  chapterPageLabel: document.getElementById("chapterPageLabel"),
  chapterGrid: document.getElementById("chapterGrid"),
  resetWordsBtn: document.getElementById("resetWordsBtn"),
  quizSentence: document.getElementById("quizSentence"),
  quizInput: document.getElementById("quizInput"),
  submitAnswerBtn: document.getElementById("submitAnswerBtn"),
  nextSentenceBtn: document.getElementById("nextSentenceBtn"),
  quizResult: document.getElementById("quizResult"),
  readingTitle: document.getElementById("readingTitle"),
  readingText: document.getElementById("readingText"),
  dialogueMeta: document.getElementById("dialogueMeta"),
  speechProgressFill: document.getElementById("speechProgressFill"),
  speechProgressText: document.getElementById("speechProgressText"),
  toggleTranslationBtn: document.getElementById("toggleTranslationBtn"),
  speakDialogueBtn: document.getElementById("speakDialogueBtn"),
  nextDialogueBtn: document.getElementById("nextDialogueBtn"),
  finishReadingBtn: document.getElementById("finishReadingBtn"),
  dailyChecklist: document.getElementById("dailyChecklist")
};

const translationCache = new Map();
const chapterPageSize = 42;

function persist() {
  localStorage.setItem(storage.knownWords, JSON.stringify(Array.from(state.knownWords)));
  localStorage.setItem(storage.sentenceScore, String(state.sentenceScore));
  localStorage.setItem(storage.readDone, state.readDone ? "1" : "0");
  localStorage.setItem(storage.completedChapters, JSON.stringify(Array.from(state.completedChapters)));
}

function updateStats() {
  if (elements.knownWordCount) {
    elements.knownWordCount.textContent = String(state.knownWords.size);
  }
  if (elements.sentenceScore) {
    elements.sentenceScore.textContent = String(state.sentenceScore);
  }
  if (elements.loadedDialogueCount) {
    elements.loadedDialogueCount.textContent = String(state.dialogues.length);
  }
  updateChapterPickerButton();
}

function updateChapterPickerButton(isLoading = false) {
  if (!elements.chapterPickerBtn) {
    return;
  }
  elements.chapterPickerBtn.classList.toggle("is-loading", isLoading);
  if (isLoading) {
    elements.chapterPickerBtn.textContent = "Loading…";
    return;
  }
  const total = state.dialogues.length;
  const current = total ? state.dialogueIndex + 1 : 0;
  elements.chapterPickerBtn.textContent = total ? `Chapter ${current}/${total}` : "No Chapters";
}

function renderChapterPicker() {
  if (!elements.chapterGrid || !elements.chapterPageLabel) {
    return;
  }
  const total = state.dialogues.length;
  const totalPages = Math.max(1, Math.ceil(total / chapterPageSize));
  state.chapterPickerPage = Math.max(0, Math.min(state.chapterPickerPage, totalPages - 1));
  const start = state.chapterPickerPage * chapterPageSize;
  elements.chapterPageLabel.textContent = `Chapter ${start + 1}-${Math.min(start + chapterPageSize, total)} / ${Math.max(total, 1)}`;
  elements.chapterGrid.innerHTML = "";
  for (let i = 0; i < chapterPageSize; i += 1) {
    const chapter = start + i + 1;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chapter-cell";
    if (chapter <= total) {
      button.textContent = String(chapter);
      if (state.completedChapters.has(chapter - 1)) {
        button.classList.add("completed");
      }
      if (chapter - 1 === state.dialogueIndex) {
        button.classList.add("active");
      }
      button.addEventListener("click", () => {
        if (chapter - 1 === state.dialogueIndex) {
          if (state.completedChapters.has(chapter - 1)) {
            state.completedChapters.delete(chapter - 1);
          } else {
            state.completedChapters.add(chapter - 1);
          }
          persist();
          renderChapterPicker();
          return;
        }
        stopSpeaking();
        state.dialogueIndex = chapter - 1;
        state.readDone = false;
        persist();
        renderReading();
        updateStats();
        closeChapterPicker();
      });
    } else {
      button.disabled = true;
      button.classList.add("empty");
    }
    elements.chapterGrid.appendChild(button);
  }
}

function openChapterPicker() {
  if (!elements.chapterModal) {
    return;
  }
  state.chapterPickerPage = Math.floor(state.dialogueIndex / chapterPageSize);
  renderChapterPicker();
  elements.chapterModal.classList.remove("hidden");
}

function closeChapterPicker() {
  if (!elements.chapterModal) {
    return;
  }
  elements.chapterModal.classList.add("hidden");
}

function markCurrentChapterCompleted() {
  if (!state.dialogues.length) {
    return;
  }
  state.completedChapters.add(state.dialogueIndex);
  persist();
  if (elements.chapterModal && !elements.chapterModal.classList.contains("hidden")) {
    renderChapterPicker();
  }
}

function renderWords() {
  if (!elements.wordGrid) {
    return;
  }
  elements.wordGrid.innerHTML = "";
  wordData.forEach((item) => {
    const button = document.createElement("button");
    button.className = `word-btn ${state.knownWords.has(item.word) ? "known" : ""}`;
    button.innerHTML = `<b>${item.word}</b><span>${item.pos} · ${item.zh}</span>`;
    button.addEventListener("click", () => {
      if (state.knownWords.has(item.word)) {
        state.knownWords.delete(item.word);
      } else {
        state.knownWords.add(item.word);
      }
      persist();
      updateStats();
      renderWords();
      renderChecklist();
    });
    elements.wordGrid.appendChild(button);
  });
}

function renderQuiz() {
  if (!elements.quizSentence || !elements.quizInput || !elements.quizResult) {
    return;
  }
  const current = quizData[state.quizIndex];
  elements.quizSentence.textContent = current.text;
  elements.quizInput.value = "";
  elements.quizResult.textContent = "";
  elements.quizResult.className = "quiz-result";
}

function submitAnswer() {
  if (!elements.quizInput || !elements.quizResult) {
    return;
  }
  const current = quizData[state.quizIndex];
  const normalize = (value) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^a-z\s]/g, "")
      .replace(/\s+/g, " ");
  const input = normalize(elements.quizInput.value);
  if (!input) {
    elements.quizResult.textContent = "先输入答案再提交";
    elements.quizResult.className = "quiz-result bad";
    return;
  }
  if (input === normalize(current.answer)) {
    state.sentenceScore += 10;
    elements.quizResult.textContent = "回答正确 +10 分";
    elements.quizResult.className = "quiz-result ok";
  } else {
    elements.quizResult.textContent = `不正确，正确答案是 ${current.answer}`;
    elements.quizResult.className = "quiz-result bad";
  }
  persist();
  updateStats();
  renderChecklist();
}

function nextQuiz() {
  if (!elements.quizSentence) {
    return;
  }
  state.quizIndex = (state.quizIndex + 1) % quizData.length;
  renderQuiz();
}

function normalizeDialogueText(value) {
  return value.replace(/\s+([,.!?;:])/g, "$1").replace(/\s+/g, " ").trim();
}

async function translateToChinese(text) {
  if (translationCache.has(text)) {
    return translationCache.get(text);
  }
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-CN`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("translation request failed");
    }
    const data = await response.json();
    const translated = data?.responseData?.translatedText?.trim();
    const result = translated || "（翻译暂不可用）";
    translationCache.set(text, result);
    return result;
  } catch {
    const fallback = "（翻译暂不可用）";
    translationCache.set(text, fallback);
    return fallback;
  }
}

function updateTranslationButton() {
  if (!elements.toggleTranslationBtn) {
    return;
  }
  elements.toggleTranslationBtn.textContent = state.showTranslation ? "Hide Translation" : "Translate";
}

function updateSpeakButtonState() {
  if (!elements.speakDialogueBtn) {
    return;
  }
  elements.speakDialogueBtn.textContent = state.isSpeaking ? "Stop" : "Speak";
}

function stopSpeaking() {
  state.speechSessionId += 1;
  state.isSpeaking = false;
  state.currentSpeakingLine = -1;
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  setCurrentSpeakingLine(-1);
  updateSpeechProgress(0, 0, "朗读进度：已停止");
  updateSpeakButtonState();
}

function getCurrentTurns() {
  if (state.dialogues.length) {
    return state.dialogues[state.dialogueIndex].turns.slice(0, 10);
  }
  return fallbackReadingData.content
    .split(/\s+(?=[AB]:\s)/)
    .map((segment) => segment.replace(/^[AB]:\s*/, "").trim())
    .filter(Boolean);
}

function updateSpeechProgress(done, total, statusText) {
  if (elements.speechProgressFill) {
    const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    elements.speechProgressFill.style.width = `${percent}%`;
  }
  if (elements.speechProgressText) {
    elements.speechProgressText.textContent = statusText;
  }
}

function setCurrentSpeakingLine(lineIndex) {
  if (!elements.readingText) {
    return;
  }
  state.currentSpeakingLine = lineIndex;
  const lines = Array.from(elements.readingText.querySelectorAll(".dialogue-line"));
  let activeLine = null;
  lines.forEach((line) => {
    const currentIndex = Number(line.getAttribute("data-line-index"));
    const isActive = currentIndex === lineIndex;
    line.classList.toggle("speaking", isActive);
    if (isActive) {
      activeLine = line;
    }
  });
  if (activeLine) {
    activeLine.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest"
    });
  }
}

function voiceGender(voice) {
  const text = `${voice.name} ${voice.lang}`.toLowerCase();
  if (/(female|woman|zira|samantha|victoria|karen|serena|aria|jenny|ava|susan)/.test(text)) {
    return "female";
  }
  if (/(male|man|alex|daniel|guy|tom|david|fred|jorge|lee)/.test(text)) {
    return "male";
  }
  return "unknown";
}

async function getAvailableEnglishVoices() {
  if (!window.speechSynthesis) {
    return [];
  }
  const direct = window.speechSynthesis
    .getVoices()
    .filter((voice) => /^en(-|_)/i.test(voice.lang) || /english/i.test(voice.name));
  if (direct.length) {
    return direct;
  }
  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      resolve(
        window.speechSynthesis
          .getVoices()
          .filter((voice) => /^en(-|_)/i.test(voice.lang) || /english/i.test(voice.name))
      );
    }, 1200);
    window.speechSynthesis.onvoiceschanged = () => {
      window.clearTimeout(timeoutId);
      resolve(
        window.speechSynthesis
          .getVoices()
          .filter((voice) => /^en(-|_)/i.test(voice.lang) || /english/i.test(voice.name))
      );
    };
  });
}

async function pickVoicePair() {
  if (!window.speechSynthesis) {
    return { maleVoice: null, femaleVoice: null, strictGenderPair: false };
  }
  const voices = await getAvailableEnglishVoices();
  if (!voices.length) {
    return { maleVoice: null, femaleVoice: null, strictGenderPair: false };
  }

  const scoreVoice = (voice) => {
    const name = voice.name.toLowerCase();
    let score = 0;
    if (/google|samantha|alex|daniel|karen|aria|jenny|zira|guy|serena/.test(name)) {
      score += 4;
    }
    if (/enhanced|premium|neural|natural/.test(name)) {
      score += 2;
    }
    if (/en-us|en-gb|en-au/.test(voice.lang.toLowerCase())) {
      score += 1;
    }
    return score;
  };

  const sorted = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  const maleCandidates = sorted.filter((voice) => voiceGender(voice) === "male");
  const femaleCandidates = sorted.filter((voice) => voiceGender(voice) === "female");
  if (maleCandidates.length && femaleCandidates.length) {
    return {
      maleVoice: maleCandidates[0],
      femaleVoice: femaleCandidates[0],
      strictGenderPair: true
    };
  }
  return { maleVoice: null, femaleVoice: null, strictGenderPair: false };
}

async function speakCurrentDialogue() {
  if (!window.speechSynthesis) {
    if (elements.dialogueMeta) {
      elements.dialogueMeta.textContent = "当前浏览器不支持语音朗读。";
    }
    return;
  }
  if (state.isSpeaking) {
    stopSpeaking();
    return;
  }
  window.speechSynthesis.cancel();
  const turns = getCurrentTurns();
  if (!turns.length) {
    return;
  }
  const { maleVoice, femaleVoice, strictGenderPair } = await pickVoicePair();
  if (!strictGenderPair || !maleVoice || !femaleVoice) {
    if (elements.dialogueMeta) {
      elements.dialogueMeta.textContent = "当前设备未检测到可用的英文男声+女声组合，无法按男女声朗读。请在系统语音设置中安装英文男女音色后再试。";
    }
    updateSpeechProgress(0, turns.length, "朗读进度：未开始");
    return;
  }
  const total = turns.length;
  let current = 0;
  state.speechSessionId += 1;
  const sessionId = state.speechSessionId;
  state.isSpeaking = true;
  updateSpeakButtonState();
  updateSpeechProgress(0, total, `朗读进度：0/${total}`);
  setCurrentSpeakingLine(-1);

  const speakNext = () => {
    if (!state.isSpeaking || sessionId !== state.speechSessionId || current >= total) {
      state.isSpeaking = false;
      updateSpeakButtonState();
      setCurrentSpeakingLine(-1);
      updateSpeechProgress(total, total, `朗读进度：${total}/${total}（已完成）`);
      if (current >= total && sessionId === state.speechSessionId) {
        markCurrentChapterCompleted();
      }
      return;
    }
    const utterance = new SpeechSynthesisUtterance(turns[current]);
    utterance.lang = "en-US";
    utterance.rate = 0.92;
    utterance.pitch = current % 2 === 0 ? 1 : 0.95;
    const selectedVoice = current % 2 === 0 ? maleVoice : femaleVoice;
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      if (sessionId !== state.speechSessionId) {
        return;
      }
      setCurrentSpeakingLine(current);
      const speakerLabel = current % 2 === 0 ? "男声" : "女声";
      updateSpeechProgress(current, total, `朗读进度：${current + 1}/${total}（${speakerLabel}）`);
    };
    utterance.onend = () => {
      if (sessionId !== state.speechSessionId) {
        return;
      }
      current += 1;
      speakNext();
    };
    utterance.onerror = () => {
      if (sessionId !== state.speechSessionId) {
        return;
      }
      current += 1;
      speakNext();
    };
    window.speechSynthesis.speak(utterance);
  };

  speakNext();
}

async function loadLineTranslations(token) {
  if (!state.showTranslation || !elements.readingText) {
    return;
  }
  const lines = Array.from(elements.readingText.querySelectorAll(".dialogue-line"));
  await Promise.all(
    lines.map(async (line) => {
      const text = line.getAttribute("data-text") || "";
      const translationElement = line.querySelector(".dialogue-translation");
      if (!translationElement) {
        return;
      }
      translationElement.textContent = "翻译中...";
      const translated = await translateToChinese(text);
      if (token !== state.renderToken) {
        return;
      }
      translationElement.textContent = translated;
    })
  );
}

function parseDialogueRows(rawText) {
  const rows = rawText.split("\n").filter(Boolean);
  const dialogues = [];
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row);
      const turns = (parsed.dialogue || [])
        .map((turn) => normalizeDialogueText(turn.text || ""))
        .filter(Boolean);
      if (turns.length >= 2) {
        dialogues.push({
          topic: String(parsed.topic || "daily_conversation"),
          turns
        });
      }
      if (dialogues.length >= 1200) {
        break;
      }
    } catch {
      continue;
    }
  }
  return dialogues;
}

async function loadDialogues() {
  updateChapterPickerButton(true);
  if (elements.dialogueMeta) {
    elements.dialogueMeta.textContent = "正在抓取线上对话数据，请稍候…";
  }
  try {
    const response = await fetch(dialogueSourceUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const rawText = await response.text();
    state.dialogues = parseDialogueRows(rawText);
    if (!state.dialogues.length) {
      throw new Error("empty dataset");
    }
    state.dialogueIndex = 0;
    renderReading();
    updateStats();
    renderChapterPicker();
  } catch {
    if (elements.dialogueMeta) {
      elements.dialogueMeta.textContent = "线上数据抓取失败，已切换到内置示例对话。";
    }
    state.dialogues = [];
    state.dialogueIndex = 0;
    renderReading();
    updateStats();
    renderChapterPicker();
  }
}

function renderReading() {
  elements.readingText.innerHTML = "";
  state.renderToken += 1;
  const token = state.renderToken;
  if (state.dialogues.length) {
    const current = state.dialogues[state.dialogueIndex];
    const topic = current.topic.replace(/_/g, " ");
    elements.readingTitle.textContent = `Daily Conversation · ${topic}`;
    current.turns.slice(0, 10).forEach((turn, index) => {
      const role = index % 2 === 0 ? "Ethan" : "Emma";
      const isLeft = index % 2 === 0;
      const item = document.createElement("div");
      item.className = `dialogue-line ${isLeft ? "left" : "right"}`;
      item.setAttribute("data-text", turn);
      item.setAttribute("data-line-index", String(index));
      const stack = document.createElement("div");
      stack.className = "dialogue-stack";
      const name = document.createElement("span");
      name.className = "dialogue-name";
      name.textContent = role;
      const bubble = document.createElement("p");
      bubble.className = "dialogue-bubble";
      bubble.textContent = turn;
      const translation = document.createElement("p");
      translation.className = "dialogue-translation";
      translation.style.display = state.showTranslation ? "block" : "none";
      const avatar = document.createElement("span");
      avatar.className = `dialogue-avatar ${isLeft ? "male" : "female"}`;
      avatar.textContent = isLeft ? "EH" : "EM";
      stack.appendChild(name);
      stack.appendChild(bubble);
      stack.appendChild(translation);
      item.appendChild(avatar);
      item.appendChild(stack);
      elements.readingText.appendChild(item);
    });
    if (elements.dialogueMeta) {
      elements.dialogueMeta.textContent = `当前第 ${state.dialogueIndex + 1} / ${state.dialogues.length} 段（已抓取至少 1000 段）`;
    }
  } else {
    elements.readingTitle.textContent = fallbackReadingData.title;
    fallbackReadingData.content.split(/\s+(?=[AB]:\s)/).forEach((segment) => {
      const matched = segment.match(/^([AB]):\s*(.*)$/);
      if (!matched) {
        return;
      }
      const role = matched[1] === "A" ? "Ethan" : "Emma";
      const isLeft = matched[1] === "A";
      const text = matched[2];
      const item = document.createElement("div");
      item.className = `dialogue-line ${isLeft ? "left" : "right"}`;
      item.setAttribute("data-text", text);
      item.setAttribute("data-line-index", String(elements.readingText.children.length));
      const stack = document.createElement("div");
      stack.className = "dialogue-stack";
      const name = document.createElement("span");
      name.className = "dialogue-name";
      name.textContent = role;
      const bubble = document.createElement("p");
      bubble.className = "dialogue-bubble";
      bubble.textContent = text;
      const translation = document.createElement("p");
      translation.className = "dialogue-translation";
      translation.style.display = state.showTranslation ? "block" : "none";
      const avatar = document.createElement("span");
      avatar.className = `dialogue-avatar ${isLeft ? "male" : "female"}`;
      avatar.textContent = isLeft ? "EH" : "EM";
      stack.appendChild(name);
      stack.appendChild(bubble);
      stack.appendChild(translation);
      item.appendChild(avatar);
      item.appendChild(stack);
      elements.readingText.appendChild(item);
    });
  }
  if (elements.finishReadingBtn) {
    elements.finishReadingBtn.textContent = state.readDone ? "已完成跟读 ✅" : "我已完成跟读";
  }
  updateChapterPickerButton();
  updateSpeechProgress(0, getCurrentTurns().length, "朗读进度：未开始");
  setCurrentSpeakingLine(-1);
  updateSpeakButtonState();
  updateTranslationButton();
  if (state.showTranslation) {
    loadLineTranslations(token);
  }
}

function markReadingDone() {
  state.readDone = true;
  persist();
  updateStats();
  renderReading();
  renderChecklist();
}

function nextDialogue() {
  if (!state.dialogues.length) {
    return;
  }
  stopSpeaking();
  state.dialogueIndex = (state.dialogueIndex + 1) % state.dialogues.length;
  state.readDone = false;
  persist();
  renderReading();
  updateStats();
  renderChecklist();
}

function renderChecklist() {
  if (!elements.dailyChecklist) {
    return;
  }
  const doneWords = state.knownWords.size >= 8;
  const doneQuiz = state.sentenceScore >= 30;
  const doneRead = state.readDone;
  const tasks = [
    { label: "掌握 8 个日常口语表达", done: doneWords },
    { label: "对话练习累计 30 分", done: doneQuiz },
    { label: "完成今日跟读对话", done: doneRead }
  ];
  elements.dailyChecklist.innerHTML = "";
  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = task.done ? "done" : "";
    li.innerHTML = `<span>${task.label}</span><strong>${task.done ? "完成" : "未完成"}</strong>`;
    elements.dailyChecklist.appendChild(li);
  });
}

if (elements.resetWordsBtn) {
  elements.resetWordsBtn.addEventListener("click", () => {
    state.knownWords.clear();
    persist();
    updateStats();
    renderWords();
    renderChecklist();
  });
}

if (elements.submitAnswerBtn) {
  elements.submitAnswerBtn.addEventListener("click", submitAnswer);
}
if (elements.nextSentenceBtn) {
  elements.nextSentenceBtn.addEventListener("click", nextQuiz);
}
if (elements.nextDialogueBtn) {
  elements.nextDialogueBtn.addEventListener("click", nextDialogue);
}
if (elements.chapterPickerBtn) {
  elements.chapterPickerBtn.addEventListener("click", openChapterPicker);
}
if (elements.chapterModalMask) {
  elements.chapterModalMask.addEventListener("click", closeChapterPicker);
}
if (elements.chapterPrevBtn) {
  elements.chapterPrevBtn.addEventListener("click", () => {
    state.chapterPickerPage -= 1;
    renderChapterPicker();
  });
}
if (elements.chapterNextBtn) {
  elements.chapterNextBtn.addEventListener("click", () => {
    state.chapterPickerPage += 1;
    renderChapterPicker();
  });
}
if (elements.toggleTranslationBtn) {
  elements.toggleTranslationBtn.addEventListener("click", () => {
    state.showTranslation = !state.showTranslation;
    renderReading();
  });
}
if (elements.speakDialogueBtn) {
  elements.speakDialogueBtn.addEventListener("click", speakCurrentDialogue);
}
if (elements.finishReadingBtn) {
  elements.finishReadingBtn.addEventListener("click", markReadingDone);
}
if (elements.quizInput) {
  elements.quizInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      submitAnswer();
    }
  });
}

updateStats();
renderWords();
renderQuiz();
renderReading();
renderChecklist();
loadDialogues();
