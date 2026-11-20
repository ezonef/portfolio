/**
 * Layers: an interface taken apart into the three plates it is built from.
 * At the bottom a token plate, a grid of dots; in the middle a parts plate,
 * a pill button, a switch and a card standing on it; on top the screen, a
 * framed plate with a bar and two panels set into it. Where the pointer is
 * across the figure sets how far the plates come apart, on one spring; how
 * high it is picks the plate, which takes the bright edge. At rest the stack
 * is slightly apart and the screen is bright. The slider is the widest gap.
 *
 * The pattern: scrub and pick. A spring for the gap, the choice read from the
 * plates' target pose so a plate moving under the pointer cannot flip it.
 */
const {
  Cam, clamp, facing, fit, lerp, poly, prism, proj, rings, ringAt, rrect, spring, stepS,
  extremes, flatDot, mk, place, pointer, put, register, disposer, solid, seg,
} = HL;

const W = 120, D = 84, T = 3, R = 7, B = 1.6;
/** Rest gap, and how much higher each plate sits than the one under it: the top gap is the widest. */
const REST = 19, STEP = [0, 1, 2.15];
const NAMES = ["tokens", "parts", "screen"];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let gmax = value;

  // Fitted to the widest pose, so nothing leaves the frame at the slider's far end.
  const C = Cam(45, 0.5, 1.9);
  const zTop = 36 * STEP[2] + T;
  fit(C, [[0, 0, 0], [W, D, 0], [W, 0, 0], [0, D, 0], [0, 0, zTop], [W, D, zTop], [W, 0, zTop], [0, D, zTop]], 200, 166);
  const P = proj(C), front = facing(C);
  const [ring, inner] = rings(0, 0, W, D, R, B);

  const g = mk("g", {}, svg);
  // Dashed guides down the plates' outer corners, painted first so every plate covers its stretch.
  const guides = mk("path", { class: "nf dash lo" }, g);
  const [eL, eR, eN] = extremes(P, ring);

  const plates = [0, 1, 2].map((k) => {
    const grp = mk("g", {}, g);
    const body = solid(grp);
    const top = mk("g", {}, grp);
    return { k, grp, body, top, parts: [] };
  });

  // Tokens: a 7 × 4 grid of dots, a few medium ones where a palette would start.
  for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) {
    const cls = (i + j) % 3 === 0 ? "dot off" : "dot m";
    plates[0].parts.push({ kind: "dot", u: 18 + i * 14, v: 15 + j * 18, el: flatDot(plates[0].top, C, 1.4, cls) });
  }
  // Parts: a pill button, a switch (track and knob) and a card, as low solids, back to front.
  const block = (x0, y0, x1, y1, r, b, h) => ({ kind: "block", ring: rings(x0, y0, x1, y1, r, b), h, el: solid(plates[1].top) });
  plates[1].parts.push(block(14, 12, 64, 28, 8, 1, 3.4));      // button
  plates[1].parts.push(block(76, 14, 104, 28, 7, 1, 2.4));     // switch track
  plates[1].parts.push(block(91, 15.5, 102, 26.5, 5.5, 1, 4.6)); // switch knob
  plates[1].parts.push(block(14, 40, 104, 72, 5, 1.4, 2.6));   // card
  // Screen: a frame line set in from the edge, a bar along the far side, two panels.
  const flat = (x0, y0, x1, y1, r, cls) => ({ kind: "flat", ring: rrect(x0, y0, x1, y1, r, 6), el: mk("path", { class: cls }, plates[2].top) });
  plates[2].parts.push(flat(6, 6, W - 6, D - 6, 4, "nf lo"));
  plates[2].parts.push(flat(12, 12, W - 12, 22, 3, "nf"));
  plates[2].parts.push(flat(12, 30, 58, 72, 3, "nf"));
  plates[2].parts.push(flat(64, 30, W - 12, 72, 3, "nf"));

  const gap = spring(REST, { eps: 0.02 });
  let pick = -1, drawn = NaN;
  const zOf = (k, gp) => gp * STEP[k];

  function draw() {
    const gp = gap.x;
    if (gp === drawn) return;
    drawn = gp;
    for (const pl of plates) {
      const z0 = zOf(pl.k, gp), z1 = z0 + T;
      put(pl.body, prism(P, front, ring, inner, z0, z1));
      for (const pt of pl.parts) {
        if (pt.kind === "dot") place(pt.el, P(pt.u, pt.v, z1));
        else if (pt.kind === "block") put(pt.el, prism(P, front, pt.ring[0], pt.ring[1], z1, z1 + pt.h));
        else pt.el.setAttribute("d", poly(ringAt(P, pt.ring, z1)));
      }
    }
    // three drops, from the bottom plate's corners up to the top plate's
    const zt = zOf(2, gp);
    guides.setAttribute("d", [eL, eR, eN].map((q) => seg(P(q.u, q.v, 0), P(q.u, q.v, zt))).join(""));
  }

  function light() {
    const on = pick < 0 ? 2 : pick; // at rest the screen is the bright mark
    plates.forEach((pl) => pl.body.sil.classList.toggle("hi", pl.k === on));
    read.textContent = pick < 0 ? "rest" : NAMES[pick];
  }

  const Bk = register(stage, (dt) => {
    const m = stepS(gap, dt);
    draw();
    return m;
  });
  bag.add(Bk.unregister);

  /** x sets the gap; y picks the plate whose centre, in its TARGET pose, is nearest. */
  function move([x, y]) {
    const target = lerp(8, gmax, clamp((x - 70) / 260, 0, 1));
    gap.t = target;
    let best = 0, bd = Infinity;
    for (let k = 0; k < 3; k++) {
      const c = P(W / 2, D / 2, zOf(k, target) + T);
      const d = Math.abs(c[1] - y);
      if (d < bd) { bd = d; best = k; }
    }
    pick = best;
    light();
    Bk.wake();
  }
  function leave() {
    gap.t = REST;
    pick = -1;
    light();
    Bk.wake();
  }

  draw();
  light();
  bag.add(pointer(stage, { move, leave }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { gmax = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "layers",
  means: "An interface taken apart into tokens, parts and the screen: move across to open the stack, up and down to pick a plate.",
  rules: [1, 4, 5, 6, 9],
  range: [18, 27, 36],
  tour: [[110, 250], [200, 170], [300, 90], null],
  mount,
});
