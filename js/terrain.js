// ===================================================================
//  TERRAIN — height function, biome classification, terrain mesh
// ===================================================================

function heightAt(x, z) {
    // River corridor mask: 0 right at the river, 1 far from it.
    // Used to suppress hills/mountains so the river always lies in a
    // naturally low corridor instead of being carved through a cliff.
    const dRiver = distToRiver(x, z);
    const corridor = smoothstep(BANK_HALF, 160, dRiver);

    // Large rolling hills (suppressed near the river)
    const hills    = (fbm(x * 0.0035, z * 0.0035, 5) - 0.5) * 80 * corridor;
    // Mountain ridges, far from origin AND far from river
    const ridgeAmt = ridged(x * 0.0022, z * 0.0022, 4);
    const distFromCenter = Math.sqrt(x * x + z * z);
    const ridgeMask = smoothstep(180, 380, distFromCenter);
    const mountains = ridgeAmt * 70 * ridgeMask * corridor;
    // Small surface detail (kept everywhere)
    const detail = (fbm(x * 0.05, z * 0.05, 3) - 0.5) * 2.5;

    // Baseline lift so the average terrain sits well above water level
    let h = hills + mountains + detail + 18;

    // Carve river valley.
    // Inside RIVER_HALF: ground is forced BELOW the water surface (riverbed).
    // Between RIVER_HALF and BANK_HALF: smoothly rise from the bank up to
    // whichever is lower — the surrounding terrain or the bank ceiling —
    // so the river always sits in a real depression, never on a hillside.
    const d = distToRiver(x, z);
    if (d < RIVER_HALF) {
        // U-shaped riverbed
        const u = d / RIVER_HALF;
        h = RIVERBED_Y + (RIVERBANK_Y - RIVERBED_Y) * (u * u);
    } else if (d < BANK_HALF) {
        const t = smoothstep(RIVER_HALF, BANK_HALF, d);   // 0 at bank -> 1 at edge
        const bankCeiling = RIVERBANK_Y + (1 - Math.cos(t * Math.PI)) * 6; // gentle rise ~12m
        // Take the LOWER of the natural terrain and the bank ceiling, so
        // we always carve a depression even where the hill is high.
        h = Math.min(h, bankCeiling);
    }
    return h;
}

// ---------- biome classification (moisture + elevation patches) ----------
// 0 riverbank, 1 dry plains, 2 meadow plains, 3 light woodland,
// 4 dense forest, 5 highlands, 6 mountains
function moistureAt(x, z) { return fbm(x * 0.0014 + 91.3, z * 0.0014 - 52.7, 4); }
function tempAt(x, z)     { return fbm(x * 0.0009 - 17.1, z * 0.0009 + 33.5, 4); }
function biomeAt(x, z, h) {
    const d = distToRiver(x, z);
    if (d < BANK_HALF + 4 && h < 4) return 0;
    if (h > 48) return 6;     // mountains
    if (h > 34) return 5;     // highlands
    const m = moistureAt(x, z);
    if (m < 0.38) return 1;   // dry plains
    if (m < 0.55) return 2;   // meadow plains
    if (m < 0.72) return 3;   // light woodland
    return 4;                  // dense forest
}
const BIOME_NAMES = ['Riverbank','Dry Plains','Meadow','Woodland','Dense Forest','Highlands','Mountains'];
const BIOME_COLORS = [
    new THREE.Color(0x6b5a3a), // 0 riverbank
    new THREE.Color(0x8a8b48), // 1 dry plains: pale yellow-green
    new THREE.Color(0x5e7a30), // 2 meadow: bright meadow green
    new THREE.Color(0x4a6a2a), // 3 woodland: medium green
    new THREE.Color(0x2c4520), // 4 dense forest: deep green
    new THREE.Color(0x6e7a48), // 5 highlands: olive/heath
    new THREE.Color(0x6a6660), // 6 mountains: cool grey
];

// ===================================================================
//  TERRAIN MESH (vertex-colored by biome)
// ===================================================================
const groundGeo = new THREE.PlaneGeometry(WORLD, WORLD, SEG, SEG);
groundGeo.rotateX(-Math.PI / 2);
const pos = groundGeo.attributes.position;
const colors = new Float32Array(pos.count * 3);
for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    const b = biomeAt(x, z, h);
    const c = BIOME_COLORS[b].clone();
    // small per-vertex variation
    const j = (hash2(x, z) - 0.5) * 0.12;
    c.offsetHSL(0, 0, j);
    colors[i * 3]     = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
}
groundGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
groundGeo.computeVertexNormals();
const ground = new THREE.Mesh(
    groundGeo,
    new THREE.MeshLambertMaterial({ vertexColors: true })
);
ground.receiveShadow = true;
scene.add(ground);

