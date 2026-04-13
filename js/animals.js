// ===================================================================
//  WILDLIFE — quadrupeds with realistic proportions and a walk cycle
// ===================================================================
const animals = [];

// ----- Anatomically-shaped species builders -----
// Each returns a Group whose origin is at the ground at the animal's center.
// userData.legs is an array of 4 leg PIVOT groups (FL, FR, BL, BR) so the
// walk-cycle code can rotate them around their X axis.
// userData.head exposes the head mesh for future look-at logic.

function buildRabbit() {
    const g = new THREE.Group();
    const fur    = new THREE.MeshLambertMaterial({ color: 0x9a7856 });
    const furDk  = new THREE.MeshLambertMaterial({ color: 0x7a5e40 });
    const belly  = new THREE.MeshLambertMaterial({ color: 0xebe2d0 });
    const pink   = new THREE.MeshLambertMaterial({ color: 0xc98a7a });
    const nose   = new THREE.MeshLambertMaterial({ color: 0xd89088 });
    const black  = new THREE.MeshLambertMaterial({ color: 0x060606 });
    const white  = new THREE.MeshLambertMaterial({ color: 0xf0ece4 });
    const eyeHi  = new THREE.MeshLambertMaterial({ color: 0xffffff });

    // --- BODY: overlapping spheres for organic muscle form ---
    // Main torso
    const m = (sp, mat, sx,sy,sz, px,py,pz) => {
        const mesh = new THREE.Mesh(sp, mat);
        mesh.scale.set(sx,sy,sz); mesh.position.set(px,py,pz);
        mesh.castShadow = true; g.add(mesh); return mesh;
    };
    m(SP(0.17), fur,   1.25, 0.95, 0.85,  0,    0.20, 0);     // mid torso
    m(SP(0.14), fur,   1.0,  1.05, 0.90, -0.08, 0.22, 0);     // rear
    m(SP(0.16), fur,   0.9,  0.90, 0.82,  0.10, 0.19, 0);     // front chest
    m(SP(0.15), furDk, 1.15, 0.45, 0.70,  0,    0.32, 0);     // back ridge (darker)
    m(SP(0.14), belly, 1.10, 0.48, 0.68,  0.02, 0.11, 0);     // white belly
    // Powerful rear haunches
    m(SP(0.10), fur,   0.85, 1.15, 1.0,  -0.14, 0.18, -0.06);
    m(SP(0.10), fur,   0.85, 1.15, 1.0,  -0.14, 0.18,  0.06);

    // --- HEAD ---
    const head = m(SP(0.095), fur, 1.3, 1.05, 1.05, 0.22, 0.27, 0);
    m(SP(0.065), fur,   1.4, 0.85, 0.90, 0.31, 0.24, 0);       // snout
    m(SP(0.04),  belly, 1.2, 0.60, 0.80, 0.33, 0.22, 0);       // chin
    // Cheek puffs
    m(SP(0.05), fur, 0.85, 0.90, 1.0, 0.24, 0.24, -0.06);
    m(SP(0.05), fur, 0.85, 0.90, 1.0, 0.24, 0.24,  0.06);
    // Nose
    m(SP(0.016), nose, 1.2, 0.8, 1.0, 0.36, 0.235, 0);
    // Nostrils
    for (const sz of [-1, 1])
        m(SP(0.006), black, 1, 1, 1, 0.372, 0.232, sz * 0.008);
    // Eyes (large, with highlight)
    for (const sz of [-1, 1]) {
        m(SP(0.018), black, 1, 1, 1, 0.255, 0.295, sz * 0.072);
        m(SP(0.005), eyeHi, 1, 1, 1, 0.258, 0.302, sz * 0.068);
    }
    // Whiskers (thin cylinders from snout sides)
    for (const sz of [-1, 1]) for (const wy of [0, 0.008]) {
        const w = new THREE.Mesh(CY(0.001, 0.001, 0.08, 4), furDk);
        w.rotation.z = Math.PI / 2 + 0.15;
        w.rotation.y = sz * 0.4;
        w.position.set(0.34, 0.235 + wy, sz * 0.035);
        g.add(w);
    }

    // --- EARS (long, upright, with pink lining) ---
    for (const sz of [-1, 1]) {
        const eg = new THREE.Group();
        eg.position.set(0.17, 0.34, sz * 0.04);
        eg.rotation.z = -0.15;
        eg.rotation.y = sz * 0.12;
        const outer = new THREE.Mesh(SP(0.035), fur);
        outer.scale.set(0.42, 2.8, 0.65);
        outer.position.y = 0.09;
        eg.add(outer);
        const inner = new THREE.Mesh(SP(0.033), pink);
        inner.scale.set(0.38, 2.7, 0.35);
        inner.position.set(0.003, 0.09, 0);
        eg.add(inner);
        g.add(eg);
    }
    // Cotton tail (fluffy white puff)
    m(SP(0.05), white, 1.0, 1.0, 1.0, -0.24, 0.22, 0);
    m(SP(0.03), white, 1.0, 1.0, 1.0, -0.26, 0.25, 0);

    // === LEGS ===
    const legs = [];
    // Front legs — small, delicate
    for (const sz of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(0.10, 0.14, sz * 0.065);
        const upper = new THREE.Mesh(CY(0.022, 0.026, 0.09), fur);
        upper.position.y = -0.045; pivot.add(upper);
        const lower = new THREE.Mesh(CY(0.018, 0.022, 0.08), fur);
        lower.position.y = -0.12; pivot.add(lower);
        const paw = new THREE.Mesh(SP(0.022), furDk);
        paw.scale.set(0.9, 0.5, 1.5);
        paw.position.y = -0.16; pivot.add(paw);
        g.add(pivot); legs.push(pivot);
    }
    // Back legs — powerful, with visible thigh, long foot
    for (const sz of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(-0.13, 0.20, sz * 0.085);
        const thigh = new THREE.Mesh(SP(0.075), fur);
        thigh.scale.set(0.72, 1.3, 0.85);
        thigh.position.set(0.02, -0.04, 0); pivot.add(thigh);
        const shank = new THREE.Mesh(CY(0.024, 0.020, 0.12), fur);
        shank.position.set(0.04, -0.15, 0);
        shank.rotation.z = -0.35; pivot.add(shank);
        const foot = new THREE.Mesh(SP(0.04), furDk);
        foot.scale.set(1.8, 0.4, 0.9);
        foot.position.set(0.08, -0.22, 0); pivot.add(foot);
        g.add(pivot); legs.push(pivot);
    }
    g.userData.legs = legs;
    g.userData.head = head;
    return g;
}

