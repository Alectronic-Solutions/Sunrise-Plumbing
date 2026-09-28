/* ============================================================
   SUNRISE PLUMBING: PIPE PUZZLE (homepage)
   Turn the pipes so water runs from the valve on the left to the
   house on the right. The section ships hidden and this file
   reveals it, so nothing half-works without JS.
   ============================================================ */

(function () {
  'use strict';

  var section = document.getElementById('fix-the-pipes');
  if (!section) return;

  var board = section.querySelector('[data-board]');
  var inlet = section.querySelector('[data-inlet]');
  var outlet = section.querySelector('[data-outlet]');
  var movesEl = section.querySelector('[data-moves]');
  var timeEl = section.querySelector('[data-time]');
  var bestEl = section.querySelector('[data-best]');
  var winBox = section.querySelector('[data-win]');
  var winText = section.querySelector('[data-win-text]');
  var status = section.querySelector('[data-status]');

  var SIZE = 5;
  var BEST_KEY = 'sp-pipes-best';
  // Openings as bits, clockwise from the top
  var N = 1, E = 2, S = 4, W = 8;
  var DIRS = [
    { bit: N, dr: -1, dc: 0, opp: S, name: 'up' },
    { bit: E, dr: 0, dc: 1, opp: W, name: 'right' },
    { bit: S, dr: 1, dc: 0, opp: N, name: 'down' },
    { bit: W, dr: 0, dc: -1, opp: E, name: 'left' }
  ];
  var TYPES = { straight: N | S, elbow: N | E, tee: N | E | S };
  var EDGE = { 1: 'M50 50V0', 2: 'M50 50H100', 4: 'M50 50V100', 8: 'M50 50H0' };
  var COLLAR = {
    1: '<rect x="33" y="4" width="34" height="7" rx="2"/>',
    2: '<rect x="89" y="33" width="7" height="34" rx="2"/>',
    4: '<rect x="33" y="89" width="34" height="7" rx="2"/>',
    8: '<rect x="4" y="33" width="7" height="34" rx="2"/>'
  };

  var tiles = [], inRow = 0, outRow = 0, moves = 0, seconds = 0, timer = null, won = false;

  var rand = function (n) { return Math.floor(Math.random() * n); };
  var rotCW = function (m) { return ((m << 1) | (m >> 3)) & 15; };
  var maskOf = function (t) { var m = t.base; for (var i = 0; i < t.rot % 4; i++) m = rotCW(m); return m; };
  var at = function (r, c) { return (r < 0 || c < 0 || r >= SIZE || c >= SIZE) ? null : tiles[r * SIZE + c]; };
  var shuffle = function (a) {
    for (var i = a.length - 1; i > 0; i--) { var j = rand(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };

  // The base shape plus the quarter turns that give mask m (m has 2 or 3 openings)
  var shapeFor = function (m) {
    var bases = [TYPES.straight, TYPES.elbow, TYPES.tee];
    for (var b = 0; b < bases.length; b++) {
      var x = bases[b];
      for (var r = 0; r < 4; r++) { if (x === m) return { base: bases[b], rot: r }; x = rotCW(x); }
    }
    return null;
  };

  /* Random path from the inlet to the outlet. A depth-first walk that
     never revisits a cell always ends in a simple path. */
  var findPath = function () {
    var seen = {}, path = [];
    var walk = function (r, c) {
      seen[r + ',' + c] = true;
      path.push([r, c]);
      if (r === outRow && c === SIZE - 1) return true;
      var order = shuffle(DIRS.slice());
      // Lean east half the time so paths wander without taking forever
      if (Math.random() < 0.5) order.sort(function (a, b) { return (b.bit === E) - (a.bit === E); });
      for (var i = 0; i < order.length; i++) {
        var nr = r + order[i].dr, nc = c + order[i].dc;
        if (nr < 0 || nc < 0 || nr >= SIZE || nc >= SIZE || seen[nr + ',' + nc]) continue;
        if (walk(nr, nc)) return true;
      }
      path.pop();
      return false;
    };
    walk(inRow, 0);
    return path;
  };

  var dirBetween = function (a, b) {
    for (var i = 0; i < 4; i++) if (a[0] + DIRS[i].dr === b[0] && a[1] + DIRS[i].dc === b[1]) return DIRS[i];
    return null;
  };

  /* Which tiles hold water, and how many steps from the valve */
  var flow = function () {
    var dist = new Array(tiles.length);
    var first = at(inRow, 0);
    if (!(maskOf(first) & W)) return dist;
    var queue = [[inRow, 0]];
    dist[inRow * SIZE] = 0;
    while (queue.length) {
      var cur = queue.shift(), m = maskOf(at(cur[0], cur[1]));
      for (var i = 0; i < 4; i++) {
        var d = DIRS[i];
        if (!(m & d.bit)) continue;
        var nr = cur[0] + d.dr, nc = cur[1] + d.dc, next = at(nr, nc);
        if (!next || dist[nr * SIZE + nc] !== undefined || !(maskOf(next) & d.opp)) continue;
        dist[nr * SIZE + nc] = dist[cur[0] * SIZE + cur[1]] + 1;
        queue.push([nr, nc]);
      }
    }
    return dist;
  };
  var isSolved = function (dist) {
    var i = outRow * SIZE + SIZE - 1;
    return dist[i] !== undefined && (maskOf(tiles[i]) & E) !== 0;
  };

  var svgFor = function (base) {
    var pipes = '', water = '', collars = '';
    for (var i = 0; i < 4; i++) {
      var b = DIRS[i].bit;
      if (!(base & b)) continue;
      pipes += EDGE[b];
      water += EDGE[b];
      collars += COLLAR[b];
    }
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
      '<path class="pg-casing" d="' + pipes + '"/>' +
      '<path class="pg-pipe" d="' + pipes + '"/>' +
      '<g class="pg-collar">' + collars + '</g>' +
      '<circle class="pg-hub" cx="50" cy="50" r="15"/>' +
      '<path class="pg-water" d="' + water + '"/>' +
      '<circle class="pg-water-hub" cx="50" cy="50" r="8"/>' +
      '</svg>';
  };

  var describe = function (t, wet) {
    var m = maskOf(t), open = [];
    for (var i = 0; i < 4; i++) if (m & DIRS[i].bit) open.push(DIRS[i].name);
    var kind = t.base === TYPES.straight ? 'Straight pipe' : t.base === TYPES.elbow ? 'Elbow' : 'Tee';
    return 'Row ' + (t.r + 1) + ', column ' + (t.c + 1) + ': ' + kind + ', open ' +
      open.join(', ').replace(/, ([^,]*)$/, ' and $1') + (wet ? ', water flowing' : '');
  };

  var render = function () {
    var dist = flow(), done = isSolved(dist);
    tiles.forEach(function (t, i) {
      var wet = dist[i] !== undefined;
      t.el.style.setProperty('--turn', (t.rot * 90) + 'deg');
      t.el.style.setProperty('--delay', wet ? (dist[i] * 45) + 'ms' : '0ms');
      t.el.classList.toggle('is-wet', wet);
      t.el.setAttribute('aria-label', describe(t, wet));
    });
    inlet.classList.add('is-wet');
    outlet.classList.toggle('is-wet', done);
    return done;
  };

  var fmtTime = function (s) { return s < 60 ? s + 's' : Math.floor(s / 60) + 'm ' + (s % 60) + 's'; };
  var showBest = function () {
    var best = null;
    try { best = parseInt(localStorage.getItem(BEST_KEY), 10); } catch (err) { /* storage blocked */ }
    bestEl.textContent = best >= 0 ? 'Best ' + fmtTime(best) : '';
  };

  var finish = function () {
    won = true;
    clearInterval(timer);
    board.classList.add('is-won');
    var best = null;
    try { best = parseInt(localStorage.getItem(BEST_KEY), 10); } catch (err) { /* ignore */ }
    var record = !(best >= 0) || seconds < best;
    if (record) { try { localStorage.setItem(BEST_KEY, String(seconds)); } catch (err) { /* ignore */ } }
    showBest();
    var line = 'Fixed in ' + moves + ' move' + (moves === 1 ? '' : 's') + ' and ' + fmtTime(seconds) + '.' + (record && best >= 0 ? ' New best!' : '');
    winText.textContent = line;
    winBox.hidden = false;
    status.textContent = 'Water reaches the house. ' + line;
  };

  var turn = function (t) {
    if (won) return;
    if (!timer) {
      timer = setInterval(function () { seconds++; timeEl.textContent = fmtTime(seconds); }, 1000);
    }
    t.rot++;
    moves++;
    movesEl.textContent = moves;
    if (render()) finish();
  };

  var focusTile = function (r, c) {
    var t = at(r, c);
    if (!t) return;
    tiles.forEach(function (x) { x.el.tabIndex = -1; });
    t.el.tabIndex = 0;
    t.el.focus();
  };

  var build = function () {
    clearInterval(timer);
    timer = null; moves = 0; seconds = 0; won = false;
    movesEl.textContent = '0';
    timeEl.textContent = '0s';
    winBox.hidden = true;
    status.textContent = '';
    board.classList.remove('is-won');
    tiles.forEach(function (t) { t.el.remove(); });
    tiles = [];

    inRow = rand(SIZE);
    outRow = rand(SIZE);
    var path = findPath();
    var need = {};
    path.forEach(function (p, i) {
      var into = i === 0 ? W : dirBetween(p, path[i - 1]).bit;
      var out = i === path.length - 1 ? E : dirBetween(p, path[i + 1]).bit;
      need[p[0] * SIZE + p[1]] = into | out;
    });

    var kinds = [TYPES.straight, TYPES.straight, TYPES.elbow, TYPES.elbow, TYPES.elbow, TYPES.tee];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var shape = need[r * SIZE + c] ? shapeFor(need[r * SIZE + c]) : { base: kinds[rand(kinds.length)], rot: 0 };
        var el = document.createElement('button');
        el.type = 'button';
        el.className = 'pipe-game__tile';
        el.tabIndex = (r === inRow && c === 0) ? 0 : -1;
        el.style.gridRow = String(r + 1);
        el.style.gridColumn = String(c + 2);
        el.innerHTML = svgFor(shape.base);
        board.appendChild(el);
        tiles.push({ r: r, c: c, base: shape.base, rot: shape.rot, el: el });
      }
    }
    // Scramble until the board starts out broken
    do { tiles.forEach(function (t) { t.rot += rand(4); }); } while (isSolved(flow()));

    inlet.style.gridRow = String(inRow + 1);
    outlet.style.gridRow = String(outRow + 1);
    board.classList.add('is-fresh');
    render();
    // Skip the spin-in on a new board, then turn transitions back on
    requestAnimationFrame(function () { requestAnimationFrame(function () { board.classList.remove('is-fresh'); }); });
  };

  board.addEventListener('click', function (e) {
    var el = e.target.closest('.pipe-game__tile');
    if (!el) return;
    for (var i = 0; i < tiles.length; i++) if (tiles[i].el === el) { turn(tiles[i]); break; }
  });

  board.addEventListener('keydown', function (e) {
    var el = e.target.closest('.pipe-game__tile');
    if (!el) return;
    var t = null;
    for (var i = 0; i < tiles.length; i++) if (tiles[i].el === el) { t = tiles[i]; break; }
    var move = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
    if (!t || !move) return;
    e.preventDefault();
    focusTile(Math.max(0, Math.min(SIZE - 1, t.r + move[0])), Math.max(0, Math.min(SIZE - 1, t.c + move[1])));
  });

  section.querySelectorAll('[data-new]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var fromWin = winBox.contains(btn);
      build();
      if (fromWin) focusTile(inRow, 0);
    });
  });

  board.setAttribute('role', 'group');
  board.setAttribute('aria-label', 'Pipe puzzle, ' + SIZE + ' by ' + SIZE + '. Arrow keys move between pipes, Enter turns one.');
  showBest();
  build();
  section.hidden = false;
})();
