/**
 * States: one component drawn five times, the way a system file lays it out — default, hover,
 * loading, error, empty — as a row of tiles standing on the floor. Each tile carries the same
 * card: a title bar and a button, with the state's own change (the button raised on hover,
 * three dots for loading, a mark for error, a dashed hole for empty).
 * Where the pointer is across the row picks the tile; the picked tile lifts on a spring and
 * takes the bright edge. At rest "default" is lifted. The slider is how high a tile lifts.
 *
 * The pattern: scrub and pick. One spring per tile, the choice read from the tiles' rest pose
 * so a tile rising under the pointer cannot flip it.
 */
const {
  Cam, clamp, facing, fit, poly, prism, proj, rings, ringAt, rrect, spring, stepS,
  flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const N = 5, CW = 44, CD = 60, GAP = 10, T = 3, R = 6, B = 1.4;
const NAMES = ["default", "hover", "loading", "error", "empty"];
const u0 = (k) => k * (CW + GAP);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let lift = value;

  // Fitted to every tile lifted at the slider's far end, so nothing leaves the frame.
  const C = Cam(45, 0.5, 1.45);
  const W = u0(N - 1) + CW, zTop = 24 + T + 6;
  fit(C, [[0, 0, 0], [W, CD, 0], [W, 0, 0], [0, CD, 0], [0, 0, zTop], [W, CD, zTop], [W, 0, zTop], [0, CD, zTop]], 200, 150);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const tiles = Array.from({ length: N }, (_, k) => {
    const x = u0(k);
    const grp = mk("g", {}, g);
    const [ring, inner] = rings(x, 0, x + CW, CD, R, B);
    const body = solid(grp);
    const top = mk("g", {}, grp);
    const flat = (a, b, c, d, r, cls) => ({ ring: rrect(x + a, b, x + c, d, r, 6), el: mk("path", { class: cls }, top) });
    const parts = {
      bar: flat(6, 6, CW - 6, 14, 2, "nf"),
      line: flat(6, 20, CW - 14, 24, 1.5, "nf lo"),
      btn: { ring: rings(x + 8, CD - 20, x + CW - 8, CD - 9, 5, 1), el: solid(top) },
      dots: [],
      mark: null,
      hole: null,
    };
    if (k === 2) for (let i = 0; i < 3; i++) parts.dots.push({ u: x + CW / 2 - 8 + i * 8, v: 36, el: flatDot(top, C, 1.6, "dot m") });
    if (k === 3) parts.mark = flat(CW / 2 - 4, 30, CW / 2 + 4, 42, 4, "nf");
    if (k === 4) parts.hole = flat(6, 28, CW - 6, CD - 26, 3, "nf dash lo");
    return { k, ring, inner, body, parts, z: spring(0, { eps: 0.02 }) };
  });

  let pick = -1;

  function draw() {
    for (const t of tiles) {
      const z0 = t.z.x, z1 = z0 + T;
      put(t.body, prism(P, front, t.ring, t.inner, z0, z1));
      const { bar, line, btn, dots, mark, hole } = t.parts;
      for (const f of [bar, line, mark, hole]) if (f) f.el.setAttribute("d", poly(ringAt(P, f.ring, z1)));
      // the button stands taller on the hover tile, flat and empty-looking on the empty one
      const h = t.k === 1 ? 4.5 : t.k === 4 ? 0.6 : 2;
      put(btn.el, prism(P, front, btn.ring[0], btn.ring[1], z1, z1 + h));
      for (const d of dots) place(d.el, P(d.u, d.v, z1));
    }
  }

  function light() {
    const on = pick < 0 ? 0 : pick;
    tiles.forEach((t) => {
      t.body.sil.classList.toggle("hi", t.k === on);
      t.z.t = t.k === on ? lift : 0;
    });
    read.textContent = pick < 0 ? "rest" : NAMES[pick];
  }

  const Bk = register(stage, (dt) => {
    let m = false;
    for (const t of tiles) m = stepS(t.z, dt) || m;
    draw();
    return m;
  });
  bag.add(Bk.unregister);

  /** x picks the tile whose centre, at rest, is nearest across the screen */
  function move([x]) {
    let best = 0, bd = Infinity;
    for (let k = 0; k < N; k++) {
      const c = P(u0(k) + CW / 2, CD / 2, T);
      const d = Math.abs(c[0] - x);
      if (d < bd) { bd = d; best = k; }
    }
    pick = clamp(best, 0, N - 1);
    light();
    Bk.wake();
  }
  function leave() {
    pick = -1;
    light();
    Bk.wake();
  }

  light();
  for (const t of tiles) t.z.x = t.z.t;
  draw();
  bag.add(pointer(stage, { move, leave }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { lift = v; light(); Bk.wake(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "states",
  means: "One component in five states — default, hover, loading, error, empty: move across to lift each one.",
  rules: [1, 4, 5, 6, 9],
  range: [10, 16, 24],
  tour: [[90, 170], [160, 170], [230, 170], [300, 170], null],
  mount,
});