function buildDeer() {
    const g = new THREE.Group();
    const fur    = new THREE.MeshLambertMaterial({ color: 0x9a6638 });
    const furDk  = new THREE.MeshLambertMaterial({ color: 0x6a4420 });
    const light  = new THREE.MeshLambertMaterial({ color: 0xd4a878 });
    const bellyM = new THREE.MeshLambertMaterial({ color: 0xe0c8a8 });
    const antM   = new THREE.MeshLambertMaterial({ color: 0x6a5040 });
    const hoofM  = new THREE.MeshLambertMaterial({ color: 0x1a1208 });
    const black  = new THREE.MeshLambertMaterial({ color: 0x060606 });
    const eyeHi  = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const noseM  = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const pinkE  = new THREE.MeshLambertMaterial({ color: 0xc08868 });

    const a = (sp, mat, sx,sy,sz, px,py,pz) => {
        const mesh = new THREE.Mesh(sp, mat);
        mesh.scale.set(sx,sy,sz); mesh.position.set(px,py,pz);
        mesh.castShadow = true; g.add(mesh); return mesh;
    };
    // --- BODY: overlapping muscle spheres ---
    a(SP(0.50), fur,    1.55, 0.95, 0.72,  0,    1.05, 0);     // main torso
    a(SP(0.38), fur,    0.90, 1.05, 0.88,  0.52, 1.06, 0);     // front chest
    a(SP(0.38), fur,    0.88, 1.08, 0.88, -0.52, 1.08, 0);     // rump
    a(SP(0.42), furDk,  1.40, 0.38, 0.62,  0,    1.38, 0);     // dark back ridge
    a(SP(0.44), bellyM, 1.50, 0.42, 0.60,  0,    0.82, 0);     // light belly
    a(SP(0.25), light,  0.70, 0.90, 0.85, -0.75, 1.08, 0);     // white rump patch

    // --- NECK: curved via 2 overlapping cylinders ---
    a(CY(0.14,0.19,0.35), fur, 1,1,1, 0.72,1.22,0).rotation.z = -0.65;
    a(CY(0.11,0.15,0.35), fur, 1,1,1, 0.88,1.48,0).rotation.z = -1.1;

    // --- HEAD ---
    const head = a(SP(0.13), fur, 1.65,1.05,1.05, 1.08,1.72,0);
    a(SP(0.085), fur,   1.55, 0.88, 0.88, 1.28, 1.66, 0);     // snout
    a(SP(0.055), light, 1.35, 0.65, 0.82, 1.34, 1.63, 0);     // chin
    a(SP(0.045), noseM, 1.20, 0.80, 1.05, 1.42, 1.64, 0);     // nose pad
    // Nostrils
    for (const sz of [-1,1])
        a(SP(0.008), black, 1,1,1, 1.46, 1.635, sz*0.014);
    // Eyes — large, dark, with highlight
    for (const sz of [-1,1]) {
        a(SP(0.028), black, 1,1.1,1, 1.12, 1.80, sz*0.105);
        a(SP(0.008), eyeHi, 1,1,1, 1.115, 1.815, sz*0.098);
    }
    // Ears — pointed, with pink inner
    for (const sz of [-1,1]) {
        const ear = a(SP(0.065), fur, 0.35, 1.6, 0.85, 0.99, 1.96, sz*0.14);
        ear.rotation.z = sz * 0.3; ear.rotation.x = sz * 0.15;
        const ei = a(SP(0.055), pinkE, 0.30, 1.4, 0.55, 0.995, 1.97, sz*0.145);
        ei.rotation.z = sz * 0.3;
    }
    // --- ANTLERS: main beam + 4 tines per side ---
    for (const sz of [-1,1]) {
        a(CY(0.022,0.038,0.45), antM, 1,1,1, 1.0,2.12,sz*0.10).rotation.z = sz*-0.32;
        // Brow tine
        a(CY(0.016,0.022,0.18), antM, 1,1,1, 0.98,2.08,sz*0.12).rotation.z = sz*-0.8;
        for (let t = 0; t < 3; t++) {
            const tine = a(CY(0.014,0.020,0.20), antM, 1,1,1,
                0.97+t*0.035, 2.22+t*0.07, sz*(0.13+t*0.04));
            tine.rotation.z = sz*(-0.65+t*0.15);
            tine.rotation.x = sz*0.3;
        }
    }
    // Tail — white underside
    a(SP(0.06), light, 0.65,1.5,0.50, -0.82,1.12,0);

    // === LEGS: 3-segment with thigh, shank, cannon + hoof ===
    const legs = [];
    const lp = [
        { x: 0.42, z:-0.22, front:true  }, { x: 0.42, z:0.22, front:true  },
        { x:-0.42, z:-0.22, front:false }, { x:-0.42, z:0.22, front:false },
    ];
    for (const L of lp) {
        const pivot = new THREE.Group();
        pivot.position.set(L.x, 0.98, L.z);
        // Thigh (wider sphere)
        const thigh = new THREE.Mesh(SP(0.08), fur);
        thigh.scale.set(0.7, 1.4, 0.7);
        thigh.position.y = -0.08; pivot.add(thigh);
        // Upper
        const uleg = new THREE.Mesh(CY(0.048,0.038,0.38), fur);
        uleg.position.set(0,-0.32,0); uleg.castShadow = true;
        pivot.add(uleg);
        // Lower (lighter)
        const lleg = new THREE.Mesh(CY(0.035,0.028,0.38), light);
        lleg.position.set(0,-0.68,0);
        pivot.add(lleg);
        // Hoof
        const hoof = new THREE.Mesh(CY(0.042,0.042,0.06), hoofM);
        hoof.position.y = -0.90; pivot.add(hoof);
        g.add(pivot); legs.push(pivot);
    }
    g.userData.legs = legs;
    g.userData.head = head;
    return g;
}

