// GTA VI trophy guide and tracker: all 55 trophies, checklist saved in the
// browser (localStorage) with export and import, filters by grade and kind,
// search, a spoiler setting that hides story trophies until earned, a
// missable flag, and a 6-step roadmap to the platinum. No network: it only
// fetches data/trophies.json from its own files.
const KEY = 'gta6-trophy-checklist';
const SPOILER_KEY = 'gta6-trophy-spoilers';
const rows = document.getElementById('rows');
const gradeSel = document.getElementById('grade');
const kindSel = document.getElementById('kind');
const statusSel = document.getElementById('status');
const searchInput = document.getElementById('search');
const spoilerBox = document.getElementById('spoilers');
const missableBox = document.getElementById('missable-only');
let earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
spoilerBox.checked = localStorage.getItem(SPOILER_KEY) !== 'off';
const doc = await (await fetch('data/trophies.json')).json();

// Deep-linkable filters (used by the screenshots and by sharing a view):
// ?grade=silver, ?kind=crime, ?status=remaining, ?scroll=1400
const params = new URLSearchParams(location.search);
for (const [key, el] of [['grade', gradeSel], ['kind', kindSel], ['status', statusSel]]) {
  const v = params.get(key);
  if (v && [...el.options].some((o) => o.value === v)) el.value = v;
}
const scrollTo = Number(params.get('scroll') ?? 0);
if (scrollTo > 0) addEventListener('load', () => window.scrollTo(0, scrollTo));

function save() {
  localStorage.setItem(KEY, JSON.stringify([...earned]));
}

const KIND_LABEL = { story: 'Story', activity: 'Activity', stranger: 'Strangers', collectible: 'Collectibles', crime: 'Crime', exploration: 'Exploration', completion: 'Completion', misc: 'Misc' };

// Roadmap
const stepsEl = document.getElementById('roadmap-steps');
for (const s of doc.roadmap) {
  const li = document.createElement('li');
  const b = document.createElement('strong');
  b.textContent = s.title;
  li.append(b, document.createTextNode(': ' + s.text));
  stepsEl.append(li);
}
document.getElementById('roadmap-toggle').addEventListener('click', (e) => {
  const hidden = stepsEl.style.display === 'none';
  stepsEl.style.display = hidden ? '' : 'none';
  e.target.textContent = hidden ? 'Hide' : 'Show';
});

// Sources
const srcList = document.getElementById('source-list');
for (const s of doc.sources) {
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = s.url;
  a.textContent = s.name;
  a.target = '_blank';
  a.rel = 'noopener';
  li.append(a, document.createTextNode(' — ' + s.what));
  srcList.append(li);
}

function isHidden(t) {
  return spoilerBox.checked && t.hidden && !earned.has(t.name);
}

function render() {
  rows.replaceChildren();
  const q = searchInput.value.trim().toLowerCase();
  let shown = 0;
  for (const t of doc.trophies) {
    const has = earned.has(t.name);
    if (gradeSel.value !== 'all' && t.grade !== gradeSel.value) continue;
    if (kindSel.value !== 'all' && t.kind !== kindSel.value) continue;
    if (statusSel.value === 'earned' && !has) continue;
    if (statusSel.value === 'remaining' && has) continue;
    if (missableBox.checked && !t.missable) continue;
    if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.guide.toLowerCase().includes(q))) continue;
    shown++;
    const tr = document.createElement('tr');
    if (has) tr.classList.add('earned');
    if (t.missable) tr.classList.add('missable');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = has;
    box.setAttribute('aria-label', 'Mark ' + t.name + ' earned');
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.name);
      else earned.delete(t.name);
      save();
      render();
    });
    const tdBox = document.createElement('td');
    tdBox.append(box);
    tr.append(tdBox);

    const tdName = document.createElement('td');
    if (isHidden(t)) {
      tdName.textContent = 'Hidden trophy — earn it to reveal';
      tdName.classList.add('hidden-trophy');
    } else {
      const name = document.createElement('strong');
      name.textContent = t.name;
      tdName.append(name, document.createElement('br'), document.createTextNode(t.description));
      if (t.missable) {
        const flag = document.createElement('span');
        flag.className = 'flag';
        flag.textContent = '⚠️ possibly missable';
        tdName.append(document.createElement('br'), flag);
      }
    }
    tr.append(tdName);

    const tdGrade = document.createElement('td');
    tdGrade.textContent = t.grade;
    tdGrade.className = 'grade-' + t.grade;
    tr.append(tdGrade);

    const tdKind = document.createElement('td');
    tdKind.textContent = KIND_LABEL[t.kind] ?? t.kind;
    tr.append(tdKind);

    const tdGuide = document.createElement('td');
    if (isHidden(t)) {
      tdGuide.textContent = 'Story trophy — hidden while spoilers are on.';
    } else {
      const detail = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = t.guide.split('.')[0] + '.';
      detail.append(summary);
      const full = document.createElement('p');
      full.textContent = t.guide;
      detail.append(full);
      const src = document.createElement('p');
      src.className = 'src';
      src.textContent = 'Sources: ' + t.sources.join(', ');
      detail.append(src);
      tdGuide.append(detail);
    }
    tr.append(tdGuide);
    rows.append(tr);
  }
  document.getElementById('progress').textContent = `${earned.size} of ${doc.trophies.length} earned`;
  document.getElementById('pct').textContent = Math.round((earned.size / doc.trophies.length) * 100) + '%';
  document.getElementById('barfill').style.width = (earned.size / doc.trophies.length) * 100 + '%';
  document.getElementById('count').textContent = `Showing ${shown} of ${doc.trophies.length} trophies`;
}

document.getElementById('export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify([...earned])], { type: 'application/json' }));
  a.download = 'trophy-progress.json';
  a.click();
});
document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const names = JSON.parse(await file.text());
    earned = new Set(names.filter((n) => doc.trophies.some((t) => t.name === n)));
  } catch {
    return;
  }
  save();
  render();
});
document.getElementById('reset').addEventListener('click', () => {
  if (!confirm('Clear all earned trophies?')) return;
  earned = new Set();
  save();
  render();
});
spoilerBox.addEventListener('change', () => {
  localStorage.setItem(SPOILER_KEY, spoilerBox.checked ? 'on' : 'off');
  render();
});
for (const el of [gradeSel, kindSel, statusSel, missableBox]) el.addEventListener('change', render);
searchInput.addEventListener('input', render);
render();
