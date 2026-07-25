/* ==========================================================================
   gamification.js — SIGNOVA
   Motor central de gamificación: racha diaria, XP/nivel y logros.
   Se incluye en TODAS las páginas para que la racha se vea en el navbar
   sin importar en qué página estés, y para que los logros se evalúen
   siempre con los mismos datos (localStorage) sin duplicar lógica.
   ========================================================================== */

(function () {
  'use strict';

  /* ---- Catálogo de logros -------------------------------------------- */
  /* Cada logro sabe evaluarse solo a partir de "stats" (ver obtenerStats). */
  const LOGROS = [
    { id: 'perfil',       icon: '👤', nombre: 'Perfil creado',      desc: 'Creaste tu cuenta en SIGNOVA',                check: s => s.tieneSesion },
    { id: 'primer-quiz',  icon: '🧠', nombre: 'Primer quiz',        desc: 'Completaste tu primer quiz',                  check: s => s.quizJugados > 0 },
    { id: 'puntaje-10',   icon: '⭐', nombre: 'Puntaje 10+',        desc: 'Sacaste 10 puntos o más en un quiz',          check: s => s.quizMejor >= 10 },
    { id: 'buscador',     icon: '🔍', nombre: 'Usaste el buscador', desc: 'Buscaste una seña en el traductor',           check: s => s.usoBuscador },
    { id: '5-partidas',   icon: '🎮', nombre: '5 partidas',         desc: 'Jugaste 5 partidas en total',                 check: s => s.partidasTotales >= 5 },
    { id: 'explorador',   icon: '🗺️', nombre: 'Explorador',         desc: 'Visitaste 5 categorías de lecciones',         check: s => s.categoriasVisitadas >= 5 },
    { id: 'velocista',    icon: '⏱️', nombre: 'Velocista',          desc: 'Jugaste una ronda de Contrarreloj',           check: s => s.contrarrelojJugado },
    { id: 'combo-x3',     icon: '💥', nombre: 'Combo x3',           desc: 'Encadenaste un combo x3 en Contrarreloj',     check: s => s.comboMax >= 3 },
    { id: 'deletreo',     icon: '🔤', nombre: 'Deletreo LSC',       desc: 'Completaste el reto de deletreo',             check: s => s.deletreoJugado },
    { id: 'constante',    icon: '🔥', nombre: 'Constante',          desc: 'Racha de 3 días seguidos practicando',        check: s => s.racha >= 3 },
    { id: 'racha-7',      icon: '📅', nombre: 'Racha de 7 días',    desc: '7 días seguidos practicando en SIGNOVA',      check: s => s.racha >= 7 },
    { id: 'maestro',      icon: '🏆', nombre: 'Maestro de señas',   desc: '20 partidas jugadas en total',                check: s => s.partidasTotales >= 20 },
  ];

  const XP_POR_NIVEL = 150;

  /* ---- Lectura de estado ------------------------------------------------ */
  function num(key) { return parseInt(localStorage.getItem(key) || '0', 10) || 0; }

  function obtenerStats() {
    const gamesPlayed = num('games_played');
    const quizPlayed  = num('quiz_played');
    const deletreoJug = num('deletreo_jugadas');
    return {
      tieneSesion:        !!localStorage.getItem('signova_sesion'),
      quizJugados:        quizPlayed,
      quizMejor:          num('quiz_best'),
      partidasTotales:    quizPlayed + gamesPlayed + deletreoJug,
      categoriasVisitadas: JSON.parse(localStorage.getItem('signova_categorias_visitadas') || '[]').length,
      usoBuscador:        localStorage.getItem('signova_uso_buscador') === '1',
      racha:              num('signova_racha_count'),
      contrarrelojJugado: !!localStorage.getItem('contrarreloj_best'),
      comboMax:           num('contrarreloj_combo_max'),
      deletreoJugado:     !!localStorage.getItem('deletreo_best'),
      gamesPlayed, deletreoJug,
    };
  }

  function calcularXP(stats) {
    return stats.quizJugados * 15
      + stats.gamesPlayed * 20
      + stats.deletreoJug * 15
      + stats.categoriasVisitadas * 10
      + stats.racha * 5
      + (stats.usoBuscador ? 10 : 0);
  }

  function obtenerNivel(xp) {
    const nivel = Math.floor(xp / XP_POR_NIVEL) + 1;
    const progreso = xp % XP_POR_NIVEL;
    return { nivel, progreso, porcentaje: Math.round((progreso / XP_POR_NIVEL) * 100) };
  }

  /* ---- Racha diaria ------------------------------------------------- */
  function hoyISO(offsetDias) {
    const d = new Date();
    d.setDate(d.getDate() + (offsetDias || 0));
    return d.toISOString().slice(0, 10);
  }

  function actualizarRacha() {
    const hoy = hoyISO(0);
    const ultima = localStorage.getItem('signova_racha_fecha');
    let count = num('signova_racha_count');
    if (ultima !== hoy) {
      const ayer = hoyISO(-1);
      count = (ultima === ayer) ? count + 1 : 1;
      localStorage.setItem('signova_racha_fecha', hoy);
      localStorage.setItem('signova_racha_count', String(count));
    }
    return count;
  }

  /* ---- Categorías visitadas / uso del buscador ------------------------ */
  function registrarVisitaCategoria(nombre) {
    const arr = JSON.parse(localStorage.getItem('signova_categorias_visitadas') || '[]');
    if (arr.indexOf(nombre) === -1) {
      arr.push(nombre);
      localStorage.setItem('signova_categorias_visitadas', JSON.stringify(arr));
    }
  }

  function detectarPagina() {
    const path = location.pathname;
    if (path.indexOf('/lecciones/') !== -1 && path.indexOf('categorias.html') === -1) {
      const nombre = path.split('/').pop().replace('.html', '');
      if (nombre) registrarVisitaCategoria(nombre);
    }
    if (path.indexOf('traductor.html') !== -1) {
      localStorage.setItem('signova_uso_buscador', '1');
    }
  }

  /* ---- Historial unificado -------------------------------------------- */
  function registrarHistorial(icon, texto, valor) {
    const h = JSON.parse(localStorage.getItem('signova_historial') || '[]');
    h.push({ icon, texto, valor, fecha: new Date().toLocaleDateString('es-CO') });
    if (h.length > 25) h.shift();
    localStorage.setItem('signova_historial', JSON.stringify(h));
  }

  /* ---- Evaluación de logros + detección de "nuevos" -------------------- */
  function evaluarLogros() {
    const stats = obtenerStats();
    const previos = JSON.parse(localStorage.getItem('signova_logros_desbloqueados') || '[]');
    const resultado = LOGROS.map(l => ({ ...l, desbloqueado: !!l.check(stats) }));
    const desbloqueadosAhora = resultado.filter(l => l.desbloqueado).map(l => l.id);
    const nuevos = resultado.filter(l => l.desbloqueado && previos.indexOf(l.id) === -1);
    localStorage.setItem('signova_logros_desbloqueados', JSON.stringify(desbloqueadosAhora));
    return { resultado, nuevos, stats };
  }

  /* ---- Render del badge de racha en el navbar -------------------------- */
  function renderNavbarRacha(count) {
    const slot = document.getElementById('navbar-racha-slot');
    if (!slot) return;
    slot.innerHTML = count > 0
      ? `<span class="racha-badge navbar-racha" title="Racha de días practicando en SIGNOVA">🔥 ${count} ${count === 1 ? 'día' : 'días'}</span>`
      : '';
  }

  /* ---- Toast de logro desbloqueado -------------------------------------- */
  function mostrarToastLogro(logro) {
    const toast = document.createElement('div');
    toast.className = 'logro-toast';
    toast.innerHTML = `
      <span class="logro-toast-icon">${logro.icon}</span>
      <div>
        <div class="logro-toast-titulo">¡Logro desbloqueado!</div>
        <div class="logro-toast-nombre">${logro.nombre}</div>
      </div>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    }, 4200);
  }

  /* ---- Etiqueta de nombre de usuario en el navbar (reemplaza el snippet
     repetido que había suelto al final de cada página) -------------------- */
  function actualizarEtiquetaCuenta() {
    const sesion = JSON.parse(localStorage.getItem('signova_sesion') || 'null');
    const label = document.getElementById('nav-cuenta-label');
    if (sesion && label) label.textContent = sesion.nombre.split(' ')[0];
  }

  /* ---- Inicialización ---------------------------------------------- */
  function init() {
    detectarPagina();
    const racha = actualizarRacha();
    const { nuevos } = evaluarLogros();
    renderNavbarRacha(racha);
    actualizarEtiquetaCuenta();
    nuevos.forEach(mostrarToastLogro);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ---- API pública ---------------------------------------------------- */
  window.SIGNOVA = {
    LOGROS,
    obtenerStats,
    calcularXP,
    obtenerNivel,
    actualizarRacha,
    registrarVisitaCategoria,
    registrarHistorial,
    evaluarLogros,
    mostrarToastLogro,
  };
})();
