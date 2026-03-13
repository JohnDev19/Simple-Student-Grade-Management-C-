const API = '/api';
let currentSort = 'name';

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' }, ...opts
  });
  if (!res.ok && res.status !== 400 && res.status !== 404) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  const icon = document.getElementById('toastIcon');
  icon.className = `toast-icon ${type === 'success' ? 's' : 'e'}`;
  icon.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check' : 'fa-xmark'}"></i>`;
  el.className = `show ${type}`;
  setTimeout(() => { el.className = ''; }, 3400);
}

function getGradeClass(g) {
  if (g >= 90) return 'grade-a';
  if (g >= 80) return 'grade-b';
  if (g >= 70) return 'grade-c';
  if (g >= 60) return 'grade-d';
  return 'grade-f';
}

function getLetter(g) {
  if (g >= 97) return 'A+'; if (g >= 93) return 'A';  if (g >= 90) return 'A-';
  if (g >= 87) return 'B+'; if (g >= 83) return 'B';  if (g >= 80) return 'B-';
  if (g >= 77) return 'C+'; if (g >= 73) return 'C';  if (g >= 70) return 'C-';
  if (g >= 67) return 'D+'; if (g >= 63) return 'D';  if (g >= 60) return 'D-';
  return 'F';
}

function getPhGPA(g) {
  if (g >= 97) return 1.00;
  if (g >= 94) return 1.25;
  if (g >= 91) return 1.50;
  if (g >= 88) return 1.75;
  if (g >= 85) return 2.00;
  if (g >= 82) return 2.25;
  if (g >= 79) return 2.50;
  if (g >= 76) return 2.75;
  if (g >= 75) return 3.00;
  return 5.00;
}

