// ===================================================================
//  FLORA / PROPS — biome-aware, river-aware placement
// ===================================================================
const propRoot = new THREE.Group();
scene.add(propRoot);

// Sphere helper: higher segment count for smooth organic forms
const SP = (r, s = 16) => new THREE.SphereGeometry(r, s, s);
const CY = (rt, rb, h, s = 10) => new THREE.CylinderGeometry(rt, rb, h, s);

// shared materials (cheap)
const M = {
    barkOak:   new THREE.MeshLambertMaterial({ color: 0x4a3320 }),
    barkPine:  new THREE.MeshLambertMaterial({ color: 0x2e1f12 }),
    barkBirch: new THREE.MeshLambertMaterial({ color: 0xd8d2c0 }),
    deadBark:  new THREE.MeshLambertMaterial({ color: 0x3a2f24 }),
    leafOak:   new THREE.MeshLambertMaterial({ color: 0x33561f }),
    leafPine:  new THREE.MeshLambertMaterial({ color: 0x1f3a22 }),
    leafBirch: new THREE.MeshLambertMaterial({ color: 0x6a8a3a }),
    bushA:     new THREE.MeshLambertMaterial({ color: 0x35531f }),
    bushB:     new THREE.MeshLambertMaterial({ color: 0x4a6a2a }),
    rockGrey:  new THREE.MeshLambertMaterial({ color: 0x6b6660, flatShading: true }),
    rockDark:  new THREE.MeshLambertMaterial({ color: 0x4f4a44, flatShading: true }),
    grassA:    new THREE.MeshLambertMaterial({ color: 0x4a6a2a }),
    grassB:    new THREE.MeshLambertMaterial({ color: 0x607a32 }),
    reed:      new THREE.MeshLambertMaterial({ color: 0x6a7a30 }),
};

// ----- tree builders -----
// Tree scale base — real trees are 15–35 m. Player is 1.65 m.
const TREE = 2.6;
function makeOak(s) {
    s *= TREE;
    const g = new THREE.Group();
    const H = 7 * s;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.55 * s, 0.85 * s, H, 8), M.barkOak);
    trunk.position.y = H / 2; trunk.castShadow = true;
    g.add(trunk);
    for (let i = 0; i < 5; i++) {
        const f = new THREE.Mesh(new THREE.SphereGeometry(rand(2.4, 3.4) * s, 8, 6), M.leafOak);
        f.position.set(rand(-1.6, 1.6) * s, H + rand(-0.5, 2.5) * s, rand(-1.6, 1.6) * s);
        f.castShadow = true;
        g.add(f);
    }
    return g;
}
function makePine(s) {
    s *= TREE;
    const g = new THREE.Group();
    const H = 11 * s;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4 * s, 0.65 * s, H, 8), M.barkPine);
    trunk.position.y = H / 2; trunk.castShadow = true;
    g.add(trunk);
    // Foliage: start the lowest cone near the base so we don't see meters
    // of bare trunk. 6 stacked cones, generously overlapping.
    for (let i = 0; i < 6; i++) {
        const r = (3.8 - i * 0.55) * s;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 3.4 * s, 8), M.leafPine);
        cone.position.y = (1.6 + i * 1.7) * s;
        cone.castShadow = true;
        g.add(cone);
    }
    return g;
}
function makeBirch(s) {
    s *= TREE;
    const g = new THREE.Group();
    const H = 9 * s;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * s, 0.4 * s, H, 8), M.barkBirch);
    trunk.position.y = H / 2; trunk.castShadow = true;
    g.add(trunk);
    for (let i = 0; i < 4; i++) {
        const f = new THREE.Mesh(new THREE.SphereGeometry(rand(1.8, 2.4) * s, 8, 6), M.leafBirch);
        f.position.set(rand(-1.1, 1.1) * s, (H * 0.8 + i * 0.9 * s), rand(-1.1, 1.1) * s);
        f.castShadow = true;
        g.add(f);
    }
    return g;
}
function makeDeadTree(s) {
    s *= TREE;
    const g = new THREE.Group();
    const H = 8 * s;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32 * s, 0.55 * s, H, 7), M.deadBark);
    trunk.position.y = H / 2; trunk.castShadow = true;
    g.add(trunk);
    for (let i = 0; i < 4; i++) {
        const br = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * s, 0.18 * s, 2.6 * s, 5), M.deadBark);
        br.position.set(rand(-0.4, 0.4) * s, (H * 0.7 + i * 0.6 * s), rand(-0.4, 0.4) * s);
        br.rotation.z = rand(-1.1, 1.1);
        br.rotation.x = rand(-0.6, 0.6);
        br.castShadow = true;
        g.add(br);
    }
    return g;
}

function makeBush() {
    const g = new THREE.Group();
    const n = 4 + (Math.random() * 4 | 0);
    for (let i = 0; i < n; i++) {
        const r = rand(0.7, 1.6);
        const s = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 6), Math.random() < 0.5 ? M.bushA : M.bushB);
        s.position.set(rand(-1.2, 1.2), rand(0.4, 1.3), rand(-1.2, 1.2));
        s.castShadow = true;
        g.add(s);
    }
    return g;
}

function makeRock() {
    const r = rand(0.9, 4.2);
    const detail = Math.random() < 0.5 ? 0 : 1;
    const m = new THREE.Mesh(
        new THREE.IcosahedronGeometry(r, detail),
        Math.random() < 0.5 ? M.rockGrey : M.rockDark
    );
    m.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
    m.castShadow = true;
    return { mesh: m, sink: r * 0.35 };
}

function makeGrassTuft() {
    const h = rand(0.6, 1.4);
    const t = new THREE.Mesh(
        new THREE.ConeGeometry(rand(0.25, 0.55), h, 5),
        Math.random() < 0.5 ? M.grassA : M.grassB
    );
    t.position.y = h / 2;
    t.rotation.y = Math.random() * 6.28;
    return t;
}
function makeReed() {
    const h = rand(1.2, 2.4);
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.18, h, 5), M.reed);
    t.position.y = h / 2;
    return t;
}

// List of choppable trees with their world positions, for hit detection.
const trees = [];   // { obj, x, z, alive, fall: 0..1 }
const swaying = []; // foliage groups for wind sway (tree obj + base rotation)

// ----- placement: rejection-sampled across the world -----
function place(obj, x, z, sink = 0, tree = false) {
    const y = sampleGroundY(x, z) - sink;
    obj.position.set(x, y, z);
    obj.rotation.y = Math.random() * 6.28;
    propRoot.add(obj);
    if (tree) {
        const t = { obj, x, z, y, sink, alive: true, fall: 0,
                    baseRotX: obj.rotation.x, baseRotZ: obj.rotation.z,
                    seed: Math.random() * 100, radius: 1.6 };
        trees.push(t);
        swaying.push(t);
    }
}

// (Prop placement happens AFTER village centers are picked, see buildings.js.)