function buildBear() {
    const g = new THREE.Group();
    const fur    = new THREE.MeshLambertMaterial({ color: 0x432715 });
    const furDk  = new THREE.MeshLambertMaterial({ color: 0x2a1808 });
    const furLt  = new THREE.MeshLambertMaterial({ color: 0x6a4830 });
    const snoutM = new THREE.MeshLambertMaterial({ color: 0x7a5838 });
    const noseM  = new THREE.MeshLambertMaterial({ color: 0x0e0e0e });
    const black  = new THREE.MeshLambertMaterial({ color: 0x060606 });
    const eyeHi  = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const clawM  = new THREE.MeshLambertMaterial({ color: 0x1a1208 });
    const pawM   = new THREE.MeshLambertMaterial({ color: 0x261810 });

    const a = (sp, mat, sx,sy,sz, px,py,pz) => {
        const mesh = new THREE.Mesh(sp, mat);
        mesh.scale.set(sx,sy,sz); mesh.position.set(px,py,pz);
        mesh.castShadow = true; g.add(mesh); return mesh;
    };
    // --- BODY: massive hulking form ---
    a(SP(0.72), fur,    1.55, 1.0,  1.10,  0,    1.0,  0);     // main torso
    a(SP(0.52), fur,    0.88, 1.0,  1.04,  0.72, 0.95, 0);     // front chest
    a(SP(0.58), fur,    0.95, 1.02, 1.06, -0.65, 1.0,  0);     // rear haunches
    a(SP(0.50), fur,    0.88, 0.88, 1.0,   0.55, 1.34, 0);     // shoulder hump
    a(SP(0.42), furDk,  1.45, 0.35, 0.85,  0,    1.52, 0);     // dark back ridge
    a(SP(0.40), furLt,  1.40, 0.40, 0.90,  0,    0.68, 0);     // lighter underbelly

    // --- THICK NECK ---
    a(CY(0.22,0.28,0.30), fur, 1,1,1, 0.92,1.18,0).rotation.z = -0.55;

    // --- HEAD: big round with broad snout ---
    const head = a(SP(0.34), fur, 1.0,1.0,1.0, 1.20,1.30,0);
    // Brow ridge (gives the bear a serious look)
    a(SP(0.18), furDk, 1.6, 0.55, 1.2, 1.28, 1.42, 0);
    // Snout (lighter, extended)
    a(SP(0.20), snoutM, 1.45, 0.85, 1.0, 1.46, 1.18, 0);
    a(SP(0.12), snoutM, 1.30, 0.75, 0.90, 1.58, 1.15, 0);    // snout tip
    // Nose (large, dark)
    a(SP(0.08), noseM, 1.2, 0.9, 1.1, 1.66, 1.20, 0);
    // Nostrils
    for (const sz of [-1,1])
        a(SP(0.012), black, 1,1,1, 1.72, 1.18, sz*0.02);
    // Mouth line
    a(SP(0.06), furDk, 2.0, 0.3, 0.8, 1.52, 1.10, 0);
    // Eyes — small, deep-set (bears have small eyes)
    for (const sz of [-1,1]) {
        a(SP(0.025), black, 1,1.1,1, 1.35, 1.40, sz*0.14);
        a(SP(0.007), eyeHi, 1,1,1, 1.355, 1.415, sz*0.132);
    }
    // Round ears — small relative to head
    for (const sz of [-1,1]) {
        a(SP(0.09), fur,  0.65,1.0,1.0, 1.06, 1.56, sz*0.24);
        a(SP(0.06), furLt, 0.45,0.85,0.85, 1.08, 1.56, sz*0.26);
    }

    // === LEGS: stocky with big paws and claws ===
    const legs = [];
    const lp = [
        { x: 0.55, z:-0.34 }, { x: 0.55, z:0.34 },
        { x:-0.55, z:-0.34 }, { x:-0.55, z:0.34 },
    ];
    for (const L of lp) {
        const pivot = new THREE.Group();
        pivot.position.set(L.x, 0.85, L.z);
        // Thick thigh
        const thigh = new THREE.Mesh(SP(0.15), fur);
        thigh.scale.set(0.85, 1.3, 0.85);
        thigh.position.y = -0.08; pivot.add(thigh);
        // Upper leg
        const bUleg = new THREE.Mesh(CY(0.14,0.15,0.38), fur);
        bUleg.position.set(0,-0.32,0); bUleg.castShadow = true;
        pivot.add(bUleg);
        // Lower leg
        const bLleg = new THREE.Mesh(CY(0.13,0.14,0.35), fur);
        bLleg.position.set(0,-0.62,0);
        pivot.add(bLleg);
        // Big paw
        const paw = new THREE.Mesh(SP(0.12), pawM);
        paw.scale.set(0.85, 0.4, 1.3);
        paw.position.set(0, -0.82, 0.02); pivot.add(paw);
        // Claws (5 per paw)
        for (let c = -2; c <= 2; c++) {
            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.065, 4), clawM);
            claw.rotation.x = -Math.PI / 2;
            claw.position.set(0, -0.82, 0.14 + c * 0.045);
            pivot.add(claw);
        }
        g.add(pivot); legs.push(pivot);
    }
    g.userData.legs = legs;
    g.userData.head = head;
    return g;
}

