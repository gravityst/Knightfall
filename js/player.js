// ===================================================================
//  PLAYER
// ===================================================================
// Pick a spawn on the plains, away from the river
// Pick a low, flat spawn in the woodland/plains, away from the river
let spawn = new THREE.Vector3(0, 0, 0);
let bestScore = Infinity;
for (let i = 0; i < 1500; i++) {
    const x = rand(-200, 200), z = rand(-200, 200);
    if (distToRiver(x, z) < 50) continue;
    const h0 = heightAt(x, z);
    if (h0 < 14 || h0 > 26) continue;         // gentle ground only
    const sb = biomeAt(x, z, h0);
    if (sb !== 1 && sb !== 2 && sb !== 3) continue;   // plains/meadow/woodland
    // Flatness: variance over a few neighbours
    const h1 = heightAt(x + 4, z);
    const h2 = heightAt(x - 4, z);
    const h3 = heightAt(x, z + 4);
    const h4 = heightAt(x, z - 4);
    const flat = Math.abs(h1 - h0) + Math.abs(h2 - h0) + Math.abs(h3 - h0) + Math.abs(h4 - h0);
    const score = flat + h0 * 0.1;
    if (score < bestScore) { bestScore = score; spawn.set(x, 0, z); }
}
const EYE = 1.75;     // realistic human eye height
{
    const sy = sampleGroundY(spawn.x, spawn.z);
    camera.position.set(spawn.x, sy + EYE, spawn.z);
}

// Guaranteed cluster of animals very near the player so they're easy to find.
spawnAnimal(SPEC_RABBIT, 10, spawn.x, spawn.z, 70);
spawnAnimal(SPEC_DEER,    6, spawn.x, spawn.z, 110);
spawnAnimal(SPEC_BEAR,    2, spawn.x, spawn.z, 160);

// Sword in hand
const sword = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.1, 0.08),
    new THREE.MeshLambertMaterial({ color: 0xcccccc })
);
const SWORD_REST = { x: 0.32, y: -0.28, z: -0.55, rx: 0.6, ry: 0.3, rz: 0.25 };
sword.position.set(SWORD_REST.x, SWORD_REST.y, SWORD_REST.z);
sword.rotation.set(SWORD_REST.rx, SWORD_REST.ry, SWORD_REST.rz);
camera.add(sword);
scene.add(camera);

// Sword swing animation state
let swingT = 0;          // 0 = idle, otherwise seconds remaining
const SWING_DUR = 0.45;
function startSwing() {
    if (swingT > 0) return;
    swingT = SWING_DUR;
    // Hit-test the nearest live tree in front of the camera within 6 m.
    const fwd = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
    let bestTree = null, bestDot = -1, bestDist = 9999;
    for (const t of trees) {
        if (!t.alive) continue;
        const dx = t.x - camera.position.x;
        const dz = t.z - camera.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 7) continue;
        const dot = (dx * fwd.x + dz * fwd.z) / dist;
        if (dot < 0.35) continue;     // not in front
        if (dist < bestDist) { bestDist = dist; bestTree = t; bestDot = dot; }
    }
    if (bestTree) {
        bestTree.alive = false;
        bestTree.fallStart = performance.now();
        bestTree.fallAxisX = -(bestTree.z - camera.position.z);
        bestTree.fallAxisZ =  (bestTree.x - camera.position.x);
        const len = Math.hypot(bestTree.fallAxisX, bestTree.fallAxisZ) || 1;
        bestTree.fallAxisX /= len;
        bestTree.fallAxisZ /= len;
    }
}

