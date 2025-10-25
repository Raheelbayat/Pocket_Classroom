const SCHEMA = 'pocket-classroom/v1';

// utilities
function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

function indexKey() { return 'pc_capsules_index'; }
function capsuleKey(id) { return `pc_capsule_${id}`; }
function progressKey(id) { return `pc_progress_${id}`; }

function safeParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

// indexlist
export function listIndex() {
  const parsed = safeParse(localStorage.getItem(indexKey()), null);
  if (!Array.isArray(parsed)) return [];
  return parsed;
}

export function saveIndex(arr) {
  localStorage.setItem(indexKey(), JSON.stringify(arr));
}

// saving capsule and handling it
export function saveCapsule(obj, id = null) {
  const cid = id || uid();
  const now = new Date().toISOString();
  const capsule = Object.assign({}, obj, { updatedAt: now });
  localStorage.setItem(capsuleKey(cid), JSON.stringify({ schema: SCHEMA, capsule }));

  // Update index
  const idx = listIndex();
  const existing = idx.find(i => i.id === cid);
  const meta = {
    id: cid,
    title: capsule.meta?.title || 'Untitled',
    subject: capsule.meta?.subject || '',
    level: capsule.meta?.level || '',
    updatedAt: now
  };

  if (existing) Object.assign(existing, meta);
  else idx.unshift(meta);

  saveIndex(idx);
  return cid;
}

export function loadCapsule(id) {
  const raw = localStorage.getItem(capsuleKey(id));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.schema !== SCHEMA) return null;
    return parsed.capsule;
  } catch { return null; }
}

export function deleteCapsule(id) {
  localStorage.removeItem(capsuleKey(id));
  localStorage.removeItem(progressKey(id));
  const idx = listIndex().filter(i => i.id !== id);
  saveIndex(idx);
}

//progress
export function getProgress(id) {
  const parsed = safeParse(localStorage.getItem(progressKey(id)), null);
  if (!parsed || typeof parsed !== 'object') return { bestScore: 0, knownFlashcards: [] };
  return parsed;
}

export function saveProgress(id, progress) {
  localStorage.setItem(progressKey(id), JSON.stringify(progress));
}

//JSON Export+Import
export function exportCapsuleJSON(capsule) {
  return JSON.stringify({ schema: SCHEMA, capsule }, null, 2);
}

export function validateImported(obj) {
  if (!obj || obj.schema !== SCHEMA) return false;
  const c = obj.capsule;
  if (!c?.meta?.title) return false;
  if (!((c.notes && c.notes.length) || (c.flashcards && c.flashcards.length) || (c.quiz && c.quiz.length))) return false;
  return true;
}

export function importCapsule(obj) {
  if (!validateImported(obj)) throw new Error('Invalid capsule schema or missing fields');
  const id = uid();
  const capsuleObj = { ...obj.capsule, updatedAt: new Date().toISOString() };
  localStorage.setItem(capsuleKey(id), JSON.stringify({ schema: SCHEMA, capsule: capsuleObj }));

  const idx = listIndex();
  const meta = {
    id,
    title: capsuleObj.meta.title,
    subject: capsuleObj.meta.subject || '',
    level: capsuleObj.meta.level || '',
    updatedAt: capsuleObj.updatedAt
  };
  idx.unshift(meta);
  saveIndex(idx);
  return id;
}

// export.defaultstate
export default {
  listIndex,
  saveIndex,
  saveCapsule,
  loadCapsule,
  deleteCapsule,
  getProgress,
  saveProgress,
  exportCapsuleJSON,
  validateImported,
  importCapsule
};