function getPhGpaLabel(gpa) {
  if (gpa <= 1.25) return 'Excellent';
  if (gpa <= 1.75) return 'Very Good';
  if (gpa <= 2.25) return 'Good';
  if (gpa <= 2.75) return 'Satisfactory';
  if (gpa <= 3.00) return 'Passing';
  return 'Failed';
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escXml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

function buildStudentItem(s, index, showActions = true) {
  const cls   = getGradeClass(s.grade);
  const stCls = s.status === 'Pass' ? 'status-pass' : 'status-fail';
  const enc   = encodeURIComponent(s.name);
  const phGpa = getPhGPA(s.grade).toFixed(2);
  return `
    <div class="student-item">
      <div class="student-rank">${index + 1}</div>
      <div class="student-info">
        <div class="student-name">${escHtml(s.name)}</div>
        <div class="student-meta">
          <span class="grade-badge ${cls}">${s.grade.toFixed(1)}</span>
          <span class="grade-badge badge-letter ${cls}">${getLetter(s.grade)}</span>
          <span class="grade-badge badge-gpa gpa-neutral">${phGpa}</span>
          <span class="status-pill ${stCls}">${s.status}</span>
          ${showActions ? `
          <div class="item-actions">
            <button class="btn btn-sm btn-edit"   onclick="openEdit('${enc}',${s.grade})" title="Edit grade"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-sm btn-danger" onclick="deleteStudent('${enc}')" title="Remove"><i class="fa-solid fa-trash"></i></button>
          </div>` : ''}
        </div>
      </div>
    </div>`;
}

async function loadAll() {
  try {
    const students = await apiFetch(`${API}/students?sort=${currentSort}`);
    const list = document.getElementById('studentList');
    document.getElementById('listCount').textContent = students.length;
    document.getElementById('studentCount').textContent =
      `${students.length} student${students.length !== 1 ? 's' : ''}`;

    list.innerHTML = students.length
      ? students.map((s, i) => buildStudentItem(s, i)).join('')
      : `<div class="empty-state"><i class="fa-solid fa-graduation-cap"></i><p>No students yet. Add your first student.</p></div>`;

    const [byGrade, byName, byGpa] = await Promise.all([
      apiFetch(`${API}/students?sort=grade`),
      apiFetch(`${API}/students?sort=name`),
      apiFetch(`${API}/students?sort=gpa`)
    ]);
    const empty = `<div class="empty-state"><p>No students</p></div>`;
    document.getElementById('sortedByGrade').innerHTML = byGrade.length ? byGrade.map((s, i) => buildStudentItem(s, i, false)).join('') : empty;
    document.getElementById('sortedByName').innerHTML  = byName.length  ? byName.map((s, i)  => buildStudentItem(s, i, false)).join('') : empty;
    document.getElementById('sortedByGpa').innerHTML   = byGpa.length   ? byGpa.map((s, i)   => buildStudentItem(s, i, false)).join('') : empty;

    await loadStats();
  } catch (e) { console.error('loadAll error:', e); }
}

async function loadStats() {
  try {
    const s    = await apiFetch(`${API}/stats`);
    const body = document.getElementById('statsBody');
    if (!s.hasData) {
      body.innerHTML = `<div class="empty-state"><i class="fa-solid fa-chart-line"></i><p>Add students to see statistics.</p></div>`;
      return;
    }
    const passP = s.count ? (s.passCount / s.count * 100) : 0;
    const failP = 100 - passP;
    const medalClasses = ['gold', 'silver', 'bronze'];
    const medalIcons   = ['fa-trophy', 'fa-medal', 'fa-award'];
    const distColors   = ['#10b981','#60a5fa','#f59e0b','#fb923c','#ef4444'];
    const distKeys     = Object.keys(s.distribution);
    const maxDist      = Math.max(...Object.values(s.distribution), 1);
    const avgGpaLabel  = getPhGpaLabel(s.avgGpa);

    body.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card stat-avg">
          <div class="stat-label">Class Average</div>
          <div class="stat-value">${s.average}</div>
          <div class="stat-sub">${getLetter(s.average)} &middot; GPA ${s.avgGpa.toFixed(2)}</div>
        </div>
        <div class="stat-card stat-gpa">
          <div class="stat-label">Avg GPA (PH)</div>
          <div class="stat-value">${s.avgGpa.toFixed(2)}</div>
          <div class="stat-sub">${avgGpaLabel} &middot; 1.0&ndash;5.0 scale</div>
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
        <div class="pf-label">Pass / Fail Rate</div>
        <div class="pf-bar">
          <div class="pf-pass" style="width:${passP}%"></div>
          <div class="pf-fail" style="width:${failP}%"></div>
        </div>
        <div class="pf-counts">
          <span class="pf-count pass-c"><i class="fa-solid fa-check"></i> ${s.passCount} passed (&ge;75)</span>
          <span class="pf-count fail-c"><i class="fa-solid fa-xmark"></i> ${s.failCount} failed</span>
        </div>
      </div>

      <hr class="divider"/>

      <div class="leaderboard">
        <div class="section-title"><i class="fa-solid fa-ranking-star"></i> Top Leaderboard</div>
        ${s.top3.map((t, i) => `
          <div class="podium-item podium-${t.rank}">
            <div class="medal-icon ${medalClasses[i]}"><i class="fa-solid ${medalIcons[i]}"></i></div>
            <span class="podium-name">${escHtml(t.name)}</span>
            <span class="podium-grade ${getGradeClass(t.grade)}">${t.grade.toFixed(1)} &middot; ${t.letter} &middot; ${getPhGPA(t.grade).toFixed(2)}</span>
          </div>`).join('')}
      </div>

      <hr class="divider"/>

      <div class="dist-section">
        <div class="section-title"><i class="fa-solid fa-chart-bar"></i> Grade Distribution</div>
        ${distKeys.map((k, i) => `
          <div class="dist-row">
            <div class="dist-label">${k}</div>
            <div class="dist-bar-bg"><div class="dist-bar-fill" style="width:${s.distribution[k]/maxDist*100}%;background:${distColors[i]}"></div></div>
            <div class="dist-count">${s.distribution[k]}</div>
          </div>`).join('')}
      </div>`;
  } catch (e) { console.error('loadStats error:', e); }
}

async function addStudent() {
  const nameEl  = document.getElementById('addName');
  const gradeEl = document.getElementById('addGrade');
  const name    = nameEl.value.trim();
  const grade   = parseFloat(gradeEl.value);
  if (!name)                              { toast('Please enter a student name.', 'error'); nameEl.focus(); return; }
  if (isNaN(grade) || grade < 0 || grade > 100) { toast('Grade must be between 0 and 100.', 'error'); gradeEl.focus(); return; }
  try {
    const data = await apiFetch(`${API}/students`, { method: 'POST', body: JSON.stringify({ name, grade }) });
    if (data.success) { nameEl.value = ''; gradeEl.value = ''; toast(data.message); await loadAll(); }
    else toast(data.message, 'error');
  } catch (e) { toast('Failed to add student.', 'error'); }
}

async function deleteStudent(enc) {
  try {
    const data = await apiFetch(`${API}/students/${enc}`, { method: 'DELETE' });
    if (data.success) { toast(data.message); await loadAll(); }
    else toast(data.message, 'error');
  } catch (e) { toast('Failed to delete student.', 'error'); }
}

function openEdit(enc, grade) {
  document.getElementById('editName').value  = decodeURIComponent(enc);
  document.getElementById('editGrade').value = grade;
  document.getElementById('editModal').classList.add('open');
  document.getElementById('editGrade').focus();
}
function closeModal() { document.getElementById('editModal').classList.remove('open'); }

async function saveEdit() {
  const name  = document.getElementById('editName').value;
  const grade = parseFloat(document.getElementById('editGrade').value);
  if (isNaN(grade) || grade < 0 || grade > 100) { toast('Grade must be between 0 and 100.', 'error'); return; }
  try {
    const data = await apiFetch(`${API}/students/${encodeURIComponent(name)}`, { method: 'PUT', body: JSON.stringify({ grade }) });
    if (data.success) { closeModal(); toast(data.message); await loadAll(); }
    else toast(data.message, 'error');
  } catch (e) { toast('Failed to save changes.', 'error'); }
}

async function searchStudent() {
  const q  = document.getElementById('searchInput').value.trim();
  if (!q) return;
  const el = document.getElementById('searchResult');
  try {
    const d = await apiFetch(`${API}/search?q=${encodeURIComponent(q)}`);
    if (!d.name) {
      el.innerHTML = `<div style="color:var(--text-3);font-size:.82rem"><i class="fa-solid fa-circle-exclamation"></i> Student not found.</div>`;
    } else {
      const cls   = getGradeClass(d.grade);
      const phGpa = getPhGPA(d.grade);
      el.innerHTML = `
        <div class="sr-name">${escHtml(d.name)}</div>
        <div class="sr-row">
          <span class="sr-tag">${d.grade.toFixed(2)}</span>
          <span class="sr-tag grade-badge ${cls}" style="border:none">${getLetter(d.grade)}</span>
          <span class="sr-tag">GPA: ${phGpa.toFixed(2)}</span>
          <span class="sr-tag">${getPhGpaLabel(phGpa)}</span>
          <span class="sr-tag">${d.status}</span>
        </div>`;
    }
    el.classList.add('visible');
  } catch (e) {
    el.innerHTML = `<div style="color:var(--text-3);font-size:.82rem">Error searching.</div>`;
    el.classList.add('visible');
  }
}

function setSortStudents(sort) {
  currentSort = sort;
  ['sortNameBtn','sortGradeBtn','sortGpaBtn'].forEach(id => document.getElementById(id)?.classList.remove('active'));
  const map = { name: 'sortNameBtn', grade: 'sortGradeBtn', gpa: 'sortGpaBtn' };
  document.getElementById(map[sort])?.classList.add('active');
  loadAll();
}

function switchTab(name, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById(`tab-${name}`).classList.add('active');
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* ─────────────────────────────────────────
   EXCEL EXPORT
───────────────────────────────────────── */
async function exportExcel() {
  const btn = document.querySelector('.btn-excel');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  btn.disabled = true;
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js');
    const [students, stats] = await Promise.all([
      apiFetch(`${API}/students?sort=name`),
      apiFetch(`${API}/stats`)
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Grade Manager';
    wb.created  = new Date();

    const ws = wb.addWorksheet('Student Roster', { pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true } });
    ws.columns = [
      { key: 'no',     width: 5  },
      { key: 'name',   width: 32 },
      { key: 'grade',  width: 14 },
      { key: 'letter', width: 12 },
      { key: 'gpa',    width: 14 },
      { key: 'remarks',width: 14 },
      { key: 'status', width: 11 },
    ];

    const BLUE_DARK  = { argb: 'FF1E3A5F' };
    const BLUE_MID   = { argb: 'FF1D4ED8' };
    const BLUE_LIGHT = { argb: 'FFEFF6FF' };
    const WHITE      = { argb: 'FFFFFFFF' };
    const GRAY_ROW   = { argb: 'FFF8FAFC' };

    const thin = { style: 'thin', color: { argb: 'FFD1D5DB' } };
    const borderAll = { top: thin, left: thin, bottom: thin, right: thin };

    ws.mergeCells('A1:G1');
    const title = ws.getCell('A1');
    title.value = 'STUDENT GRADE REPORT';
    title.font  = { name: 'Calibri', size: 18, bold: true, color: WHITE };
    title.fill  = { type: 'pattern', pattern: 'solid', fgColor: BLUE_DARK };
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 36;

    ws.mergeCells('A2:G2');
    const sub = ws.getCell('A2');
    sub.value = `Grading System (CHED)  |  Generated: ${new Date().toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })}`;
    sub.font  = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF6B7280' } };
    sub.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    sub.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 18;

    ws.getRow(3).height = 6;

    const hdrs = ['#', 'Student Name', 'Numerical Grade', 'Letter Grade', 'GPA (PH 1.0–5.0)', 'Remarks', 'Status'];
    const hRow = ws.getRow(4);
    hRow.height = 24;
    hdrs.forEach((h, i) => {
      const c = hRow.getCell(i + 1);
      c.value = h;
      c.font  = { name: 'Calibri', size: 11, bold: true, color: WHITE };
      c.fill  = { type: 'pattern', pattern: 'solid', fgColor: BLUE_MID };
      c.alignment = { horizontal: i === 1 ? 'left' : 'center', vertical: 'middle' };
      c.border = borderAll;
    });

    students.forEach((s, idx) => {
      const r     = ws.getRow(5 + idx);
      r.height    = 20;
      const even  = idx % 2 === 0;
      const bg    = { type: 'pattern', pattern: 'solid', fgColor: even ? WHITE : GRAY_ROW };
      const gpa   = getPhGPA(s.grade);
      const rmk   = getPhGpaLabel(gpa);
      const vals  = [idx + 1, s.name, s.grade.toFixed(2), getLetter(s.grade), gpa.toFixed(2), rmk, s.status];

      vals.forEach((v, ci) => {
        const c  = r.getCell(ci + 1);
        c.value  = v;
        c.fill   = bg;
        c.border = borderAll;
        c.alignment = { horizontal: ci === 1 ? 'left' : 'center', vertical: 'middle' };

        const g = s.grade;
        let fc = { argb: 'FF1F2937' };
        if (ci === 2 || ci === 3 || ci === 4 || ci === 5) {
          if (g >= 90) fc = { argb: 'FF059669' };
          else if (g >= 80) fc = { argb: 'FF2563EB' };
          else if (g >= 70) fc = { argb: 'FFB45309' };
          else if (g >= 75) fc = { argb: 'FF374151' };
          else fc = { argb: 'FFDC2626' };
        }
        if (ci === 6) fc = s.status === 'Pass' ? { argb: 'FF059669' } : { argb: 'FFDC2626' };
        c.font = { name: 'Calibri', size: 10, color: fc, bold: ci === 6 };
      });
    });

    const sumR = ws.getRow(5 + students.length + 1);
    sumR.height = 20;
    if (stats.hasData) {
      const sumVals = ['', `Total: ${stats.count} students`, '', '', '', `Avg GPA: ${stats.avgGpa.toFixed(2)}`, `Pass: ${stats.passCount}  Fail: ${stats.failCount}`];
      sumVals.forEach((v, i) => {
        const c = sumR.getCell(i + 1);
        c.value = v;
        c.font  = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E3A5F' } };
        c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
        c.alignment = { horizontal: i === 1 ? 'left' : 'center', vertical: 'middle' };
        c.border = borderAll;
      });
    }

    if (stats.hasData) {
      const ws2 = wb.addWorksheet('Statistics');
      ws2.columns = [{ width: 28 }, { width: 22 }, { width: 28 }, { width: 22 }];

      ws2.mergeCells('A1:D1');
      const st = ws2.getCell('A1');
      st.value = 'STATISTICS SUMMARY';
      st.font  = { name: 'Calibri', size: 16, bold: true, color: WHITE };
      st.fill  = { type: 'pattern', pattern: 'solid', fgColor: BLUE_DARK };
      st.alignment = { horizontal: 'center', vertical: 'middle' };
      ws2.getRow(1).height = 32;

      const statData = [
        ['Total Students', stats.count, 'Pass Rate', `${((stats.passCount/stats.count)*100).toFixed(1)}%`],
        ['Passed (≥75)', stats.passCount, 'Failed (<75)', stats.failCount],
        ['Class Average', `${stats.average} (${getLetter(stats.average)})`, 'Average GPA (PH)', stats.avgGpa.toFixed(2)],
        ['Highest Score', `${stats.highest.grade} — ${stats.highest.name}`, 'Lowest Score', `${stats.lowest.grade} — ${stats.lowest.name}`],
      ];

      statData.forEach((row, ri) => {
        const r = ws2.getRow(ri + 2);
        r.height = 22;
        row.forEach((v, ci) => {
          const c = r.getCell(ci + 1);
          c.value = v;
          const isLabel = ci % 2 === 0;
          c.font  = { name: 'Calibri', size: 11, bold: isLabel, color: isLabel ? { argb: 'FF1E3A5F' } : { argb: 'FF111827' } };
          c.fill  = { type: 'pattern', pattern: 'solid', fgColor: ri % 2 === 0 ? BLUE_LIGHT : WHITE };
          c.alignment = { horizontal: isLabel ? 'right' : 'left', vertical: 'middle' };
          c.border = borderAll;
        });
      });

      ws2.getRow(7).height = 8;
      ws2.mergeCells('A8:D8');
      const tp = ws2.getCell('A8');
      tp.value = 'TOP PERFORMERS';
      tp.font  = { name: 'Calibri', size: 12, bold: true, color: WHITE };
      tp.fill  = { type: 'pattern', pattern: 'solid', fgColor: BLUE_MID };
      tp.alignment = { horizontal: 'center', vertical: 'middle' };
      ws2.getRow(8).height = 22;

      stats.top3.forEach((t, i) => {
        const r = ws2.getRow(i + 9);
        r.height = 20;
        const medals = ['1st Place', '2nd Place', '3rd Place'];
        [medals[i], t.name, `${t.grade.toFixed(2)} (${t.letter})`, `GPA: ${getPhGPA(t.grade).toFixed(2)}`].forEach((v, ci) => {
          const c = r.getCell(ci + 1);
          c.value = v;
          c.font  = { name: 'Calibri', size: 11, bold: ci === 0 };
          c.fill  = { type: 'pattern', pattern: 'solid', fgColor: i === 0 ? { argb: 'FFFEFCE8' } : i === 1 ? { argb: 'FFF8FAFC' } : { argb: 'FFFDF4FF' } };
          c.alignment = { horizontal: ci === 1 ? 'left' : 'center', vertical: 'middle' };
          c.border = borderAll;
        });
      });

      ws2.getRow(14).height = 8;
      ws2.mergeCells('A15:D15');
      const lg = ws2.getCell('A15');
      lg.value = 'GPA SCALE (CHED)';
      lg.font  = { name: 'Calibri', size: 12, bold: true, color: WHITE };
      lg.fill  = { type: 'pattern', pattern: 'solid', fgColor: BLUE_MID };
      lg.alignment = { horizontal: 'center', vertical: 'middle' };
      ws2.getRow(15).height = 22;

      const legend = [
        ['1.00', '97–100', 'Excellent'],['1.25','94–96','Excellent'],['1.50','91–93','Very Good'],
        ['1.75','88–90','Very Good'],['2.00','85–87','Good'],['2.25','82–84','Good'],
        ['2.50','79–81','Satisfactory'],['2.75','76–78','Satisfactory'],['3.00','75','Passing'],
        ['5.00','Below 75','Failed'],
      ];
      legend.forEach((row, ri) => {
        const r = ws2.getRow(16 + ri);
        r.height = 18;
        const failed = row[0] === '5.00';
        [row[0], row[1], row[2], ''].forEach((v, ci) => {
          const c = r.getCell(ci + 1);
          c.value = v;
          c.font  = { name: 'Calibri', size: 10, bold: ci === 0, color: failed ? { argb: 'FFDC2626' } : { argb: 'FF111827' } };
          c.fill  = { type: 'pattern', pattern: 'solid', fgColor: ri % 2 === 0 ? BLUE_LIGHT : WHITE };
          c.alignment = { horizontal: 'center', vertical: 'middle' };
          c.border = borderAll;
        });
      });
    }

    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    downloadBlob(blob, `grade-report-${today()}.xlsx`);
    toast('Excel report exported.', 'success');
  } catch (e) {
    console.error(e);
    toast('Excel export failed.', 'error');
  } finally {
    btn.innerHTML = '<i class="fa-solid fa-file-excel"></i><span class="export-label">Excel</span>';
    btn.disabled = false;
  }
}

/* ─────────────────────────────────────────
   DOCX EXPORT
───────────────────────────────────────── */
async function exportDocx() {
  const btn = document.querySelector('.btn-word');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  btn.disabled = true;
  try {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
    const [students, stats] = await Promise.all([
      apiFetch(`${API}/students?sort=name`),
      apiFetch(`${API}/stats`)
    ]);

    const dateStr = new Date().toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' });

    const dataRows = students.map((s, i) => {
      const gpa    = getPhGPA(s.grade).toFixed(2);
      const rmk    = getPhGpaLabel(getPhGPA(s.grade));
      const pColor = s.status === 'Pass' ? '059669' : 'DC2626';
      const gColor = s.grade >= 90 ? '059669' : s.grade >= 80 ? '2563EB' : s.grade >= 75 ? 'B45309' : 'DC2626';
      const rowBg  = i % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
      return `<w:tr>
        ${dCell(String(i+1),            { align:'center', width:450,  bg:rowBg })}
        ${dCell(s.name,                 { align:'left',   width:2900, bg:rowBg })}
        ${dCell(s.grade.toFixed(2),     { align:'center', width:1100, bg:rowBg, color:gColor })}
        ${dCell(getLetter(s.grade),     { align:'center', width:1000, bg:rowBg, color:gColor })}
        ${dCell(gpa,                    { align:'center', width:1100, bg:rowBg, color:gColor })}
        ${dCell(rmk,                    { align:'center', width:1400, bg:rowBg, color:gColor })}
        ${dCell(s.status,               { align:'center', width:1000, bg:rowBg, bold:true, color:pColor })}
      </w:tr>`;
    }).join('');

    let statsXml = '';
    if (stats.hasData) {
      statsXml = `
        ${dPara('', {})}
        ${dPara('STATISTICS SUMMARY', { bold:true, size:26, color:'1E3A5F', align:'left', spaceAfter:120 })}
        ${[
          [`Total Students: ${stats.count}`, `Pass Rate: ${((stats.passCount/stats.count)*100).toFixed(1)}%`],
          [`Passed (≥75): ${stats.passCount}`, `Failed (<75): ${stats.failCount}`],
          [`Class Average: ${stats.average} (${getLetter(stats.average)})`, `Average GPA (PH): ${stats.avgGpa.toFixed(2)} – ${getPhGpaLabel(stats.avgGpa)}`],
          [`Highest: ${stats.highest.grade} — ${stats.highest.name}`, `Lowest: ${stats.lowest.grade} — ${stats.lowest.name}`],
        ].map((row, ri) => `
          <w:tbl>
            <w:tblPr>
              <w:tblW w:w="9100" w:type="dxa"/>
              <w:tblBorders><w:insideH w:val="none"/><w:insideV w:val="none"/></w:tblBorders>
            </w:tblPr>
            <w:tr>
              ${dCell(row[0], { align:'left', width:4550, bg: ri%2===0 ? 'EFF6FF':'FFFFFF', bold:false })}
              ${dCell(row[1], { align:'left', width:4550, bg: ri%2===0 ? 'EFF6FF':'FFFFFF', bold:false })}
            </w:tr>
          </w:tbl>`).join('')}
        ${dPara('', {})}
        ${dPara('TOP PERFORMERS', { bold:true, size:24, color:'1D4ED8', align:'left', spaceAfter:100 })}
        ${stats.top3.map((t, i) => {
          const medals = ['1st Place','2nd Place','3rd Place'];
          return dPara(`${medals[i]}  |  ${t.name}  |  ${t.grade.toFixed(2)} (${t.letter})  |  GPA: ${getPhGPA(t.grade).toFixed(2)}`, { size:22, color:'1F2937', spaceAfter:80 });
        }).join('')}
        ${dPara('', {})}
        ${dPara('GPA SCALE (CHED)', { bold:true, size:24, color:'1E3A5F', align:'left', spaceAfter:100 })}
        <w:tbl>
          <w:tblPr>
            <w:tblW w:w="9100" w:type="dxa"/>
            <w:tblBorders>
              <w:top    w:val="single" w:sz="4" w:color="1D4ED8"/>
              <w:bottom w:val="single" w:sz="4" w:color="1D4ED8"/>
              <w:insideH w:val="single" w:sz="2" w:color="D1D5DB"/>
              <w:insideV w:val="single" w:sz="2" w:color="D1D5DB"/>
            </w:tblBorders>
          </w:tblPr>
          <w:tr>
            ${dCell('GPA', { align:'center', width:1500, bg:'1D4ED8', color:'FFFFFF', bold:true, hdr:true })}
            ${dCell('Grade Range', { align:'center', width:2200, bg:'1D4ED8', color:'FFFFFF', bold:true, hdr:true })}
            ${dCell('Remarks', { align:'center', width:5400, bg:'1D4ED8', color:'FFFFFF', bold:true, hdr:true })}
          </w:tr>
          ${[
            ['1.00','97–100','Excellent'],['1.25','94–96','Excellent'],['1.50','91–93','Very Good'],
            ['1.75','88–90','Very Good'],['2.00','85–87','Good'],['2.25','82–84','Good'],
            ['2.50','79–81','Satisfactory'],['2.75','76–78','Satisfactory'],['3.00','75','Passing'],
            ['5.00','Below 75','Failed'],
          ].map((row, ri) => `
            <w:tr>
              ${dCell(row[0], { align:'center', width:1500, bg: ri%2===0 ? 'EFF6FF':'FFFFFF', color: row[0]==='5.00' ? 'DC2626':'111827', bold:true })}
              ${dCell(row[1], { align:'center', width:2200, bg: ri%2===0 ? 'EFF6FF':'FFFFFF', color:'374151' })}
              ${dCell(row[2], { align:'left',   width:5400, bg: ri%2===0 ? 'EFF6FF':'FFFFFF', color:'374151' })}
            </w:tr>`).join('')}
        </w:tbl>`;
    }

    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${dPara('STUDENT GRADE REPORT', { bold:true, size:36, align:'center', color:'1E3A5F', spaceAfter:80 })}
    ${dPara('Grading System (CHED Standard)', { size:20, align:'center', color:'6B7280', spaceAfter:60 })}
    ${dPara(`Generated: ${dateStr}`, { size:18, align:'center', color:'9CA3AF', spaceAfter:300 })}
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9100" w:type="dxa"/>
        <w:tblBorders>
          <w:top    w:val="single" w:sz="6" w:color="1D4ED8"/>
          <w:bottom w:val="single" w:sz="6" w:color="1D4ED8"/>
          <w:insideH w:val="single" w:sz="2" w:color="D1D5DB"/>
          <w:insideV w:val="single" w:sz="2" w:color="D1D5DB"/>
        </w:tblBorders>
        <w:tblLook w:firstRow="1"/>
      </w:tblPr>
      <w:tr>
        ${dCell('#',                 { align:'center', width:450,  bg:'1E3A5F', color:'FFFFFF', bold:true, hdr:true })}
        ${dCell('Student Name',      { align:'left',   width:2900, bg:'1E3A5F', color:'FFFFFF', bold:true, hdr:true })}
        ${dCell('Grade',             { align:'center', width:1100, bg:'1E3A5F', color:'FFFFFF', bold:true, hdr:true })}
        ${dCell('Letter',            { align:'center', width:1000, bg:'1E3A5F', color:'FFFFFF', bold:true, hdr:true })}
        ${dCell('GPA (PH)',          { align:'center', width:1100, bg:'1E3A5F', color:'FFFFFF', bold:true, hdr:true })}
        ${dCell('Remarks',           { align:'center', width:1400, bg:'1E3A5F', color:'FFFFFF', bold:true, hdr:true })}
        ${dCell('Status',            { align:'center', width:1000, bg:'1E3A5F', color:'FFFFFF', bold:true, hdr:true })}
      </w:tr>
      ${dataRows}
    </w:tbl>
    ${statsXml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    const zip = new JSZip();
    zip.file('[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml"   ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`);

    zip.file('_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

    zip.file('word/document.xml', docXml);

    zip.file('word/_rels/document.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"   Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>`);

    zip.file('word/styles.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:sz w:val="22"/><w:szCs w:val="22"/>
    </w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr>
      <w:spacing w:after="120" w:line="276" w:lineRule="auto"/>
    </w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
</w:styles>`);

    zip.file('word/settings.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
  <w:compat>
    <w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>
  </w:compat>
</w:settings>`);

    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    downloadBlob(blob, `grade-report-${today()}.docx`);
    toast('Word report exported.', 'success');
  } catch (e) {
    console.error(e);
    toast('Word export failed.', 'error');
  } finally {
    btn.innerHTML = '<i class="fa-solid fa-file-word"></i><span class="export-label">Word</span>';
    btn.disabled = false;
  }
}

