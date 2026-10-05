/* A small pixel-art stellarator. A twisted torus (the cross-section is an ellipse that
   rotates five times around the ring), wrapped in non-planar modular coils and cut open
   at the front to show the plasma. Everything is drawn into a low-resolution depth
   buffer and shaded in a few flat steps; only the plasma has colour. */
(() => {
  "use strict";
  const canvas = document.querySelector("#fusion-reactor");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = 320, H = 220, TAU = Math.PI * 2;

  // Greys for the machine (light -> dark), magentas for the plasma (dim -> hot).
  const GREY = ["#ffffff", "#ececec", "#d4d4d4", "#b0b0b0", "#8a8a8a", "#646464", "#3e3e3e", "#1c1c1c"];
  const PLASMA = ["#4a1070", "#8e2a9e", "#d4459a", "#ff7ab8", "#ffd6ea"];
  const PALETTE = GREY.concat(PLASMA);
  const RGB = PALETTE.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
  const INK = 7, BG = 0;

  // Geometry (machine units) and a fixed three-quarter view from above.
  const R0 = 1.0, NP = 5;                      // major radius, field periods
  const VA = 0.38, VB = 0.28;                  // vessel cross-section semi-axes
  const PA = 0.22, PB = 0.13;                  // plasma cross-section semi-axes
  const EL = 38 * Math.PI / 180, AZ = -18 * Math.PI / 180;
  const SC = 70, CX = 160, CY = 100;
  const LIGHT = norm([-0.45, 0.35, 0.82]);
  const CUT = 44 * Math.PI / 180;              // half-width of the front cutaway (vessel)
  const COIL_CUT = 30 * Math.PI / 180;         // coils are removed over a narrower window

  const depth = new Float32Array(W * H), color = new Uint8Array(W * H), obj = new Uint8Array(W * H);
  const OBJ = { none: 0, base: 1, vessel: 2, coil: 3, plasma: 4, leg: 5 };

  function norm(v) { const n = Math.hypot(...v); return v.map(x => x / n); }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

  // world -> [screen x, screen y, depth]; larger depth is nearer the viewer.
  function project(x, y, z) {
    const x1 = x * Math.cos(AZ) - y * Math.sin(AZ);
    const y1 = x * Math.sin(AZ) + y * Math.cos(AZ);
    return [CX + x1 * SC, CY + (y1 * Math.sin(EL) - z * Math.cos(EL)) * SC, y1 * Math.cos(EL) + z * Math.sin(EL)];
  }
  // unit vector from the scene towards the camera, in world coordinates
  const VIEW = norm([Math.cos(EL) * Math.sin(AZ), Math.cos(EL) * Math.cos(AZ), Math.sin(EL)]);

  function plot(p, c, o) {
    const x = Math.round(p[0]), y = Math.round(p[1]);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = y * W + x;
    if (p[2] > depth[i]) { depth[i] = p[2]; color[i] = c; obj[i] = o; }
  }

  // Flat pixel-art shading: Lambert term quantised to a few grey steps.
  function shade(n, bright, dark) {
    const l = Math.max(0, dot(n, LIGHT));
    const k = l > .75 ? 0 : l > .5 ? 1 : l > .28 ? 2 : 3;
    return Math.min(dark, bright + k);
  }

  // Point on the twisted surface: ellipse (a, b) rotated by alpha = NP*phi/2 around the
  // magnetic axis, which itself bobs slightly up and down with the field period.
  function surface(phi, th, a, b) {
    const al = NP * phi / 2;
    const u = a * Math.cos(th) * Math.cos(al) - b * Math.sin(th) * Math.sin(al);
    const v = a * Math.cos(th) * Math.sin(al) + b * Math.sin(th) * Math.cos(al);
    const nu0 = Math.cos(th) / a, nv0 = Math.sin(th) / b;      // ellipse normal, local frame
    const nu = nu0 * Math.cos(al) - nv0 * Math.sin(al), nv = nu0 * Math.sin(al) + nv0 * Math.cos(al);
    const R = R0 + u, z = v + 0.035 * Math.sin(NP * phi);
    return { p: [R * Math.cos(phi), R * Math.sin(phi), z], n: norm([nu * Math.cos(phi), nu * Math.sin(phi), nv]) };
  }

  // Toroidal angle of a point measured from the direction facing the viewer.
  const FRONT = Math.atan2(Math.cos(AZ), Math.sin(AZ)); // world phi that faces the camera
  function fromFront(phi) { let d = (phi - FRONT) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return Math.abs(d); }

  function base() {
    // A low round plinth with a stepped rim, then six support legs up to the vessel.
    for (let r = 0; r <= 1.62; r += 0.006) for (let t = 0; t < TAU; t += 0.004 / Math.max(r, 0.05)) {
      const x = r * Math.cos(t), y = r * Math.sin(t);
      plot(project(x, y, -0.5), r > 1.56 ? 3 : r > 1.48 ? 2 : 1, OBJ.base);
    }
    for (let h = 0; h <= 0.07; h += 0.004) for (let t = 0; t < TAU; t += 0.002) {
      const p = project(1.62 * Math.cos(t), 1.62 * Math.sin(t), -0.5 - h);
      plot(p, Math.cos(t + AZ) > 0 ? 4 : 3, OBJ.base);
    }
    for (let k = 0; k < 6; k++) {
      const phi = k * TAU / 6 + 0.3;
      for (let h = -0.5; h <= -0.16; h += 0.004) for (let t = 0; t < TAU; t += 0.25) {
        const x = (R0 + 0.035 * Math.cos(t)) * Math.cos(phi) - 0.035 * Math.sin(t) * Math.sin(phi);
        const y = (R0 + 0.035 * Math.cos(t)) * Math.sin(phi) + 0.035 * Math.sin(t) * Math.cos(phi);
        plot(project(x, y, h), Math.cos(t) > 0 ? 4 : 5, OBJ.leg);
      }
    }
  }

  function vessel() {
    for (let phi = 0; phi < TAU; phi += 0.0045) {
      const cut = fromFront(phi) < CUT;
      for (let th = 0; th < TAU; th += 0.024) {
        const s = surface(phi, th, VA, VB);
        // In the cutaway the upper, viewer-facing shell is removed; the lower front wall
        // stays, so the plasma reads as sitting inside an open channel.
        if (cut && dot(s.n, VIEW) > -0.15 && s.n[2] > -0.45) continue;
        const inside = dot(s.n, VIEW) < 0;
        plot(project(...s.p), inside ? shade(s.n.map(x => -x), 4, 6) : shade(s.n, 1, 4), OBJ.vessel);
      }
    }
    // Cut edges: a thin dark rim where the shell was opened.
    for (const edge of [FRONT - CUT, FRONT + CUT]) for (let th = 0; th < TAU; th += 0.01) {
      const s = surface(edge, th, VA, VB);
      if (dot(s.n, VIEW) > -0.15 && s.n[2] > -0.45) plot(project(...s.p.map((v, i) => v + s.n[i] * 0.004)), 6, OBJ.vessel);
    }
  }

  function coils() {
    // Modular, non-planar coils: each loop wobbles in toroidal angle as it goes round.
    const N = 20;
    for (let k = 0; k < N; k++) {
      const phi0 = (k + 0.5) * TAU / N;
      if (fromFront(phi0) < COIL_CUT) continue;
      for (let th = 0; th < TAU; th += 0.006) {
        const phi = phi0 + 0.07 * Math.sin(2 * th + k * 1.3);
        for (let w = -0.022; w <= 0.022; w += 0.011) for (let g = 1.12; g <= 1.24; g += 0.04) {
          const s = surface(phi + w, th, VA * g, VB * g + 0.03);
          plot(project(...s.p), shade(s.n, 4, 7), OBJ.coil);
        }
      }
    }
  }

  function plasma(time) {
    // "Forming" plasma: the column breathes, and bright filaments stream along the
    // twisted field lines (helical phase 2*theta - NP*phi keeps the pattern periodic).
    const pulse = (Math.sin(time * TAU / 3.6) + 1) / 2;
    const g = 0.86 + 0.14 * pulse;
    for (let phi = 0; phi < TAU; phi += 0.004) for (let th = 0; th < TAU; th += 0.03) {
      const s = surface(phi, th, PA * g, PB * g);
      const facing = Math.max(0, dot(s.n, VIEW));
      const stripe = Math.sin(2 * th - NP * phi + 3 * phi - time * TAU / 3.6 * 2);
      let c = facing > .82 ? 3 : facing > .55 ? 2 : facing > .25 ? 1 : 0;
      if (stripe > 0.86) c = Math.min(4, c + 1 + (pulse > .5 ? 1 : 0));
      if (pulse > .8 && facing > .9) c = 4;
      plot(project(...s.p), GREY.length + c, OBJ.plasma);
    }
  }

  function outline() {
    // Pixel-art ink line on the far side of every silhouette and depth step.
    const out = color.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const j = Y * W + X;
        if (obj[j] === OBJ.none || obj[j] === obj[i] && Math.abs(depth[j] - depth[i]) < 0.06) continue;
        if (depth[j] > depth[i] + 0.02 || obj[i] === OBJ.none) {
          out[i] = obj[j] === OBJ.plasma ? GREY.length : INK;
          break;
        }
      }
    }
    color.set(out);
  }

  function draw(time) {
    depth.fill(-1e9); color.fill(BG); obj.fill(OBJ.none);
    base(); vessel(); coils(); plasma(time); outline();
    const img = ctx.createImageData(W, H);
    for (let i = 0; i < W * H; i++) {
      const c = RGB[color[i]];
      img.data[4 * i] = c[0]; img.data[4 * i + 1] = c[1]; img.data[4 * i + 2] = c[2]; img.data[4 * i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    // Quiet registration marks make the drawing feel like a printed plate.
    ctx.fillStyle = GREY[3];
    for (const [x, sign] of [[30, 1], [288, -1]]) {
      ctx.fillRect(Math.min(x, x + sign * 8), 29, 9, 1);
      ctx.fillRect(x, 29, 1, 9);
    }
  }

  window.REACTOR_PALETTE = PALETTE;
  window.drawFusionReactor = draw;
  draw(0);
})();
