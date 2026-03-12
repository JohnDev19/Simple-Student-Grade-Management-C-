const API = '/api';
let currentSort = 'name';

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  if (!res.ok && res.status !== 400 && res.status !== 404) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  const icon = document.getElementById('toastIcon');
  const msgEl = document.getElementById('toastMsg');
  msgEl.textContent = msg;
  icon.className = `toast-icon ${type === 'success' ? 's' : 'e'}`;
  icon.innerHTML = type === 'success'
    ? '<i class="fa-solid fa-check"></i>'
    : '<i class="fa-solid fa-xmark"></i>';
  el.className = `show ${type}`;
  setTimeout(() => { el.className = ''; }, 3200);
}

function getGradeClass(g) {
  if (g >= 90) return 'grade-a';
  if (g >= 80) return 'grade-b';
  if (g >= 70) return 'grade-c';
  if (g >= 60) return 'grade-d';
  return 'grade-f';
}

function getLetter(g) {
  if (g >= 97) return 'A+';  if (g >= 93) return 'A';  if (g >= 90) return 'A-';
  if (g >= 87) return 'B+';  if (g >= 83) return 'B';  if (g >= 80) return 'B-';
  if (g >= 77) return 'C+';  if (g >= 73) return 'C';  if (g >= 70) return 'C-';
  if (g >= 67) return 'D+';  if (g >= 63) return 'D';  if (g >= 60) return 'D-';
  return 'F';
}

function buildStudentItem(s, index, showActions = true) {
  const cls = getGradeClass(s.grade);
  const stCls = s.status === 'Pass' ? 'status-pass' : 'status-fail';
  const encodedName = encodeURIComponent(s.name);
  return `
    <div class="student-item">
      <div class="student-rank">${index + 1}</div>
      <div class="student-name">${escHtml(s.name)}</div>
      <span class="grade-badge ${cls}">${s.grade.toFixed(1)}</span>
      <span class="grade-badge badge-letter ${cls}" style="min-width:34px;text-align:center;font-size:.72rem">${getLetter(s.grade)}</span>
      <span class="status-pill ${stCls}">${s.status}</span>
      ${showActions ? `
      <div class="item-actions">
        <button class="btn btn-sm btn-edit" onclick="openEdit('${encodedName}', ${s.grade})" title="Edit grade">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteStudent('${encodedName}')" title="Remove student">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>` : ''}
    </div>`;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function loadAll() {
  try {
    const students = await apiFetch(`${API}/students?sort=${currentSort}`);
    const list = document.getElementById('studentList');
    document.getElementById('listCount').textContent = students.length;
    document.getElementById('studentCount').textContent =
      `${students.length} student${students.length !== 1 ? 's' : ''}`;

    if (!students.length) {
      list.innerHTML = `<div class="empty-state">
        <i class="fa-solid fa-graduation-cap"></i>
        <p>No students yet. Add your first student.</p>
      </div>`;
    } else {
      list.innerHTML = students.map((s, i) => buildStudentItem(s, i)).join('');
    }

    const [byGrade, byName] = await Promise.all([
      apiFetch(`${API}/students?sort=grade`),
      apiFetch(`${API}/students?sort=name`)
    ]);

    const emptyHtml = `<div class="empty-state"><p>No students</p></div>`;
    document.getElementById('sortedByGrade').innerHTML = byGrade.length
      ? byGrade.map((s, i) => buildStudentItem(s, i, false)).join('') : emptyHtml;
    document.getElementById('sortedByName').innerHTML = byName.length
      ? byName.map((s, i) => buildStudentItem(s, i, false)).join('') : emptyHtml;

    await loadStats();
  } catch (e) {
    console.error('loadAll error:', e);
  }
}

async function loadStats() {
  try {
    const s = await apiFetch(`${API}/stats`);
    const body = document.getElementById('statsBody');

    if (!s.hasData) {
      body.innerHTML = `<div class="empty-state">
        <i class="fa-solid fa-chart-line"></i>
        <p>Add students to see statistics.</p>
      </div>`;
      return;
    }

    const passP = s.count ? (s.passCount / s.count * 100) : 0;
    const failP = 100 - passP;
    const medalClasses = ['gold', 'silver', 'bronze'];
    const medalIcons = ['fa-trophy', 'fa-medal', 'fa-award'];
    const distColors = ['#10b981','#60a5fa','#f59e0b','#fb923c','#ef4444'];
    const distKeys = Object.keys(s.distribution);
    const maxDist = Math.max(...Object.values(s.distribution), 1);

    body.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card stat-avg">
          <div class="stat-label">Class Average</div>
          <div class="stat-value">${s.average}</div>
          <div class="stat-sub">${getLetter(s.average)} &middot; GPA ${s.avgGpa}</div>
        </div>
        <div class="stat-card stat-gpa">
          <div class="stat-label">Avg GPA</div>
          <div class="stat-value">${s.avgGpa}</div>
          <div class="stat-sub">out of 4.0</div>
        </div>
        <div class="stat-card stat-high">
          <div class="stat-label">Highest</div>
          <div class="stat-value">${s.highest.grade}</div>
          <div class="stat-sub">${escHtml(s.highest.name)}</div>
        </div>
        <div class="stat-card stat-low">
          <div class="stat-label">Lowest</div>
          <div class="stat-value">${s.lowest.grade}</div>
          <div class="stat-sub">${escHtml(s.lowest.name)}</div>
        </div>
      </div>

      <div class="pf-section">
        <div class="pf-header">
          <div class="pf-label">Pass / Fail Rate</div>
        </div>
        <div class="pf-bar">
          <div class="pf-pass" style="width:${passP}%"></div>
          <div class="pf-fail" style="width:${failP}%"></div>
        </div>
        <div class="pf-counts">
          <span class="pf-count pass-c">
            <i class="fa-solid fa-check"></i> ${s.passCount} passed (&ge;75)
          </span>
          <span class="pf-count fail-c">
            <i class="fa-solid fa-xmark"></i> ${s.failCount} failed
          </span>
        </div>
      </div>

      <hr class="divider"/>

      <div class="leaderboard">
        <div class="section-title"><i class="fa-solid fa-ranking-star"></i> Top Leaderboard</div>
        ${s.top3.map((t, i) => `
          <div class="podium-item podium-${t.rank}">
            <div class="medal-icon ${medalClasses[i]}">
              <i class="fa-solid ${medalIcons[i]}"></i>
            </div>
            <span class="podium-name">${escHtml(t.name)}</span>
            <span class="podium-grade ${getGradeClass(t.grade)}">${t.grade.toFixed(1)} &middot; ${t.letter}</span>
          </div>`).join('')}
      </div>

      <hr class="divider"/>

      <div class="dist-section">
        <div class="section-title"><i class="fa-solid fa-chart-bar"></i> Grade Distribution</div>
        ${distKeys.map((k, i) => `
          <div class="dist-row">
            <div class="dist-label">${k}</div>
            <div class="dist-bar-bg">
              <div class="dist-bar-fill"
                style="width:${(s.distribution[k]/maxDist*100)}%;background:${distColors[i]}"></div>
            </div>
            <div class="dist-count">${s.distribution[k]}</div>
          </div>`).join('')}
      </div>`;
  } catch (e) {
    console.error('loadStats error:', e);
  }
}

