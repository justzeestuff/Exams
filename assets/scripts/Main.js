// ============================================================
// DATA LAYER
// ============================================================
const DB = {
  get(key, def = null) {
    try { return JSON.parse(localStorage.getItem(key)) ?? def; }
    catch { return def; }
  },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
};

// Seeds
if (!DB.get('ep_teachers')) DB.set('ep_teachers', []);
if (!DB.get('ep_students')) DB.set('ep_students', []);
if (!DB.get('ep_exams')) DB.set('ep_exams', []);
if (!DB.get('ep_results')) DB.set('ep_results', []);

let currentUser = null;
let currentRole = null;
let examToDelete = null;
let activeExam = null;
let examAnswers = {};
let examStartTime = null;
let examTimerInterval = null;

// ============================================================
// AUTH
// ============================================================
function teacherLogin() {
  const email = document.getElementById('t-login-email').value.trim().toLowerCase();
  const pass = document.getElementById('t-login-pass').value;
  const err = document.getElementById('t-login-error');
  err.className = 'error-msg';

  if (!email || !pass) { showErr(err, 'შეავსე ყველა ველი'); return; }

  const teachers = DB.get('ep_teachers', []);
  const user = teachers.find(t => t.email === email && t.password === pass);

  if (!user) { showErr(err, 'არასწორი ელ. ფოსტა ან პაროლი'); return; }

  currentUser = user;
  currentRole = 'teacher';
  loadTeacherDash();
  showPage('page-teacher-dash');
  showToast('კეთილი იყოს შენი დაბრუნება, ' + user.name + '! 👋', 'success');
}

function teacherRegister() {
  const name = document.getElementById('t-reg-name').value.trim();
  const email = document.getElementById('t-reg-email').value.trim().toLowerCase();
  const pass = document.getElementById('t-reg-pass').value;
  const err = document.getElementById('t-reg-error');
  const suc = document.getElementById('t-reg-success');
  err.className = 'error-msg'; suc.className = 'success-msg';

  if (!name || !email || !pass) { showErr(err, 'შეავსე ყველა ველი'); return; }
  if (pass.length < 6) { showErr(err, 'პაროლი უნდა იყოს მინ. 6 სიმბოლო'); return; }

  const teachers = DB.get('ep_teachers', []);
  if (teachers.find(t => t.email === email)) { showErr(err, 'ეს ელ. ფოსტა უკვე დარეგისტრირებულია'); return; }

  teachers.push({ id: uid(), name, email, password: pass, createdAt: Date.now() });
  DB.set('ep_teachers', teachers);
  suc.textContent = '✅ რეგისტრაცია წარმატებული! შეგიძლია შეხვიდე.';
  suc.className = 'success-msg show';
  document.getElementById('t-reg-name').value = '';
  document.getElementById('t-reg-email').value = '';
  document.getElementById('t-reg-pass').value = '';
  setTimeout(() => switchAuthTab('teacher', 'login'), 1500);
}

function studentLogin() {
  const email = document.getElementById('s-login-email').value.trim().toLowerCase();
  const pass = document.getElementById('s-login-pass').value;
  const err = document.getElementById('s-login-error');
  err.className = 'error-msg';

  if (!email || !pass) { showErr(err, 'შეავსე ყველა ველი'); return; }

  const students = DB.get('ep_students', []);
  const user = students.find(s => s.email === email && s.password === pass);

  if (!user) { showErr(err, 'არასწორი ელ. ფოსტა ან პაროლი'); return; }

  currentUser = user;
  currentRole = 'student';
  loadStudentDash();
  showPage('page-student-dash');
  showToast('კეთილი იყოს შენი დაბრუნება, ' + user.name + '! 🎓', 'success');
}

function studentRegister() {
  const name = document.getElementById('s-reg-name').value.trim();
  const email = document.getElementById('s-reg-email').value.trim().toLowerCase();
  const pass = document.getElementById('s-reg-pass').value;
  const err = document.getElementById('s-reg-error');
  const suc = document.getElementById('s-reg-success');
  err.className = 'error-msg'; suc.className = 'success-msg';

  if (!name || !email || !pass) { showErr(err, 'შეავსე ყველა ველი'); return; }
  if (pass.length < 6) { showErr(err, 'პაროლი უნდა იყოს მინ. 6 სიმბოლო'); return; }

  const students = DB.get('ep_students', []);
  if (students.find(s => s.email === email)) { showErr(err, 'ეს ელ. ფოსტა უკვე დარეგისტრირებულია'); return; }

  students.push({ id: uid(), name, email, password: pass, createdAt: Date.now() });
  DB.set('ep_students', students);
  suc.textContent = '✅ რეგისტრაცია წარმატებული! შეგიძლია შეხვიდე.';
  suc.className = 'success-msg show';
  document.getElementById('s-reg-name').value = '';
  document.getElementById('s-reg-email').value = '';
  document.getElementById('s-reg-pass').value = '';
  setTimeout(() => switchAuthTab('student', 'login'), 1500);
}