// Bilinear ground lookup against the terrain mesh's vertex buffer.
// Defined here (right after the mesh) so any code below — including
// animal spawning — can call it.
const CELL = WORLD / SEG;
function sampleGroundY(x, z) {
    const pos = groundGeo.attributes.position;
    const fi = (x + WORLD / 2) / CELL;
    const fj = (z + WORLD / 2) / CELL;
    let i = Math.floor(fi), j = Math.floor(fj);
    if (i < 0) i = 0; else if (i > SEG - 1) i = SEG - 1;
    if (j < 0) j = 0; else if (j > SEG - 1) j = SEG - 1;
    const ti = fi - i, tj = fj - j;
    const stride = SEG + 1;
    const h00 = pos.getY(j       * stride + i);
    const h10 = pos.getY(j       * stride + i + 1);
    const h01 = pos.getY((j + 1) * stride + i);
    const h11 = pos.getY((j + 1) * stride + i + 1);
    return (h00 * (1 - ti) + h10 * ti) * (1 - tj)
         + (h01 * (1 - ti) + h11 * ti) * tj;
}

// ===================================================================
//  RIVER WATER BODY — wide ribbon at the water surface, riding atop
//  the carved valley terrain. The terrain itself forms the riverbed,
//  so the water has real depth and a visible body.
// ===================================================================
const riverMaterial = new THREE.MeshPhongMaterial({
    color: 0x2c4a66, shininess: 140, specular: 0x99bbdd,
    transparent: true, opacity: 0.78, depthWrite: false
});
{
    const segs = 320;
    const half = WORLD / 2;
    const verts = [];
    const uvs   = [];
    const idx = [];
    for (let i = 0; i <= segs; i++) {
        const z = -half + (i / segs) * WORLD;
        const cx = riverX(z);
        const dz = 0.5;
        const slope = (riverX(z + dz) - riverX(z - dz)) / (2 * dz);
        const len = Math.sqrt(1 + slope * slope);
        const nx = 1 / len;
        const nz = -slope / len;
        verts.push(cx + nx * RIVER_HALF, WATER_Y + 0.02, z + nz * RIVER_HALF);
        verts.push(cx - nx * RIVER_HALF, WATER_Y + 0.02, z - nz * RIVER_HALF);
        uvs.push(0, i / segs * 8);
        uvs.push(1, i / segs * 8);
    }
    for (let i = 0; i < segs; i++) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        idx.push(a, b, c, b, d, c);
    }
    const rgeo = new THREE.BufferGeometry();
    rgeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    rgeo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
    rgeo.setIndex(idx);
    rgeo.computeVertexNormals();
    const river = new THREE.Mesh(rgeo, riverMaterial);
    river.renderOrder = 2;
    scene.add(river);
}

// ----- Flatten terrain under a circular footprint to a fixed Y -----
// After placing a house at (cx,cz), call flattenAt(cx, cz, radius, anchorY)
// to force every terrain vertex within `radius` to sit at anchorY. This
// guarantees the house actually rests on flat ground regardless of slope.
function flattenAt(cx, cz, radius, anchorY) {
    const pos = groundGeo.attributes.position;
    const stride = SEG + 1;
    const r2 = radius * radius;
    const i0 = Math.max(0,   Math.floor((cx - radius + WORLD / 2) / CELL));
    const i1 = Math.min(SEG, Math.ceil( (cx + radius + WORLD / 2) / CELL));
    const j0 = Math.max(0,   Math.floor((cz - radius + WORLD / 2) / CELL));
    const j1 = Math.min(SEG, Math.ceil( (cz + radius + WORLD / 2) / CELL));
    for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
            const vx = -WORLD / 2 + i * CELL;
            const vz = -WORLD / 2 + j * CELL;
            const dx = vx - cx, dz = vz - cz;
            const dd = dx * dx + dz * dz;
            if (dd > r2) continue;
            const idx = j * stride + i;
            // Inside core: hard flatten. Edge: blend so it eases out.
            const u = Math.sqrt(dd) / radius;     // 0..1
            if (u < 0.85) {
                pos.setY(idx, anchorY);            // hard flat core
            } else {
                const k = (u - 0.85) / 0.15;       // 0..1 ease-out at edge
                pos.setY(idx, pos.getY(idx) * k + anchorY * (1 - k));
            }
        }
    }
}