/*  Old generic builder kept for reference (no longer used).
    spec = {
        color, dark,
        bodyL, bodyW, bodyH,        // body box dimensions (length×width×height)
        shoulderH,                  // shoulder height (top of body) in m
        legLen, legR,               // leg cylinder length and radius
        neckL, neckR, neckAng,      // neck cylinder
        headL, headW, headH,        // head box
        tail,                       // bool — short tail box
        antlers,                    // bool — buck antlers
        ears                        // 'long' (rabbit) | 'short' (deer/bear) | null
    }
    Returns a Group with .legs (4 mesh refs) and .head (mesh ref) for animation.
    Body is oriented along +X (head at +X end). The base of the legs sits at y=0
    so the model can be placed directly on the ground.

function buildQuadruped(s) {
    const g = new THREE.Group();
    const fur  = new THREE.MeshLambertMaterial({ color: s.color });
    const dark = new THREE.MeshLambertMaterial({ color: s.dark });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(s.bodyL, s.bodyH, s.bodyW), fur);
    body.position.y = s.shoulderH - s.bodyH / 2;
    body.castShadow = true;
    g.add(body);

    // Neck (tilted up toward the head)
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(s.neckR * 0.85, s.neckR, s.neckL, 8), fur);
    // Base at front-top of body
    const neckBaseX = s.bodyL * 0.45;
    const neckBaseY = s.shoulderH;
    neck.position.set(
        neckBaseX + Math.sin(s.neckAng) * s.neckL * 0.5,
        neckBaseY + Math.cos(s.neckAng) * s.neckL * 0.5,
        0
    );
    neck.rotation.z = -s.neckAng;
    neck.castShadow = true;
    g.add(neck);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(s.headL, s.headH, s.headW), fur);
    const headX = neckBaseX + Math.sin(s.neckAng) * s.neckL + s.headL * 0.35;
    const headY = neckBaseY + Math.cos(s.neckAng) * s.neckL + s.headH * 0.15;
    head.position.set(headX, headY, 0);
    head.castShadow = true;
    g.add(head);
    // Snout
    const snout = new THREE.Mesh(
        new THREE.BoxGeometry(s.headL * 0.55, s.headH * 0.55, s.headW * 0.7),
        fur
    );
    snout.position.set(headX + s.headL * 0.5, headY - s.headH * 0.15, 0);
    g.add(snout);

    // Eyes
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
    for (const sz of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(s.headW * 0.10, 6, 5), eyeMat);
        eye.position.set(headX + s.headL * 0.2, headY + s.headH * 0.15, sz * s.headW * 0.5);
        g.add(eye);
    }

    // Ears
    if (s.ears === 'long') {
        // Rabbit ears
        for (const sz of [-1, 1]) {
            const ear = new THREE.Mesh(
                new THREE.BoxGeometry(s.headL * 0.18, s.headH * 1.6, s.headW * 0.22),
                fur
            );
            ear.position.set(headX - s.headL * 0.05, headY + s.headH * 0.95, sz * s.headW * 0.35);
            ear.rotation.z = sz * 0.1;
            g.add(ear);
        }
    } else if (s.ears === 'short') {
        for (const sz of [-1, 1]) {
            const ear = new THREE.Mesh(
                new THREE.BoxGeometry(s.headL * 0.18, s.headH * 0.45, s.headW * 0.22),
                fur
            );
            ear.position.set(headX - s.headL * 0.05, headY + s.headH * 0.55, sz * s.headW * 0.45);
            g.add(ear);
        }
    }

    // Antlers
    if (s.antlers) {
        for (const sz of [-1, 1]) {
            const main = new THREE.Mesh(
                new THREE.CylinderGeometry(0.04, 0.06, 0.55, 5), dark
            );
            main.position.set(headX - 0.05, headY + s.headH * 0.95, sz * s.headW * 0.45);
            main.rotation.z = sz * -0.25;
            g.add(main);
            for (let t = 0; t < 3; t++) {
                const tine = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.025, 0.04, 0.28, 5), dark
                );
                tine.position.set(
                    headX - 0.1 + t * 0.07,
                    headY + s.headH * 0.95 + 0.18 + t * 0.05,
                    sz * (s.headW * 0.45 + 0.05)
                );
                tine.rotation.z = sz * (-0.6 + t * 0.1);
                g.add(tine);
            }
        }
    }

    // Tail
    if (s.tail) {
        const tail = new THREE.Mesh(
            new THREE.BoxGeometry(s.bodyL * 0.10, s.bodyH * 0.4, s.bodyW * 0.4),
            fur
        );
        tail.position.set(-s.bodyL * 0.5, s.shoulderH * 0.85, 0);
        g.add(tail);
    }

    // === LEGS ===
    // Place legs at front/back × left/right.
    // Pivot at shoulder/hip so the legs can swing in the walk cycle.
    // We use a tiny Group per leg whose origin is at the top, then attach
    // the leg cylinder hanging downward from that pivot.
    const legs = [];
    const fxz = [
        { fx:  s.bodyL * 0.36, fz: -s.bodyW * 0.42, key: 'FL' },  // front left
        { fx:  s.bodyL * 0.36, fz:  s.bodyW * 0.42, key: 'FR' },  // front right
        { fx: -s.bodyL * 0.36, fz: -s.bodyW * 0.42, key: 'BL' },  // back  left
        { fx: -s.bodyL * 0.36, fz:  s.bodyW * 0.42, key: 'BR' },  // back  right
    ];
    for (const L of fxz) {
        const pivot = new THREE.Group();
        pivot.position.set(L.fx, s.shoulderH - s.bodyH * 0.5, L.fz);
        const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(s.legR, s.legR, s.legLen, 6),
            dark
        );
        leg.position.y = -s.legLen / 2;
        leg.castShadow = true;
        pivot.add(leg);
        g.add(pivot);
        legs.push(pivot);
    }

    g.userData.legs = legs;
    g.userData.head = head;
    g.userData.bodyHeight = s.shoulderH;
    return g;
}
*/

