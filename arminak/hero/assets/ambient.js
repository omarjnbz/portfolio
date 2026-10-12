/* ============================================================================
   The ambient hero engine — options one and two.

   Two jobs, and they are separate on purpose:

     1. The entrance. A fixed timeline that runs once on load: the plate settles,
        then the eyebrow, the two title lines and the paragraph rise out of
        their masks in sequence.
     2. The contraction. Driven entirely by scroll position — the circular mask
        closes around the caravan and the wordmark arrives underneath, so the
        film becomes the logo.

   Everything animated here is transform, opacity or clip-path. Nothing reads
   layout inside the scroll handler, so there is no forced reflow, and the whole
   frame is a handful of custom-property writes.
   ========================================================================= */
(function () {
  'use strict';

  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stage   = document.querySelector('.stage');
  var hero    = document.querySelector('.hero');
  var film    = document.querySelector('.film');
  var plate   = document.getElementById('plate');
  var cue     = document.querySelector('.cue');
  if (!stage) return;

  /* ---------------------------------------------------------------- PLATE -- */

  var MQ = matchMedia('(max-width: 768px), (orientation: portrait)');

  function pickPlate() {
    var tall = MQ.matches;
    plate.poster = plate.getAttribute(tall ? 'data-poster-tall' : 'data-poster-wide');
    if (REDUCED) return;                     // poster only; never fetch the film

    var want = plate.getAttribute(tall ? 'data-tall' : 'data-wide');
    if (plate.getAttribute('src') === want) return;
    plate.src = want;
    plate.load();
    var p = plate.play();
    if (p && p.catch) p.catch(function () { /* autoplay refused — the poster stands */ });
  }

  pickPlate();
  if (MQ.addEventListener) MQ.addEventListener('change', pickPlate);

  // A tab that was backgrounded during load comes back with a paused film and
  // no event to say so. Nudge it once on return.
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && plate.paused && !REDUCED) {
      var p = plate.play(); if (p && p.catch) p.catch(function () {});
    }
  });

  /* ------------------------------------------------------------- ENTRANCE -- */

  function enter() {
    if (REDUCED) { document.body.classList.add('is-in'); return; }

    var lines = Array.prototype.slice.call(document.querySelectorAll('.mask > *'));
    var rule  = document.querySelector('.eyebrow i');

    // The hairline draws first and the type follows it. 90ms between lines is
    // the gap at which they read as one movement rather than as four.
    if (rule) {
      rule.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
                   { duration: 900, delay: 180, easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'both' });
    }
    lines.forEach(function (el, i) {
      el.animate([{ transform: 'translateY(112%)' }, { transform: 'translateY(0)' }],
                 { duration: 1150, delay: 300 + i * 90, easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'both' });
    });
    if (cue) {
      cue.animate([{ opacity: 0 }, { opacity: 1 }],
                  { duration: 800, delay: 1400, easing: 'ease', fill: 'both' });
    }

    // The plate eases back from a slightly wider crop, which reads as the
    // camera settling rather than as a video starting.
    stage.animate([{ '--plate-scale': 1.14 }, { '--plate-scale': 1.06 }],
                  { duration: 2600, easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'both' });
  }

  // Wait for the poster, not for the film: the entrance should start against a
  // picture, and the film is several megabytes behind it.
  var poster = new Image();
  poster.onload = poster.onerror = enter;
  poster.src = plate.poster || '';
  if (poster.complete) enter();

  /* ---------------------------------------------------- THE CONTRACTION --- */

  if (!REDUCED) {
    var MARK_START = 0.30;        // the mask starts closing only after a real scroll
    var raf = 0, lastP = -1;

    function draw() {
      raf = 0;
      var runway = hero.offsetHeight - window.innerHeight;
      var p = runway > 0 ? Math.min(1, Math.max(0, window.scrollY / runway)) : 0;
      if (Math.abs(p - lastP) < 0.0005) return;
      lastP = p;

      // Radius goes from "well past the corners" to the logo's own size. The
      // curve is eased so most of the travel happens early and the last third
      // is a slow settle onto the mark.
      var t = p < MARK_START ? 0 : (p - MARK_START) / (1 - MARK_START);
      var e = 1 - Math.pow(1 - t, 2.4);

      var minR = window.innerWidth < 720 ? 92 : 128;          // px — the mark
      var maxR = Math.hypot(window.innerWidth, window.innerHeight) * 0.62;
      var r    = maxR + (minR - maxR) * e;

      stage.style.setProperty('--r', r + 'px');
      stage.style.setProperty('--cy', (50 - e * 6) + '%');
      stage.style.setProperty('--ring-a', (e > 0.55 ? (e - 0.55) / 0.45 : 0).toFixed(3));
      stage.style.setProperty('--mark-a', (e > 0.62 ? (e - 0.62) / 0.38 : 0).toFixed(3));
      stage.style.setProperty('--mark-drop', (minR + 46) + 'px');

      // The copy leaves before the mask reaches it, so the words are never
      // clipped in half by the closing circle.
      var copy = document.querySelector('.copy');
      if (copy) {
        var out = Math.min(1, t / 0.34);
        copy.style.opacity   = (1 - out).toFixed(3);
        copy.style.transform = 'translateY(' + (out * -26).toFixed(1) + 'px)';
      }
      if (cue) cue.style.opacity = (1 - Math.min(1, p / 0.10)).toFixed(3);
    }

    function onScroll() { if (!raf) raf = requestAnimationFrame(draw); }
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', function () { lastP = -1; onScroll(); });
    draw();
  }
})();