function logout() {
  if (examTimerInterval) clearInterval(examTimerInterval);
  currentUser = null;
  currentRole = null;
  activeExam = null;
  showPage('page-landing');
  showToast('გამოხვედი სისტემიდან 👋', 'success');
}

// ============================================================
// TEACHER DASHBOARD
// ============================================================
function loadTeacherDash() {
  const user = currentUser;
  document.getElementById('t-user-name').textContent = user.name;
  document.getElementById('t-avatar').textContent = user.name[0].toUpperCase();

  const exams = DB.get('ep_exams', []).filter(e => e.teacherId === user.id);
  const results = DB.get('ep_results', []).filter(r => exams.some(e => e.id === r.examId));

  // Stats
  document.getElementById('t-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon">📋</div>
      <div class="stat-value">${exams.length}</div>
      <div class="stat-label">შექმნილი გამოცდა</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">✍️</div>
      <div class="stat-value">${results.length}</div>
      <div class="stat-label">ჩაბარების სულ</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🎓</div>
      <div class="stat-value">${new Set(results.map(r=>r.studentId)).size}</div>
      <div class="stat-label">მოსწავლე</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">⭐</div>
      <div class="stat-value">${results.length ? Math.round(results.reduce((a,r)=>a+r.score,0)/results.length) + '%' : '—'}</div>
      <div class="stat-label">საშუალო ქულა</div>
    </div>
  `;

  // Recent exams
  const recent = [...exams].sort((a,b) => b.createdAt - a.createdAt).slice(0, 5);
  const el = document.getElementById('t-recent-exams');
  if (!recent.length) {
    el.innerHTML = emptyState('📋', 'გამოცდა ჯერ შექმნილი არ არის', 'დააჭირე "შექმნა" ახლის დასამატებლად');
    return;
  }
  el.innerHTML = '<div class="exam-list">' + recent.map(e => examItemTeacher(e)).join('') + '</div>';
}

function examItemTeacher(e) {
  const results = DB.get('ep_results', []).filter(r => r.examId === e.id);
  return `
    <div class="exam-item">
      <div class="exam-info">
        <div class="exam-name">${esc(e.title)}</div>
        <div class="exam-meta">
          <span>📚 ${esc(e.subject || '—')}</span>
          <span>👥 ${esc(e.className || '—')}</span>
          <span>❓ ${e.questions.length} კითხვა</span>
          <span>⏱ ${e.duration} წ.</span>
          <span>✍️ ${results.length} ჩაბარება</span>
        </div>
      </div>
      <div class="exam-actions">
        <span class="exam-badge badge-blue">${esc(e.subject || 'გამოცდა')}</span>
        <button class="btn btn-danger btn-sm btn-icon" onclick="openDeleteModal('${e.id}')" title="წაშლა">🗑️</button>
      </div>
    </div>
  `;
}

function renderTeacherExams() {
  const exams = DB.get('ep_exams', []).filter(e => e.teacherId === currentUser.id);
  const el = document.getElementById('t-exams-list');
  if (!exams.length) {
    el.innerHTML = emptyState('📋', 'გამოცდა ჯერ შექმნილი არ არის', 'შექმენი პირველი გამოცდა');
    return;
  }
  el.innerHTML = [...exams].sort((a,b)=>b.createdAt-a.createdAt).map(e => examItemTeacher(e)).join('');
}

function renderTeacherResults() {
  const myExams = DB.get('ep_exams', []).filter(e => e.teacherId === currentUser.id);
  const allResults = DB.get('ep_results', []);
  const students = DB.get('ep_students', []);
  const el = document.getElementById('t-results-content');

  if (!myExams.length) {
    el.innerHTML = emptyState('📊', 'შედეგები ჯერ არ არის', 'ჯერ შექმენი გამოცდა');
    return;
  }

  let html = '';
  myExams.forEach(exam => {
    const examResults = allResults.filter(r => r.examId === exam.id);
    html += `
      <div style="margin-bottom:2rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
          <div>
            <div style="font-weight:700;color:var(--text);">${esc(exam.title)}</div>
            <div style="font-size:0.8rem;color:var(--text2);">✍️ ${examResults.length} ჩაბარება · ❓ ${exam.questions.length} კითხვა</div>
          </div>
          ${examResults.length ? `<span class="exam-badge badge-blue">საშ: ${Math.round(examResults.reduce((a,r)=>a+r.score,0)/examResults.length)}%</span>` : ''}
        </div>
    `;
    if (!examResults.length) {
      html += '<div style="color:var(--text2);font-size:0.85rem;padding:0.75rem;background:var(--bg);border-radius:10px;">ჯერ არ არის ჩაბარებული</div>';
    } else {
      html += `<table class="results-table">
        <thead><tr><th>მოსწავლე</th><th>ქულა</th><th>სწორი / სულ</th><th>დრო</th></tr></thead>
        <tbody>`;
      examResults.sort((a,b) => b.score - a.score).forEach(r => {
        const s = students.find(s => s.id === r.studentId);
        const grade = getGrade(r.score);
        html += `<tr>
          <td style="color:var(--text);">${esc(s ? s.name : 'უცნობი')}</td>
          <td><span class="grade-pill" style="background:${grade.bg};color:${grade.color}">${r.score}%</span></td>
          <td>${r.correct} / ${r.total}</td>
          <td style="font-size:0.78rem;">${new Date(r.submittedAt).toLocaleDateString('ka-GE')}</td>
        </tr>`;
      });
      html += '</tbody></table>';
    }
    html += '</div><hr class="section-divider">';
  });

  el.innerHTML = html;
}

// ============================================================
// CREATE EXAM
// ============================================================
let questionCount = 0;

function addQuestion() {
  questionCount++;
  const qId = 'q' + questionCount;
  const builder = document.getElementById('questions-builder');

  const div = document.createElement('div');
  div.className = 'question-block';
  div.id = 'qblock-' + qId;
  div.innerHTML = `
    <div class="question-block-header">
      <span class="question-num">კითხვა #${questionCount}</span>
      <button class="btn btn-danger btn-sm btn-icon" onclick="removeQuestion('${qId}')">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">კითხვის ტექსტი *</label>
      <input type="text" id="qt-${qId}" class="form-input" placeholder="შეიყვანე კითხვა...">
    </div>
    <div class="form-label" style="margin-bottom:0.5rem;">პასუხის ვარიანტები (მონიშნე სწორი) *</div>
    <div class="options-list" id="opts-${qId}">
      ${['ა', 'ბ', 'გ', 'დ'].map((l, i) => `
        <div class="option-row">
          <input type="radio" name="correct-${qId}" value="${i}" class="option-radio" title="სწორი პასუხი">
          <input type="text" id="opt-${qId}-${i}" class="option-input" placeholder="${l}) ვარიანტი...">
        </div>
      `).join('')}
    </div>
  `;
  builder.appendChild(div);
}

function removeQuestion(qId) {
  document.getElementById('qblock-' + qId)?.remove();
}

function clearExamForm() {
  document.getElementById('exam-title').value = '';
  document.getElementById('exam-desc').value = '';
  document.getElementById('exam-subject').value = '';
  document.getElementById('exam-class').value = '';
  document.getElementById('exam-duration').value = '30';
  document.getElementById('questions-builder').innerHTML = '';
  questionCount = 0;
  document.getElementById('exam-error').className = 'error-msg';
  document.getElementById('exam-success').className = 'success-msg';
}

function saveExam() {
  const title = document.getElementById('exam-title').value.trim();
  const desc = document.getElementById('exam-desc').value.trim();
  const subject = document.getElementById('exam-subject').value.trim();
  const cls = document.getElementById('exam-class').value.trim();
  const duration = parseInt(document.getElementById('exam-duration').value) || 30;
  const err = document.getElementById('exam-error');
  const suc = document.getElementById('exam-success');
  err.className = 'error-msg'; suc.className = 'success-msg';

  if (!title) { showErr(err, 'შეიყვანე გამოცდის სახელი'); return; }

  // Collect questions
  const blocks = document.querySelectorAll('.question-block');
  if (blocks.length === 0) { showErr(err, 'დაამატე მინ. 1 კითხვა'); return; }

  const questions = [];
  let valid = true;
  blocks.forEach((block, idx) => {
    const qId = block.id.replace('qblock-', '');
    const text = document.getElementById('qt-' + qId)?.value.trim();
    if (!text) { showErr(err, `${idx+1}-ე კითხვის ტექსტი ცარიელია`); valid = false; return; }

    const opts = [];
    for (let i = 0; i < 4; i++) {
      const v = document.getElementById(`opt-${qId}-${i}`)?.value.trim();
      opts.push(v || '');
    }
    if (opts.filter(Boolean).length < 2) { showErr(err, `${idx+1}-ე კითხვას სჭირდება მინ. 2 ვარიანტი`); valid = false; return; }

    const correctRadio = document.querySelector(`input[name="correct-${qId}"]:checked`);
    if (!correctRadio) { showErr(err, `${idx+1}-ე კითხვაში მონიშნე სწორი პასუხი`); valid = false; return; }
    const correctIdx = parseInt(correctRadio.value);
    if (!opts[correctIdx]) { showErr(err, `${idx+1}-ე კითხვაში სწორი პასუხის ველი ცარიელია`); valid = false; return; }

    questions.push({ text, options: opts, correct: correctIdx });
  });

  if (!valid) return;

  const exams = DB.get('ep_exams', []);
  exams.push({
    id: uid(),
    teacherId: currentUser.id,
    title, desc, subject,
    className: cls,
    duration,
    questions,
    createdAt: Date.now(),
  });
  DB.set('ep_exams', exams);

  suc.textContent = '✅ გამოცდა წარმატებით შეინახა!';
  suc.className = 'success-msg show';
  showToast('გამოცდა შეინახა! 📋', 'success');
  clearExamForm();
  loadTeacherDash();
}

// ============================================================
// DELETE
// ============================================================
function openDeleteModal(examId) {
  examToDelete = examId;
  document.getElementById('delete-modal').classList.add('show');
}
function closeDeleteModal() {
  examToDelete = null;
  document.getElementById('delete-modal').classList.remove('show');
}
function confirmDelete() {
  if (!examToDelete) return;
  let exams = DB.get('ep_exams', []);
  exams = exams.filter(e => e.id !== examToDelete);
  DB.set('ep_exams', exams);
  let results = DB.get('ep_results', []);
  results = results.filter(r => r.examId !== examToDelete);
  DB.set('ep_results', results);
  closeDeleteModal();
  showToast('გამოცდა წაიშალა 🗑️', 'success');
  loadTeacherDash();
  renderTeacherExams();
  renderTeacherResults();
}

// ============================================================
// STUDENT DASHBOARD
// ============================================================
function loadStudentDash() {
  const user = currentUser;
  document.getElementById('s-user-name').textContent = user.name;
  document.getElementById('s-avatar').textContent = user.name[0].toUpperCase();

  const myResults = DB.get('ep_results', []).filter(r => r.studentId === user.id);
  const exams = DB.get('ep_exams', []);
  const takenIds = new Set(myResults.map(r => r.examId));
  const available = exams.filter(e => !takenIds.has(e.id));
  const avgScore = myResults.length ? Math.round(myResults.reduce((a,r)=>a+r.score,0)/myResults.length) : 0;

  document.getElementById('s-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon">📝</div>
      <div class="stat-value">${available.length}</div>
      <div class="stat-label">მოლოდინი გამოცდა</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">✅</div>
      <div class="stat-value">${myResults.length}</div>
      <div class="stat-label">ჩაბარებული</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">⭐</div>
      <div class="stat-value">${myResults.length ? avgScore + '%' : '—'}</div>
      <div class="stat-label">საშუალო ქულა</div>
    </div>
  `;

  // Recent results
  const el = document.getElementById('s-recent-results');
  const recent = [...myResults].sort((a,b) => b.submittedAt - a.submittedAt).slice(0, 4);
  if (!recent.length) {
    el.innerHTML = emptyState('🏆', 'ჯერ ჩაბარებული გამოცდა არ გაქვს', 'ჩააბარე პირველი გამოცდა');
    return;
  }
  el.innerHTML = '<div class="exam-list">' + recent.map(r => {
    const exam = exams.find(e => e.id === r.examId);
    const grade = getGrade(r.score);
    return `
      <div class="exam-item">
        <div class="exam-info">
          <div class="exam-name">${esc(exam ? exam.title : 'წაშლილი გამოცდა')}</div>
          <div class="exam-meta"><span>📅 ${new Date(r.submittedAt).toLocaleDateString('ka-GE')}</span><span>✅ ${r.correct}/${r.total} სწორი</span></div>
        </div>
        <span class="grade-pill" style="background:${grade.bg};color:${grade.color};font-size:0.9rem;">${r.score}%</span>
      </div>
    `;
  }).join('') + '</div>';
}

function renderStudentExams() {
  const exams = DB.get('ep_exams', []);
  const myResults = DB.get('ep_results', []).filter(r => r.studentId === currentUser.id);
  const takenIds = new Set(myResults.map(r => r.examId));
  const available = exams.filter(e => !takenIds.has(e.id));
  const el = document.getElementById('s-exams-list');

  if (!available.length) {
    el.innerHTML = emptyState('🎉', 'ყველა გამოცდა ჩაბარებულია!', 'ახალი გამოცდა მალე გამოჩნდება');
    return;
  }

  el.innerHTML = available.sort((a,b)=>b.createdAt-a.createdAt).map(e => `
    <div class="exam-item">
      <div class="exam-info">
        <div class="exam-name">${esc(e.title)}</div>
        <div class="exam-meta">
          <span>📚 ${esc(e.subject || '—')}</span>
          <span>❓ ${e.questions.length} კითხვა</span>
          <span>⏱ ${e.duration} წ.</span>
          ${e.desc ? `<span>💬 ${esc(e.desc)}</span>` : ''}
        </div>
      </div>
      <div class="exam-actions">
        <span class="exam-badge badge-purple">ჩასაბარებელი</span>
        <button class="btn btn-purple btn-sm" onclick="startExam('${e.id}')">დაწყება →</button>
      </div>
    </div>
  `).join('');
}

function renderStudentResults() {
  const myResults = DB.get('ep_results', []).filter(r => r.studentId === currentUser.id);
  const exams = DB.get('ep_exams', []);
  const el = document.getElementById('s-results-list');

  if (!myResults.length) {
    el.innerHTML = '<div class="card">' + emptyState('🏆', 'ჯერ ჩაბარებული გამოცდა არ გაქვს', 'გადადი "ხელმისაწვდომი გამოცდები"-ში') + '</div>';
    return;
  }

  el.innerHTML = [...myResults].sort((a,b)=>b.submittedAt-a.submittedAt).map(r => {
    const exam = exams.find(e => e.id === r.examId);
    const grade = getGrade(r.score);
    return `
      <div class="card" style="margin-bottom:1rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
          <div>
            <div style="font-weight:700;color:var(--text);font-size:1rem;margin-bottom:0.25rem;">${esc(exam ? exam.title : 'წაშლილი გამოცდა')}</div>
            <div style="font-size:0.8rem;color:var(--text2);">📅 ${new Date(r.submittedAt).toLocaleDateString('ka-GE')} · ✅ ${r.correct}/${r.total} სწორი</div>
          </div>
          <span class="grade-pill" style="background:${grade.bg};color:${grade.color};font-size:1rem;padding:0.4rem 1rem;">${r.score}%</span>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// TAKE EXAM
// ============================================================
function startExam(examId) {
  const exam = DB.get('ep_exams', []).find(e => e.id === examId);
  if (!exam) { showToast('გამოცდა ვერ მოიძებნა', 'error'); return; }

  activeExam = exam;
  examAnswers = {};
  examStartTime = Date.now();

  if (examTimerInterval) clearInterval(examTimerInterval);

  switchPanel('student', 'take-exam');
  renderTakeExam();
}

function renderTakeExam() {
  if (!activeExam) return;
  const exam = activeExam;
  const total = exam.questions.length;
  const answered = Object.keys(examAnswers).length;
  const pct = Math.round((answered / total) * 100);

  let html = `
    <div class="exam-taking">
      <div class="page-header">
        <h1>${esc(exam.title)}</h1>
        <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
          <span style="color:var(--text2);font-size:0.9rem;">❓ ${total} კითხვა</span>
          <span style="color:var(--text2);font-size:0.9rem;">✅ ${answered} პასუხი</span>
          <span id="exam-timer" style="background:rgba(139,92,246,0.15);color:#c4b5fd;border:1px solid rgba(139,92,246,0.3);padding:0.3rem 0.8rem;border-radius:20px;font-size:0.85rem;font-weight:700;">⏱ ${exam.duration}:00</span>
        </div>
      </div>
      <div class="exam-progress"><div class="exam-progress-fill" style="width:${pct}%"></div></div>
  `;

  exam.questions.forEach((q, qi) => {
    const selected = examAnswers[qi];
    html += `
      <div class="question-card">
        <div class="q-number">კითხვა ${qi + 1} / ${total}</div>
        <div class="q-text">${esc(q.text)}</div>
        <div class="answer-options">
    `;
    q.options.forEach((opt, oi) => {
      if (!opt) return;
      const letters = ['ა', 'ბ', 'გ', 'დ'];
      const isSelected = selected === oi;
      html += `
        <div class="answer-option ${isSelected ? 'selected' : ''}" onclick="selectAnswer(${qi}, ${oi})">
          <div class="answer-letter">${letters[oi]}</div>
          <div>${esc(opt)}</div>
        </div>
      `;
    });
    html += `</div></div>`;
  });

  html += `
    <div style="display:flex;justify-content:flex-end;gap:1rem;margin-top:1rem;">
      <button class="btn btn-outline" onclick="switchPanel('student','available')">გაუქმება</button>
      <button class="btn btn-purple" onclick="submitExam()">✅ გამოცდის დასრულება</button>
    </div>
    </div>
  `;

  document.getElementById('take-exam-content').innerHTML = html;

  // Timer
  if (examTimerInterval) clearInterval(examTimerInterval);
  let remaining = exam.duration * 60;
  function updateTimer() {
    const el = document.getElementById('exam-timer');
    if (!el) { clearInterval(examTimerInterval); return; }
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    el.textContent = `⏱ ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (remaining <= 60) el.style.color = '#fca5a5';
    if (remaining <= 0) { clearInterval(examTimerInterval); submitExam(); }
    remaining--;
  }
  updateTimer();
  examTimerInterval = setInterval(updateTimer, 1000);
}

function selectAnswer(qi, oi) {
  examAnswers[qi] = oi;
  renderTakeExam();
}

function submitExam() {
  if (examTimerInterval) clearInterval(examTimerInterval);
  if (!activeExam) return;

  const exam = activeExam;
  let correct = 0;
  const details = exam.questions.map((q, qi) => {
    const answered = examAnswers[qi] ?? -1;
    const isCorrect = answered === q.correct;
    if (isCorrect) correct++;
    return { text: q.text, options: q.options, correct: q.correct, answered };
  });

  const score = Math.round((correct / exam.questions.length) * 100);
  const resultObj = {
    id: uid(),
    examId: exam.id,
    studentId: currentUser.id,
    score, correct,
    total: exam.questions.length,
    details,
    submittedAt: Date.now(),
  };

  const results = DB.get('ep_results', []);
  results.push(resultObj);
  DB.set('ep_results', results);

  loadStudentDash();
  switchPanel('student', 'exam-result');
  renderExamResult(resultObj, exam);
  showToast('გამოცდა ჩაბარდა! 🎉', 'success');
}

function renderExamResult(result, exam) {
  const grade = getGrade(result.score);
  const pctCss = `${result.score * 3.6}deg`;

  let reviewHtml = result.details.map((d, i) => {
    const isCorrect = d.answered === d.correct;
    return `
      <div class="review-item">
        <div class="review-q">${i+1}. ${esc(d.text)}</div>
        <div class="review-answer">
          ${d.answered >= 0 ? `<span class="${isCorrect ? 'correct-text' : 'wrong-text'}">${isCorrect ? '✅' : '❌'} შენი: ${esc(d.options[d.answered] || '—')}</span>` : '<span style="color:var(--text3)">⬜ პასუხი არ გაციე</span>'}
          ${!isCorrect ? `<span style="color:var(--success);margin-left:1rem;">✅ სწორი: ${esc(d.options[d.correct])}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('exam-result-content').innerHTML = `
    <div style="max-width:600px;margin:0 auto;">
      <div class="page-header"><h1>📊 შედეგი</h1></div>
      <div class="results-card">
        <div class="score-circle" style="--pct:${pctCss}">
          <div class="score-value">${result.score}%</div>
        </div>
        <div class="results-title" style="color:${grade.color}">${grade.label}</div>
        <div class="results-sub">${esc(exam.title)}</div>
        <div class="results-detail">
          <div class="result-detail-item">
            <div class="rdl">სწორი პასუხი</div>
            <div class="rdv" style="color:var(--success)">${result.correct}</div>
          </div>
          <div class="result-detail-item">
            <div class="rdl">არასწორი</div>
            <div class="rdv" style="color:var(--danger)">${result.total - result.correct}</div>
          </div>
          <div class="result-detail-item">
            <div class="rdl">სულ კითხვა</div>
            <div class="rdv">${result.total}</div>
          </div>
          <div class="result-detail-item">
            <div class="rdl">ქულა</div>
            <div class="rdv" style="color:${grade.color}">${result.score}%</div>
          </div>
        </div>
        <button class="btn btn-purple" onclick="switchPanel('student','available')" style="width:100%;margin-bottom:0.75rem;">← სხვა გამოცდები</button>
        <button class="btn btn-outline" onclick="toggleReview()" style="width:100%;">🔍 პასუხების მიმოხილვა</button>
      </div>
      <div class="results-review" id="review-section" style="display:none;">
        <div class="card-title" style="margin-bottom:1rem;color:var(--text);">📋 პასუხების მიმოხილვა</div>
        ${reviewHtml}
      </div>
    </div>
  `;
}

function toggleReview() {
  const el = document.getElementById('review-section');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// ============================================================
// NAVIGATION
// ============================================================
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

function switchPanel(role, panel) {
  const prefix = role === 'teacher' ? 'panel-teacher-' : 'panel-student-';
  document.querySelectorAll(`[id^="${prefix}"]`).forEach(p => p.classList.remove('active'));
  document.getElementById(prefix + panel)?.classList.add('active');

  // Update nav items
  const navRole = role === 'teacher' ? 'page-teacher-dash' : 'page-student-dash';
  document.querySelectorAll(`#${navRole} .nav-item`).forEach(n => n.classList.remove('active'));
  const map = { dashboard: 0, create: 1, 'my-exams': 2, results: 3, available: 1, 'my-results': 2, 'take-exam': 1, 'exam-result': 1 };
  const navItems = document.querySelectorAll(`#${navRole} .nav-item`);
  if (navItems[map[panel] ?? 0]) navItems[map[panel] ?? 0].classList.add('active');

  // Lazy render
  if (role === 'teacher') {
    if (panel === 'my-exams') renderTeacherExams();
    if (panel === 'results') renderTeacherResults();
    if (panel === 'create' && document.getElementById('questions-builder').children.length === 0) addQuestion();
  } else {
    if (panel === 'available') renderStudentExams();
    if (panel === 'my-results') renderStudentResults();
  }
}

function switchAuthTab(role, tab) {
  if (role === 'teacher') {
    document.getElementById('t-login-tab').className = 'toggle-tab' + (tab === 'login' ? ' active' : '');
    document.getElementById('t-register-tab').className = 'toggle-tab' + (tab === 'register' ? ' active' : '');
    document.getElementById('t-login-form').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('t-register-form').style.display = tab === 'register' ? 'block' : 'none';
  } else {
    document.getElementById('s-login-tab').className = 'toggle-tab' + (tab === 'login' ? ' active' : '');
    document.getElementById('s-register-tab').className = 'toggle-tab' + (tab === 'register' ? ' active' : '');
    document.getElementById('s-login-form').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('s-register-form').style.display = tab === 'register' ? 'block' : 'none';
  }
}

// ============================================================
// UTILS
// ============================================================
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function esc(str) { return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function showErr(el, msg) {
  el.textContent = '⚠️ ' + msg;
  el.className = 'error-msg show';
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  document.getElementById('toast-icon').textContent = type === 'success' ? '✅' : '❌';
  document.getElementById('toast-msg').textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => { t.className = 'toast'; }, 3000);
}

function emptyState(icon, title, sub) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div><div class="empty-sub">${sub}</div></div>`;
}

function getGrade(score) {
  if (score >= 90) return { label: 'შესანიშნავი! 🏆', color: '#10b981', bg: 'rgba(16,185,129,0.15)' };
  if (score >= 75) return { label: 'კარგი! 👍', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' };
  if (score >= 55) return { label: 'დამაკმაყოფილებელი', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
  return { label: 'საჭიროა გაუმჯობესება', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
}

// Enter key support
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const active = document.querySelector('.page.active');
    if (active?.id === 'page-teacher-login') teacherLogin();
    else if (active?.id === 'page-student-login') studentLogin();
  }
});