// ===================================================================
//  KNIGHTFALL — open-world medieval sandbox
//  Heightmap world with biomes, carved river valley, biome-aware flora
// ===================================================================

const WORLD = 1600;         // world size (m)
const SEG   = 320;          // terrain segments
const WATER_Y = 0.0;        // water level

// ---------- value-noise + fBm (deterministic) ----------
function hash2(x, z) {
    const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
    return s - Math.floor(s);
}
function vnoise(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z);
    const xf = x - xi,        zf = z - zi;
    const u = xf * xf * (3 - 2 * xf);
    const v = zf * zf * (3 - 2 * zf);
    const a = hash2(xi,     zi);
    const b = hash2(xi + 1, zi);
    const c = hash2(xi,     zi + 1);
    const d = hash2(xi + 1, zi + 1);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
function fbm(x, z, oct = 5) {
    let sum = 0, amp = 1, freq = 1, norm = 0;
    for (let i = 0; i < oct; i++) {
        sum  += vnoise(x * freq, z * freq) * amp;
        norm += amp;
        amp  *= 0.5;
        freq *= 2.0;
    }
    return sum / norm;
}
function ridged(x, z, oct = 4) {
    let sum = 0, amp = 1, freq = 1, norm = 0;
    for (let i = 0; i < oct; i++) {
        const n = 1 - Math.abs(vnoise(x * freq, z * freq) * 2 - 1);
        sum  += n * n * amp;
        norm += amp;
        amp  *= 0.5;
        freq *= 2.0;
    }
    return sum / norm;
}

// ---------- river path (sinuous curve in world XZ) ----------
// River centerline: x = riverX(z). Flows along the +Z axis.
function riverX(z) {
    return Math.sin(z * 0.011) * 90 + Math.sin(z * 0.034) * 22 + Math.cos(z * 0.006) * 35;
}
// Approx perpendicular distance from (x,z) to centerline.
// Includes dx/dz slope correction so width stays ~constant on bends.
function distToRiver(x, z) {
    const cx = riverX(z);
    const dz = 0.5;
    const slope = (riverX(z + dz) - riverX(z - dz)) / (2 * dz);
    return Math.abs(x - cx) / Math.sqrt(1 + slope * slope);
}
const RIVER_HALF   = 22;   // water surface half-width (wide river)
const BANK_HALF    = 70;   // valley half-width (smooth rise to hills)
const RIVERBED_Y   = -6.5; // ground depth at river center (deep channel)
const RIVERBANK_Y  = 0.2;  // ground at the water edge (just above water)

// ---------- terrain height function ----------
function smoothstep(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
}

function rand(a, b) { return a + Math.random() * (b - a); }