/* ─── DOCX XML ─── */
function dPara(text, { bold=false, size=22, align='left', color='000000', spaceAfter=160 } = {}) {
  return `<w:p>
    <w:pPr><w:jc w:val="${align}"/><w:spacing w:after="${spaceAfter}"/></w:pPr>
    <w:r><w:rPr>${bold?'<w:b/>':''}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:color w:val="${color}"/></w:rPr>
    <w:t xml:space="preserve">${escXml(text)}</w:t></w:r>
  </w:p>`;
}

function dCell(text, { bold=false, align='left', width=1500, bg='', color='000000', hdr=false } = {}) {
  const shd  = bg ? `<w:shd w:val="clear" w:color="auto" w:fill="${bg}"/>` : '';
  const hdrMk = hdr ? '<w:tblHeader/>' : '';
  return `<w:tc>
    <w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${shd}</w:tcPr>
    <w:p>
      <w:pPr><w:jc w:val="${align}"/><w:spacing w:after="60"/>${hdrMk}</w:pPr>
      <w:r><w:rPr>${bold?'<w:b/>':''}<w:color w:val="${color}"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>
      <w:t xml:space="preserve">${escXml(String(text))}</w:t></w:r>
    </w:p>
  </w:tc>`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function today() { return new Date().toISOString().slice(0, 10); }

document.addEventListener('DOMContentLoaded', () => {
  loadAll();
  document.getElementById('addGrade').addEventListener('keydown',   e => { if (e.key === 'Enter') addStudent(); });
  document.getElementById('addName').addEventListener('keydown',    e => { if (e.key === 'Enter') document.getElementById('addGrade').focus(); });
  document.getElementById('searchInput').addEventListener('keydown', e => { if (e.key === 'Enter') searchStudent(); });
  document.getElementById('editModal').addEventListener('click', e  => { if (e.target === document.getElementById('editModal')) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
});