// ----- Behavior specs (anatomy is in the build* functions) -----
const SPEC_RABBIT = {
    build: buildRabbit,
    speedWalk: 1.6, speedFlee: 12, fleeR: 14,
    cycleSpeed: 14, legAmp: 0.7,
};
const SPEC_DEER = {
    build: buildDeer,
    speedWalk: 2.4, speedFlee: 11, fleeR: 26,
    cycleSpeed: 7,  legAmp: 0.5,
};
const SPEC_BEAR = {
    build: buildBear,
    speedWalk: 1.8, speedChase: 6.0, chaseR: 16,
    cycleSpeed: 5,  legAmp: 0.4,
};

function spawnAnimal(spec, count, nearX, nearZ, radius) {
    for (let i = 0; i < count; i++) {
        let x, z, h;
        for (let tries = 0; tries < 60; tries++) {
            if (nearX !== undefined) {
                const ang = rand(0, Math.PI * 2);
                const r = rand(15, radius);
                x = nearX + Math.cos(ang) * r;
                z = nearZ + Math.sin(ang) * r;
            } else {
                x = rand(-WORLD/2 + 40, WORLD/2 - 40);
                z = rand(-WORLD/2 + 40, WORLD/2 - 40);
            }
            h = heightAt(x, z);
            if (distToRiver(x, z) > 30 && h > 12 && h < 38) break;
        }
        const g = spec.build();
        g.position.set(x, sampleGroundY(x, z), z);
        propRoot.add(g);
        animals.push({
            spec, obj: g, x, z,
            phase: Math.random() * Math.PI * 2,
            wanderT: rand(0, 4),
            dirX: rand(-1, 1), dirZ: rand(-1, 1),
            speed: 0,
        });
    }
}
// Scattered across the world
spawnAnimal(SPEC_RABBIT, 80);
spawnAnimal(SPEC_DEER,   30);
spawnAnimal(SPEC_BEAR,   10);
// (A guaranteed cluster near the player is added after spawn is chosen.)

// (sampleGroundY + CELL are defined earlier, right after the terrain mesh.)
