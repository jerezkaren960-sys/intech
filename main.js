// ============================================================
// main.js — InTech  |  Utilidades globales + validaciones
// ============================================================
const API = 'http://localhost:3000/api';

/* ── Validaciones ──────────────────────────────────────────── */
const Validar = {
  cedulaEcuatoriana(cedula) {
    if (!/^\d{10}$/.test(cedula)) return false;
    const prov = parseInt(cedula.substring(0, 2));
    if (prov < 1 || prov > 24) return false;
    const d = cedula.split('').map(Number);
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      let v = d[i];
      if (i % 2 === 0) { v *= 2; if (v > 9) v -= 9; }
      suma += v;
    }
    const res = suma % 10;
    return (res === 0 ? 0 : 10 - res) === d[9];
  },
  telefono(tel) { return /^(09|0[2-7])\d{8}$/.test(tel); },
  correo(c)     { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c); },
  textoMin(t, n){ return t.trim().length >= n; },
  numeroPos(n)  { return !isNaN(n) && Number(n) >= 0; },
  enteroPos(n)  { return Number.isInteger(Number(n)) && Number(n) >= 0; },
  serie(s)      { return s.trim().length >= 3; },
};

/* ── Helpers UI ────────────────────────────────────────────── */
function mostrarAlerta(el, tipo, msg) {
  el.className = `alerta ${tipo} show`;
  el.innerHTML = `<span>${tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : '⚠️'}</span> ${msg}`;
  setTimeout(() => { el.className = 'alerta'; }, 5000);
}

function marcarInput(input, ok) {
  input.classList.toggle('error', !ok);
  input.classList.toggle('ok',    ok);
}

function mostrarError(group, msg) {
  const em = group.querySelector('.error-msg');
  if (em) em.textContent = msg;
}

function limpiarError(group) {
  const em = group.querySelector('.error-msg');
  if (em) em.textContent = '';
}

/* ── Formato moneda ────────────────────────────────────────── */
function fmt$(n) { return `$${Number(n).toFixed(2)}`; }

/* ── Llamadas a la API ─────────────────────────────────────── */
async function apiGet(endpoint) {
  const r = await fetch(`${API}${endpoint}`);
  return r.json();
}
async function apiPost(endpoint, data) {
  const r = await fetch(`${API}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return r.json();
}
async function apiPut(endpoint, data) {
  const r = await fetch(`${API}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return r.json();
}
async function apiDel(endpoint) {
  const r = await fetch(`${API}${endpoint}`, { method: 'DELETE' });
  return r.json();
}

/* ── Filtro de tabla ───────────────────────────────────────── */
function filtrarTabla(inputEl, tbodyId) {
  inputEl.addEventListener('input', () => {
    const q = inputEl.value.toLowerCase();
    document.querySelectorAll(`#${tbodyId} tr`).forEach(tr => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

/* ── Marcar nav activo ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('.nav-links a');
  links.forEach(a => {
    if (a.href === window.location.href) a.classList.add('active');
  });
});