// Vertical physics
const GRAVITY = 28;      // m/s^2
const JUMP_V  = 8.5;     // m/s
let vy = 0;
let grounded = true;
let bobPhase = 0;
// Stamina
let stamina = 1.0;
const STAM_DRAIN = 0.32, STAM_REGEN = 0.22;
const staminaEl = document.getElementById('stamina').firstElementChild;
// Collision: trees + per-wall house slabs (in the house's local frame).
const PLAYER_R = 0.30;
function collide(x, z) {
    // Trees: circular trunk
    for (const t of trees) {
        if (!t.alive) continue;
        const dx = x - t.x, dz = z - t.z;
        const dd = dx * dx + dz * dz;
        const r = t.radius + PLAYER_R;
        if (dd < r * r) {
            const dist = Math.sqrt(dd) || 0.001;
            return { x: t.x + dx / dist * r, z: t.z + dz / dist * r };
        }
    }
    // Houses: rotate the player into local space, test each wall slab
    for (const h of houseColliders) {
        if (!h.w) continue;     // (the well uses the legacy circle below)
        const dx = x - h.x, dz = z - h.z;
        const cosR = Math.cos(-h.rot), sinR = Math.sin(-h.rot);
        const lx = dx * cosR - dz * sinR;
        const lz = dx * sinR + dz * cosR;
        const halfW = h.w / 2, halfD = h.d / 2;
        // Quick reject: outside the bounding rect (expanded)
        if (lx < -halfW - PLAYER_R || lx > halfW + PLAYER_R) continue;
        if (lz < -halfD - PLAYER_R || lz > halfD + PLAYER_R) continue;

        const slabs = [
            // back wall: full width
            { x1: -halfW, x2:  halfW, z1: -halfD,             z2: -halfD + h.wallT },
            // left wall
            { x1: -halfW, x2: -halfW + h.wallT, z1: -halfD,   z2:  halfD },
            // right wall
            { x1:  halfW - h.wallT, x2: halfW, z1: -halfD,    z2:  halfD },
            // front wall: left of door
            { x1: -halfW, x2: -h.doorW / 2, z1: halfD - h.wallT, z2: halfD },
            // front wall: right of door
            { x1:  h.doorW / 2, x2: halfW,  z1: halfD - h.wallT, z2: halfD },
        ];
        // If the door is closed, the door itself is a solid slab
        if (!h.doorOpen) {
            slabs.push({ x1: -h.doorW / 2, x2: h.doorW / 2,
                         z1: halfD - h.wallT, z2: halfD });
        }

        for (const s of slabs) {
            if (lx > s.x1 - PLAYER_R && lx < s.x2 + PLAYER_R &&
                lz > s.z1 - PLAYER_R && lz < s.z2 + PLAYER_R) {
                // Push out along the smallest penetration
                const dxL = lx - (s.x1 - PLAYER_R);
                const dxR = (s.x2 + PLAYER_R) - lx;
                const dzD = lz - (s.z1 - PLAYER_R);
                const dzU = (s.z2 + PLAYER_R) - lz;
                const minD = Math.min(dxL, dxR, dzD, dzU);
                let nLx = lx, nLz = lz;
                if      (minD === dxL) nLx = s.x1 - PLAYER_R;
                else if (minD === dxR) nLx = s.x2 + PLAYER_R;
                else if (minD === dzD) nLz = s.z1 - PLAYER_R;
                else                   nLz = s.z2 + PLAYER_R;
                const cosF = Math.cos(h.rot), sinF = Math.sin(h.rot);
                return {
                    x: h.x + nLx * cosF - nLz * sinF,
                    z: h.z + nLx * sinF + nLz * cosF,
                };
            }
        }
    }
    // Wells (legacy circular collider)
    for (const h of houseColliders) {
        if (h.w) continue;
        const dx = x - h.x, dz = z - h.z;
        if (Math.abs(dx) < h.hw && Math.abs(dz) < h.hd) {
            const px = h.hw - Math.abs(dx);
            const pz = h.hd - Math.abs(dz);
            if (px < pz) return { x: h.x + Math.sign(dx) * h.hw, z };
            else         return { x, z: h.z + Math.sign(dz) * h.hd };
        }
    }
    return null;
}

// Returns the house the player is currently inside (or null).
function insideHouse(x, z) {
    for (const h of houseColliders) {
        if (!h.w) continue;
        const dx = x - h.x, dz = z - h.z;
        const cosR = Math.cos(-h.rot), sinR = Math.sin(-h.rot);
        const lx = dx * cosR - dz * sinR;
        const lz = dx * sinR + dz * cosR;
        const inset = h.wallT + 0.18;
        if (lx > -h.w / 2 + inset && lx < h.w / 2 - inset &&
            lz > -h.d / 2 + inset && lz < h.d / 2 - inset) return h;
    }
    return null;
}

// Find the nearest house with a door the player is facing, for E key.
function nearestDoor(x, z, yaw) {
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    let best = null, bestD = 12;    // max door interaction range (m)
    for (const h of houseColliders) {
        if (!h.w) continue;
        // Door world position: house front center, displaced along its +Z (in local)
        const cosF = Math.cos(h.rot), sinF = Math.sin(h.rot);
        const wx = h.x + 0 * cosF - (h.d / 2) * sinF;
        const wz = h.z + 0 * sinF + (h.d / 2) * cosF;
        const dx = wx - x, dz = wz - z;
        const dist = Math.hypot(dx, dz);
        if (dist > bestD) continue;
        const dot = (dx * fx + dz * fz) / (dist || 1);
        // No facing check — just need to be nearby
        if (dist < bestD) { bestD = dist; best = h; }
    }
    return best;
}
function tryJump() { if (vy <= 0) vy = JUMP_V; }

// Movement
let yaw = 0, pitch = 0;
const move = { f: false, b: false, l: false, r: false, run: false };
addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k === 'w') move.f = true;
    if (k === 's') move.b = true;
    if (k === 'a') move.l = true;
    if (k === 'd') move.r = true;
    if (k === 'shift') move.run = true;
    if (k === ' ' || k === 'spacebar') { tryJump(); e.preventDefault(); }
    if (k === 'l' || k === 'f') startSwing();
    if (k === 'e') {
        const h = nearestDoor(camera.position.x, camera.position.z, yaw);
        if (h) h.doorOpen = !h.doorOpen;
    }
});
addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    if (k === 'w') move.f = false;
    if (k === 's') move.b = false;
    if (k === 'a') move.l = false;
    if (k === 'd') move.r = false;
    if (k === 'shift') move.run = false;
});
window.addEventListener('mousedown', e => {
    if (!document.pointerLockElement) {
        renderer.domElement.requestPointerLock();
        return;
    }
    if (e.button === 0) startSwing();
});
addEventListener('mousemove', e => {
    if (document.pointerLockElement) {
        yaw   -= e.movementX * 0.0042;
        pitch -= e.movementY * 0.0042;
        pitch = Math.max(-1.3, Math.min(1.3, pitch));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
    }
});
addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});