async function addStudent() {
  const nameEl  = document.getElementById('addName');
  const gradeEl = document.getElementById('addGrade');
  const name  = nameEl.value.trim();
  const grade = parseFloat(gradeEl.value);

  if (!name) { toast('Please enter a student name.', 'error'); nameEl.focus(); return; }
  if (isNaN(grade) || grade < 0 || grade > 100) {
    toast('Grade must be between 0 and 100.', 'error'); gradeEl.focus(); return;
  }

  try {
    const data = await apiFetch(`${API}/students`, {
      method: 'POST',
      body: JSON.stringify({ name, grade })
    });
    if (data.success) {
      nameEl.value = ''; gradeEl.value = '';
      toast(data.message, 'success');
      await loadAll();
    } else {
      toast(data.message, 'error');
    }
  } catch (e) {
    toast('Failed to add student. Check connection.', 'error');
  }
}

async function deleteStudent(encodedName) {
  const name = decodeURIComponent(encodedName);
  try {
    const data = await apiFetch(`${API}/students/${encodedName}`, { method: 'DELETE' });
    if (data.success) {
      toast(data.message, 'success');
      await loadAll();
    } else {
      toast(data.message, 'error');
    }
  } catch (e) {
    toast('Failed to delete student.', 'error');
  }
}

function openEdit(encodedName, grade) {
  document.getElementById('editName').value = decodeURIComponent(encodedName);
  document.getElementById('editGrade').value = grade;
  document.getElementById('editModal').classList.add('open');
  document.getElementById('editGrade').focus();
}

function closeModal() {
  document.getElementById('editModal').classList.remove('open');
}

async function saveEdit() {
  const name  = document.getElementById('editName').value;
  const grade = parseFloat(document.getElementById('editGrade').value);
  if (isNaN(grade) || grade < 0 || grade > 100) {
    toast('Grade must be between 0 and 100.', 'error'); return;
  }
  try {
    const data = await apiFetch(`${API}/students/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify({ grade })
    });
    if (data.success) {
      closeModal();
      toast(data.message, 'success');
      await loadAll();
    } else {
      toast(data.message, 'error');
    }
  } catch (e) {
    toast('Failed to save changes.', 'error');
  }
}

async function searchStudent() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return;
  const resultEl = document.getElementById('searchResult');
  try {
    const data = await apiFetch(`${API}/search?q=${encodeURIComponent(q)}`);
    if (data.message === 'Not found' || !data.name) {
      resultEl.innerHTML = `<div style="color:var(--text-3);font-size:.82rem">
        <i class="fa-solid fa-circle-exclamation"></i> Student not found.
      </div>`;
    } else {
      const cls = getGradeClass(data.grade);
      resultEl.innerHTML = `
        <div class="sr-name">${escHtml(data.name)}</div>
        <div class="sr-row">
          <span class="sr-tag">${data.grade.toFixed(1)}</span>
          <span class="sr-tag grade-badge ${cls}" style="border:none">${getLetter(data.grade)}</span>
          <span class="sr-tag">${data.status}</span>
          <span class="sr-tag">GPA ${data.gPA !== undefined ? data.gPA : data.gpa}</span>
        </div>`;
    }
    resultEl.classList.add('visible');
  } catch (e) {
    resultEl.innerHTML = `<div style="color:var(--text-3);font-size:.82rem">Error searching.</div>`;
    resultEl.classList.add('visible');
  }
}

function setSortStudents(sort) {
  currentSort = sort;
  document.getElementById('sortNameBtn').classList.toggle('active', sort === 'name');
  document.getElementById('sortGradeBtn').classList.toggle('active', sort === 'grade');
  loadAll();
}

function switchTab(name, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById(`tab-${name}`).classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
  loadAll();

  document.getElementById('addGrade').addEventListener('keydown', e => {
    if (e.key === 'Enter') addStudent();
  });
  document.getElementById('addName').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('addGrade').focus();
  });
  document.getElementById('searchInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchStudent();
  });
  document.getElementById('editModal').addEventListener('click', e => {
    if (e.target === document.getElementById('editModal')) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
});
