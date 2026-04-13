// ===================================================================
//  PROCEDURAL VILLAGES — properly built timber-framed houses,
//  placed only on flat dry plains / meadows, away from forests.
// ===================================================================
const houseColliders = [];                  // for player collision
const villageCenters = [];                  // [{cx,cz,radius}] for tree exclusion
const VILLAGE_CLEAR = 110;                  // clear-radius around village

function buildHouse(x, z, rotY, houseType) {
    const g = new THREE.Group();
    // HOLLOW cottage you can walk into. Door is at ground level.
    const w     = rand(11, 13);
    const d     = rand(8, 9.5);
    const wh    = rand(5.5, 6.5);
    const roofH = rand(4.8, 5.8);
    const wallT = 0.32;
    const doorW = 1.6;     // wide enough to walk through comfortably
    const doorH = 2.6;     // tall enough that even crouched you wouldn't bump
    const lintelH = wh - doorH;

    const wallMat   = new THREE.MeshLambertMaterial({ color: 0xd4c098, side: THREE.DoubleSide });
    const beamMat   = new THREE.MeshLambertMaterial({ color: 0x2c1d0e });
    const stoneMat  = new THREE.MeshLambertMaterial({ color: 0x6e655a, flatShading: true });
    const thatchMat = new THREE.MeshLambertMaterial({ color: 0xb8862c, side: THREE.DoubleSide });
    const thatchEdgeMat = new THREE.MeshLambertMaterial({ color: 0x7d5a18 });
    const floorMat  = new THREE.MeshLambertMaterial({ color: 0x6a4a28 });

    // Stone plinth: extends 3 m DOWN below the anchor so that on rolling
    // ground the downhill side never shows daylight under the floor.
    // Top sits at y=0 (so the door is still flush with the entrance).
    const plinthDepth = 3.0;
    const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.4, plinthDepth, d + 0.4), stoneMat
    );
    plinth.position.y = -plinthDepth / 2 + 0.1;
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    g.add(plinth);

    // Interior floor
    const floor = new THREE.Mesh(
        new THREE.BoxGeometry(w - 2 * wallT, 0.12, d - 2 * wallT),
        floorMat
    );
    floor.position.y = 0.16;
    floor.receiveShadow = true;
    g.add(floor);

    // === HOLLOW WALLS — 4 separate slabs, front split for the door gap ===
    // Back wall
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, wh, wallT), wallMat);
    back.position.set(0, wh / 2, -d / 2 + wallT / 2);
    back.castShadow = true; back.receiveShadow = true;
    g.add(back);
    // Left wall
    const left = new THREE.Mesh(new THREE.BoxGeometry(wallT, wh, d - 2 * wallT), wallMat);
    left.position.set(-w / 2 + wallT / 2, wh / 2, 0);
    left.castShadow = true; left.receiveShadow = true;
    g.add(left);
    // Right wall
    const right = left.clone();
    right.position.x = w / 2 - wallT / 2;
    g.add(right);
    // Front wall — left of door
    const frontPanelW = (w - doorW) / 2;
    const frontLeft = new THREE.Mesh(
        new THREE.BoxGeometry(frontPanelW, wh, wallT), wallMat
    );
    frontLeft.position.set(-(doorW / 2 + frontPanelW / 2), wh / 2, d / 2 - wallT / 2);
    frontLeft.castShadow = true;
    g.add(frontLeft);
    // Front wall — right of door
    const frontRight = frontLeft.clone();
    frontRight.position.x = doorW / 2 + frontPanelW / 2;
    g.add(frontRight);
    // Front wall — lintel above the door
    if (lintelH > 0) {
        const lintel = new THREE.Mesh(
            new THREE.BoxGeometry(doorW + 0.4, lintelH, wallT), wallMat
        );
        lintel.position.set(0, doorH + lintelH / 2, d / 2 - wallT / 2);
        g.add(lintel);
    }

    // === Timber framing on the long sides (front + back) ===
    const postT = 0.22;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(postT, wh, postT), beamMat);
        post.position.set(sx * (w / 2 - postT / 2), wh / 2, sz * (d / 2 - postT / 2));
        g.add(post);
    }
    for (const sz of [-1, 1]) {
        for (const yFrac of [0.0, 0.5, 1.0]) {
            const h = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, postT * 0.7, postT * 0.7), beamMat);
            h.position.set(0, wh * yFrac, sz * (d / 2 + 0.005));
            g.add(h);
        }
    }

    // === ROOF (same proven slope formula) ===
    const slopeRun  = d / 2;
    const slopeLen  = Math.sqrt(slopeRun * slopeRun + roofH * roofH);
    const slopeAng  = Math.atan2(roofH, slopeRun);
    const eaveW    = w + 1.2;
    const eaveOver = 0.6;
    const slopeFront = new THREE.Mesh(
        new THREE.BoxGeometry(eaveW, 0.35, slopeLen + eaveOver), thatchMat
    );
    slopeFront.position.set(0, wh + roofH / 2, slopeRun / 2);
    slopeFront.rotation.x = slopeAng;
    slopeFront.castShadow = true;
    g.add(slopeFront);
    const slopeBack = slopeFront.clone();
    slopeBack.position.z = -slopeRun / 2;
    slopeBack.rotation.x = -slopeAng;
    g.add(slopeBack);
    // Ridge cap
    const ridge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, eaveW + 0.1, 8), thatchEdgeMat
    );
    ridge.rotation.z = Math.PI / 2;
    ridge.position.set(0, wh + roofH, 0);
    g.add(ridge);
    // Triangular gable infill at the +X / -X ends
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-d / 2, 0);
    gableShape.lineTo( d / 2, 0);
    gableShape.lineTo(0, roofH);
    gableShape.closePath();
    const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 0.18, bevelEnabled: false });
    const gable1 = new THREE.Mesh(gableGeo, wallMat);
    gable1.rotation.y = Math.PI / 2;
    gable1.position.set(w / 2 - 0.05, wh, 0);
    g.add(gable1);
    const gable2 = new THREE.Mesh(gableGeo, wallMat);
    gable2.rotation.y = -Math.PI / 2;
    gable2.position.set(-w / 2 + 0.05, wh, 0);
    g.add(gable2);

    // === DOOR (hinged, ground level, animatable) ===
    const doorPivot = new THREE.Group();
    // Hinge on the player-left side of the door, sitting on the front wall
    doorPivot.position.set(-doorW / 2, 0, d / 2 - wallT / 2 + 0.04);
    const doorMesh = new THREE.Mesh(
        new THREE.BoxGeometry(doorW, doorH, 0.10),
        new THREE.MeshLambertMaterial({ color: 0x4a2e14 })
    );
    // Place door so its left edge sits at the pivot
    doorMesh.position.set(doorW / 2, doorH / 2, 0.05);
    doorMesh.castShadow = true;
    doorPivot.add(doorMesh);
    // Door handle
    const handle = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 6, 5),
        new THREE.MeshLambertMaterial({ color: 0x2a2218 })
    );
    handle.position.set(doorW - 0.18, doorH * 0.5, 0.12);
    doorPivot.add(handle);
    g.add(doorPivot);
    // Door frame trim
    const frameMat = beamMat;
    const frameSide = new THREE.Mesh(new THREE.BoxGeometry(0.1, doorH + 0.2, 0.18), frameMat);
    frameSide.position.set(-doorW / 2 - 0.05, (doorH + 0.2) / 2, d / 2 - wallT / 2 + 0.1);
    g.add(frameSide);
    const frameSide2 = frameSide.clone();
    frameSide2.position.x = doorW / 2 + 0.18;
    g.add(frameSide2);
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.3, 0.1, 0.18), frameMat);
    frameTop.position.set(0, doorH + 0.15, d / 2 - wallT / 2 + 0.1);
    g.add(frameTop);

    // === WINDOWS with shutters and crossbar mullion (front facade only) ===
    const winMat = new THREE.MeshLambertMaterial({ color: 0x1a1410 });
    const shutterMat = new THREE.MeshLambertMaterial({ color: 0x4a2c14 });
    for (const sx of [-w * 0.34, w * 0.34]) {
        const winW = 1.1, winH = 1.1;
        const win = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.1), winMat);
        win.position.set(sx, wh * 0.62, d / 2 - wallT / 2 + 0.05);
        g.add(win);
        const horiz = new THREE.Mesh(new THREE.BoxGeometry(winW, 0.08, 0.14), beamMat);
        horiz.position.set(sx, wh * 0.62, d / 2 - wallT / 2 + 0.10);
        g.add(horiz);
        const vert = new THREE.Mesh(new THREE.BoxGeometry(0.08, winH, 0.14), beamMat);
        vert.position.set(sx, wh * 0.62, d / 2 - wallT / 2 + 0.10);
        g.add(vert);
        for (const ss of [-1, 1]) {
            const sh = new THREE.Mesh(
                new THREE.BoxGeometry(winW * 0.55, winH * 1.05, 0.06), shutterMat
            );
            sh.position.set(sx + ss * (winW * 0.78), wh * 0.62, d / 2 - wallT / 2 + 0.12);
            g.add(sh);
        }
    }

    // === CHIMNEY ===
    const chimW = 1.0;
    const chimH = wh + roofH + 0.8;
    const chim = new THREE.Mesh(new THREE.BoxGeometry(chimW, chimH, chimW), stoneMat);
    chim.position.set(w * 0.42, chimH / 2, 0);
    chim.castShadow = true;
    g.add(chim);
    const chimCap = new THREE.Mesh(
        new THREE.BoxGeometry(chimW + 0.25, 0.18, chimW + 0.25), stoneMat
    );
    chimCap.position.set(w * 0.42, chimH + 0.09, 0);
    g.add(chimCap);

    // === MEDIEVAL INTERIOR (randomized, properly sized + positioned) ===
    // All y-coords use F = 0.18 (floor level above group origin)
    const F = 0.18;
    const iWood   = new THREE.MeshLambertMaterial({ color: 0x5a3818 });
    const iWoodDk = new THREE.MeshLambertMaterial({ color: 0x3a2210 });
    const iStone  = new THREE.MeshLambertMaterial({ color: 0x5a5550, flatShading: true });
    const iIron   = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
    const iStraw  = new THREE.MeshLambertMaterial({ color: 0xb8a060 });
    const iLinen  = new THREE.MeshLambertMaterial({ color: 0xc8bca0 });
    const iHide   = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
    const iWhite  = new THREE.MeshLambertMaterial({ color: 0xe8e0d0 });
    const iTan    = new THREE.MeshLambertMaterial({ color: 0xb89868 });
    const iRed    = new THREE.MeshLambertMaterial({ color: 0x8a2020 });
    const iGold   = new THREE.MeshLambertMaterial({ color: 0xd4af37 });
    const iEmber  = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    const iGreen  = new THREE.MeshLambertMaterial({ color: 0x4a8a3a });
    const iBlack  = new THREE.MeshLambertMaterial({ color: 0x080808 });
    // Interior half-dims (for safe positioning inside walls)
    const iw = w / 2 - wallT - 0.6;  // safe x range: [-iw, +iw]
    const id = d / 2 - wallT - 0.6;  // safe z range: [-id, +id]

    if (!houseType) {
    // --- Default randomized interior (no type assigned) ---

    // Fireplace — always, centered on back wall (the wall at -Z)
    {
        const fpW = 1.4, fpH = 1.3, fpD = 0.6;
        const fpZ = -id + fpD / 2;
        const fp = new THREE.Mesh(new THREE.BoxGeometry(fpW, fpH, fpD), iStone);
        fp.position.set(0, F + fpH / 2, fpZ); g.add(fp);
        const hole = new THREE.Mesh(new THREE.BoxGeometry(fpW * 0.55, fpH * 0.6, fpD + 0.1),
            new THREE.MeshLambertMaterial({ color: 0x080808 }));
        hole.position.set(0, F + fpH * 0.28, fpZ + 0.05); g.add(hole);
        // Mantle beam
        const mantle = new THREE.Mesh(new THREE.BoxGeometry(fpW + 0.3, 0.1, fpD + 0.12), iWood);
        mantle.position.set(0, F + fpH + 0.05, fpZ); g.add(mantle);
        // Iron pot hanging in the fireplace
        const pot = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), iIron);
        pot.scale.set(1, 0.7, 1);
        pot.position.set(0, F + 0.22, fpZ + 0.15); g.add(pot);
        const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 5), iIron);
        hook.position.set(0, F + fpH * 0.5, fpZ + 0.15); g.add(hook);
    }

    // Rough-hewn trestle table + benches — 80%
    if (Math.random() < 0.8) {
        const tX = rand(-iw * 0.3, iw * 0.3);
        const tZ = rand(-id * 0.15, id * 0.25);
        const tw = 1.6, td = 0.8, th = 0.72;
        // Top plank
        const top = new THREE.Mesh(new THREE.BoxGeometry(tw, 0.07, td), iWood);
        top.position.set(tX, F + th, tZ); g.add(top);
        // Trestle legs (X-frame)
        for (const tx of [-1, 1]) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, th, td * 0.8), iWoodDk);
            leg.position.set(tX + tx * (tw / 2 - 0.12), F + th / 2, tZ); g.add(leg);
            const brace = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, td * 0.6), iWoodDk);
            brace.position.set(tX + tx * (tw / 2 - 0.12), F + th * 0.3, tZ); g.add(brace);
        }
        // Two benches (one each side)
        for (const bz of [-1, 1]) {
            const bench = new THREE.Mesh(new THREE.BoxGeometry(tw * 0.85, 0.06, 0.28), iWood);
            bench.position.set(tX, F + 0.42, tZ + bz * (td / 2 + 0.3)); g.add(bench);
            for (const bx of [-1, 1]) {
                const bleg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.06), iWoodDk);
                bleg.position.set(tX + bx * (tw * 0.35), F + 0.21, tZ + bz * (td / 2 + 0.3));
                g.add(bleg);
            }
        }
        // Pottery on table
        for (let pi = 0; pi < 2; pi++) {
            const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.1, 8),
                new THREE.MeshLambertMaterial({ color: 0x8a6a40 }));
            mug.position.set(tX + rand(-0.4, 0.4), F + th + 0.09, tZ + rand(-0.2, 0.2));
            g.add(mug);
        }
    }

    // Straw bed against a side wall — 90%
    if (Math.random() < 0.9) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const bX = side * (iw - 0.55);
        const bZ = rand(-id * 0.4, -id * 0.05); // toward back, away from door
        // Low wooden frame
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.28, 1.9), iWoodDk);
        frame.position.set(bX, F + 0.14, bZ); g.add(frame);
        // Straw mattress (yellowish, lumpy-looking)
        const matt = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 1.75), iStraw);
        matt.position.set(bX, F + 0.34, bZ); g.add(matt);
        // Rough linen pillow
        const pill = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.09, 0.28), iLinen);
        pill.position.set(bX, F + 0.44, bZ - 0.65); g.add(pill);
        // Blanket / animal hide draped over the end
        const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.7), iHide);
        blanket.position.set(bX, F + 0.40, bZ + 0.5); g.add(blanket);
    }

    // Barrel(s) in a corner — 60%
    if (Math.random() < 0.6) {
        const nBarrels = 1 + (Math.random() * 2 | 0);
        const bSide = Math.random() < 0.5 ? -1 : 1;
        for (let bi = 0; bi < nBarrels; bi++) {
            const bx = bSide * (iw - 0.25 - bi * 0.55);
            const bz = id - 0.4;  // near front wall, away from fireplace
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.6, 12), iWood);
            barrel.position.set(bx, F + 0.3, bz); g.add(barrel);
            for (const by of [-0.15, 0.15]) {
                const band = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.012, 6, 16), iIron);
                band.rotation.x = Math.PI / 2;
                band.position.set(bx, F + 0.3 + by, bz); g.add(band);
            }
        }
    }

    // Wall shelf with clay pots — 70%
    if (Math.random() < 0.7) {
        const sSide = Math.random() < 0.5 ? -1 : 1;
        const sY = F + rand(1.4, 1.8);
        const sZ = rand(-id * 0.3, id * 0.2);
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 1.2), iWood);
        shelf.position.set(sSide * (iw + 0.05), sY, sZ); g.add(shelf);
        // Iron brackets
        for (const bz of [-0.4, 0.4]) {
            const brk = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.04), iIron);
            brk.position.set(sSide * (iw + 0.02), sY - 0.08, sZ + bz); g.add(brk);
        }
        // Items
        for (let si = 0; si < 3; si++) {
            const jar = new THREE.Mesh(
                new THREE.CylinderGeometry(0.05, 0.04, rand(0.10, 0.18), 8),
                new THREE.MeshLambertMaterial({ color: [0x8a6a38, 0x706050, 0x5a4a3a][si] })
            );
            jar.position.set(sSide * (iw + 0.05), sY + 0.08, sZ + (si - 1) * 0.32);
            g.add(jar);
        }
    }

    // Woven rush mat on the floor — 50%
    if (Math.random() < 0.5) {
        const mat = new THREE.Mesh(
            new THREE.PlaneGeometry(rand(1.4, 2.0), rand(1.0, 1.5)),
            new THREE.MeshLambertMaterial({ color: 0x8a7a48, side: THREE.DoubleSide })
        );
        mat.rotation.x = -Math.PI / 2;
        mat.position.set(rand(-iw * 0.2, iw * 0.2), F + 0.01, rand(-id * 0.1, id * 0.15));
        g.add(mat);
    }

    // Candle holder on wall — 80%
    if (Math.random() < 0.8) {
        for (const sz of [-1, 1]) {
            if (Math.random() < 0.4) continue;
            const cy = F + rand(1.6, 2.2);
            const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.04), iIron);
            bracket.position.set(sz * (iw + 0.05), cy, rand(-id * 0.3, id * 0.3));
            g.add(bracket);
            const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 6),
                new THREE.MeshLambertMaterial({ color: 0xe8d8a0 }));
            candle.position.set(bracket.position.x - sz * 0.08, cy + 0.08, bracket.position.z);
            g.add(candle);
            // Tiny flame
            const flame = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.04, 5),
                new THREE.MeshBasicMaterial({ color: 0xffa020 }));
            flame.position.set(candle.position.x, cy + 0.16, bracket.position.z);
            g.add(flame);
        }
    }

    } else {
    // === TYPE-SPECIFIC INTERIORS ===
    switch (houseType) {
    case 'blacksmith': {
        // Stone forge against back wall (larger than fireplace, with glowing ember)
        const fgW = 2.0, fgH = 1.6, fgD = 0.8;
        const fgZ = -id + fgD / 2;
        const forge = new THREE.Mesh(new THREE.BoxGeometry(fgW, fgH, fgD), iStone);
        forge.position.set(0, F + fgH / 2, fgZ); g.add(forge);
        const fgHole = new THREE.Mesh(new THREE.BoxGeometry(fgW * 0.5, fgH * 0.5, fgD + 0.1), iBlack);
        fgHole.position.set(0, F + fgH * 0.3, fgZ + 0.05); g.add(fgHole);
        const ember = new THREE.Mesh(new THREE.BoxGeometry(fgW * 0.35, 0.1, fgD * 0.4), iEmber);
        ember.position.set(0, F + 0.15, fgZ + 0.1); g.add(ember);
        const fgMantle = new THREE.Mesh(new THREE.BoxGeometry(fgW + 0.3, 0.12, fgD + 0.12), iWood);
        fgMantle.position.set(0, F + fgH + 0.06, fgZ); g.add(fgMantle);

        // Anvil on a stump, center-left
        const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.5, 10), iWoodDk);
        stump.position.set(-iw * 0.4, F + 0.25, 0); g.add(stump);
        const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.25),
            new THREE.MeshLambertMaterial({ color: 0x2a2a2a }));
        anvil.position.set(-iw * 0.4, F + 0.59, 0); g.add(anvil);

        // Weapon rack on side wall (vertical board + 3 tilted swords)
        const rack = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 1.0), iWoodDk);
        rack.position.set(iw, F + 1.0, 0); g.add(rack);
        for (let si = 0; si < 3; si++) {
            const sw = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.04), iIron);
            sw.position.set(iw - 0.15, F + 1.1, -0.3 + si * 0.3);
            sw.rotation.z = 0.3;
            g.add(sw);
        }

        // Water trough (open box)
        const troughOuter = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 0.5), iWoodDk);
        troughOuter.position.set(iw * 0.5, F + 0.2, id * 0.5); g.add(troughOuter);
        const troughInner = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.35, 0.35),
            new THREE.MeshLambertMaterial({ color: 0x16323a }));
        troughInner.position.set(iw * 0.5, F + 0.25, id * 0.5); g.add(troughInner);

        // Coal pile (cluster of dark spheres)
        for (let ci = 0; ci < 6; ci++) {
            const coal = new THREE.Mesh(new THREE.SphereGeometry(rand(0.06, 0.1), 6, 5),
                new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
            coal.position.set(rand(-0.3, 0.3), F + rand(0.02, 0.1), fgZ + fgD + rand(0.2, 0.6));
            g.add(coal);
        }

        // Iron ingot stack
        for (let ii = 0; ii < 4; ii++) {
            const ingot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.08), iIron);
            ingot.position.set(-iw * 0.7, F + 0.03 + ii * 0.065, -id * 0.4 + rand(-0.05, 0.05));
            g.add(ingot);
        }
        break;
    }
    case 'farmer': {
        // Simple hearth (smaller fireplace)
        const hW = 1.0, hH = 1.0, hD = 0.5;
        const hZ = -id + hD / 2;
        const hearth = new THREE.Mesh(new THREE.BoxGeometry(hW, hH, hD), iStone);
        hearth.position.set(0, F + hH / 2, hZ); g.add(hearth);
        const hHole = new THREE.Mesh(new THREE.BoxGeometry(hW * 0.5, hH * 0.5, hD + 0.1), iBlack);
        hHole.position.set(0, F + hH * 0.25, hZ + 0.05); g.add(hHole);

        // Grain sacks (tan cylinders with rounded tops)
        for (let si = 0; si < 4; si++) {
            const sack = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.5, 8), iTan);
            sack.position.set(-iw * 0.6 + si * 0.5, F + 0.25, -id * 0.3);
            g.add(sack);
            const sackTop = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), iTan);
            sackTop.scale.y = 0.4;
            sackTop.position.set(-iw * 0.6 + si * 0.5, F + 0.5, -id * 0.3);
            g.add(sackTop);
        }

        // Pitchfork leaning against wall
        const pfHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 6), iWoodDk);
        pfHandle.position.set(iw - 0.1, F + 0.8, -id * 0.5);
        pfHandle.rotation.z = 0.15;
        g.add(pfHandle);
        for (let ti = 0; ti < 3; ti++) {
            const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.25, 4), iIron);
            tine.position.set(iw - 0.18, F + 1.6, -id * 0.5 + (ti - 1) * 0.04);
            g.add(tine);
        }

        // Simple straw bed
        const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 1.8), iWoodDk);
        bedFrame.position.set(iw - 0.6, F + 0.11, id * 0.3); g.add(bedFrame);
        const bedMatt = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.1, 1.65), iStraw);
        bedMatt.position.set(iw - 0.6, F + 0.27, id * 0.3); g.add(bedMatt);

        // Root vegetables on table
        const tblTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.7), iWood);
        tblTop.position.set(0, F + 0.72, 0); g.add(tblTop);
        for (const tx of [-1, 1]) {
            const tLeg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.06), iWoodDk);
            tLeg.position.set(tx * 0.5, F + 0.36, 0); g.add(tLeg);
        }
        const vegColors = [0x8a5a2a, 0xd4702a, 0x8a5a2a, 0xd4702a];
        for (let vi = 0; vi < 4; vi++) {
            const veg = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5),
                new THREE.MeshLambertMaterial({ color: vegColors[vi] }));
            veg.position.set(rand(-0.35, 0.35), F + 0.8, rand(-0.15, 0.15));
            g.add(veg);
        }

        // Dried herbs hanging from ceiling beams
        for (let hi = 0; hi < 5; hi++) {
            const herb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), iGreen);
            herb.position.set(rand(-iw * 0.5, iw * 0.5), F + wh - 0.6, rand(-id * 0.3, id * 0.3));
            g.add(herb);
            const hStr = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.3, 4), iWoodDk);
            hStr.position.set(herb.position.x, F + wh - 0.4, herb.position.z);
            g.add(hStr);
        }
        break;
    }
    case 'baker': {
        // Large stone oven with dome shape (half sphere)
        const ovenW = 1.6, ovenH = 1.4, ovenD = 0.9;
        const ovenZ = -id + ovenD / 2;
        const ovenBase = new THREE.Mesh(new THREE.BoxGeometry(ovenW, ovenH * 0.6, ovenD), iStone);
        ovenBase.position.set(0, F + ovenH * 0.3, ovenZ); g.add(ovenBase);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(ovenW * 0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), iStone);
        dome.position.set(0, F + ovenH * 0.6, ovenZ); g.add(dome);
        const ovenHole = new THREE.Mesh(new THREE.BoxGeometry(ovenW * 0.35, ovenH * 0.35, ovenD + 0.1), iBlack);
        ovenHole.position.set(0, F + ovenH * 0.25, ovenZ + 0.05); g.add(ovenHole);
        const ovenEmber = new THREE.Mesh(new THREE.BoxGeometry(ovenW * 0.25, 0.06, ovenD * 0.3), iEmber);
        ovenEmber.position.set(0, F + 0.1, ovenZ + 0.08); g.add(ovenEmber);

        // Kneading table with dough
        const kTbl = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.8), iWood);
        kTbl.position.set(-iw * 0.3, F + 0.72, 0.2); g.add(kTbl);
        for (const tx of [-1, 1]) {
            const kLeg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.06), iWoodDk);
            kLeg.position.set(-iw * 0.3 + tx * 0.6, F + 0.36, 0.2); g.add(kLeg);
        }
        const dough = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), iWhite);
        dough.scale.set(1, 0.5, 1);
        dough.position.set(-iw * 0.3, F + 0.82, 0.2); g.add(dough);

        // Bread loaves on shelf
        const bShelf = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 1.0), iWood);
        bShelf.position.set(iw, F + 1.4, 0); g.add(bShelf);
        for (let bi = 0; bi < 4; bi++) {
            const loaf = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8),
                new THREE.MeshLambertMaterial({ color: 0x8a5a20 }));
            loaf.rotation.x = Math.PI / 2;
            loaf.position.set(iw - 0.02, F + 1.5, -0.3 + bi * 0.2);
            g.add(loaf);
        }

        // Flour sacks (white cylinders)
        for (let fi = 0; fi < 3; fi++) {
            const flour = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.55, 8), iWhite);
            flour.position.set(iw * 0.5 + fi * 0.5, F + 0.28, id * 0.4);
            g.add(flour);
        }

        // Hanging dried meats from ceiling
        for (let mi = 0; mi < 3; mi++) {
            const meat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.06),
                new THREE.MeshLambertMaterial({ color: 0x6a2a1a }));
            meat.position.set(rand(-iw * 0.4, iw * 0.4), F + wh - 0.5, rand(-id * 0.2, id * 0.2));
            g.add(meat);
            const mStr = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.35, 4), iIron);
            mStr.position.set(meat.position.x, F + wh - 0.2, meat.position.z);
            g.add(mStr);
        }
        break;
    }
    case 'chief': {
        // Grand fireplace (wider)
        const gfW = 2.2, gfH = 1.6, gfD = 0.7;
        const gfZ = -id + gfD / 2;
        const gfp = new THREE.Mesh(new THREE.BoxGeometry(gfW, gfH, gfD), iStone);
        gfp.position.set(0, F + gfH / 2, gfZ); g.add(gfp);
        const gfHole = new THREE.Mesh(new THREE.BoxGeometry(gfW * 0.5, gfH * 0.55, gfD + 0.1), iBlack);
        gfHole.position.set(0, F + gfH * 0.3, gfZ + 0.05); g.add(gfHole);
        const gfMantle = new THREE.Mesh(new THREE.BoxGeometry(gfW + 0.4, 0.12, gfD + 0.14), iWood);
        gfMantle.position.set(0, F + gfH + 0.06, gfZ); g.add(gfMantle);

        // Long feast table with benches
        const ftW = 3.0, ftD2 = 0.9, ftH = 0.74;
        const ftTop = new THREE.Mesh(new THREE.BoxGeometry(ftW, 0.08, ftD2), iWood);
        ftTop.position.set(0, F + ftH, 0.3); g.add(ftTop);
        for (const tx of [-1, 0, 1]) {
            const ftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.1, ftH, 0.1), iWoodDk);
            ftLeg.position.set(tx * (ftW / 2 - 0.2), F + ftH / 2, 0.3); g.add(ftLeg);
        }
        for (const bz of [-1, 1]) {
            const bench = new THREE.Mesh(new THREE.BoxGeometry(ftW * 0.85, 0.06, 0.28), iWood);
            bench.position.set(0, F + 0.42, 0.3 + bz * (ftD2 / 2 + 0.3)); g.add(bench);
            for (const bx of [-1, 1]) {
                const bLeg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.06), iWoodDk);
                bLeg.position.set(bx * (ftW * 0.38), F + 0.21, 0.3 + bz * (ftD2 / 2 + 0.3));
                g.add(bLeg);
            }
        }

        // Throne chair at head of table
        const throneBack = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.6, 0.08), iWoodDk);
        throneBack.position.set(-ftW / 2 - 0.5, F + 0.8, 0.3); g.add(throneBack);
        const throneSeat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.45), iWoodDk);
        throneSeat.position.set(-ftW / 2 - 0.5, F + 0.45, 0.32); g.add(throneSeat);
        for (const az of [-1, 1]) {
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.4), iWoodDk);
            arm.position.set(-ftW / 2 - 0.5 + az * 0.25, F + 0.6, 0.32); g.add(arm);
        }

        // Animal pelts on walls (flat fur-colored boxes)
        for (const sx of [-1, 1]) {
            const pelt = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, 1.2), iHide);
            pelt.position.set(sx * (iw + 0.02), F + 1.5, rand(-id * 0.2, id * 0.2));
            g.add(pelt);
        }

        // Iron chandelier (ring + candle cylinders)
        const chandRing = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 6, 16), iIron);
        chandRing.rotation.x = Math.PI / 2;
        chandRing.position.set(0, F + wh - 0.8, 0.3); g.add(chandRing);
        for (let ci = 0; ci < 6; ci++) {
            const ang = (ci / 6) * Math.PI * 2;
            const cc = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 6),
                new THREE.MeshLambertMaterial({ color: 0xe8d8a0 }));
            cc.position.set(Math.cos(ang) * 0.48, F + wh - 0.68, 0.3 + Math.sin(ang) * 0.48);
            g.add(cc);
            const cf = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.04, 5),
                new THREE.MeshBasicMaterial({ color: 0xffa020 }));
            cf.position.set(cc.position.x, cc.position.y + 0.08, cc.position.z);
            g.add(cf);
        }
        const chandChain = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.0, 4), iIron);
        chandChain.position.set(0, F + wh - 0.3, 0.3); g.add(chandChain);

        // Treasure chest
        const chest = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.4), iWoodDk);
        chest.position.set(iw * 0.6, F + 0.18, -id * 0.5); g.add(chest);
        const chestLid = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.42),
            new THREE.MeshLambertMaterial({ color: 0x4a3018 }));
        chestLid.position.set(iw * 0.6, F + 0.38, -id * 0.5); g.add(chestLid);
        // Gold trim on chest
        for (const bz of [-1, 1]) {
            const trim = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.02), iGold);
            trim.position.set(iw * 0.6, F + 0.25, -id * 0.5 + bz * 0.2);
            g.add(trim);
        }
        break;
    }
    case 'librarian': {
        // Bookshelves on 2 walls
        for (const sx of [-1, 1]) {
            // Shelf boards
            for (let row = 0; row < 3; row++) {
                const shelfY = F + 0.6 + row * 0.55;
                const sb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 1.6), iWood);
                sb.position.set(sx * (iw + 0.02), shelfY, -id * 0.2); g.add(sb);
                // Books (thin multicolored boxes)
                const bookColors = [0x8a2020, 0x2a4a2a, 0x2a2a6a, 0x6a4a1a, 0x3a1a2a, 0x1a3a4a];
                for (let bi = 0; bi < 6; bi++) {
                    const book = new THREE.Mesh(new THREE.BoxGeometry(0.14, rand(0.22, 0.38), 0.06),
                        new THREE.MeshLambertMaterial({ color: bookColors[bi % bookColors.length] }));
                    book.position.set(sx * (iw - 0.02), shelfY + rand(0.12, 0.2), -id * 0.2 - 0.55 + bi * 0.2);
                    g.add(book);
                }
            }
        }

        // Writing desk with candle + quill + book
        const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.6), iWood);
        deskTop.position.set(0, F + 0.72, id * 0.3); g.add(deskTop);
        for (const tx of [-1, 1]) {
            const dLeg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.06), iWoodDk);
            dLeg.position.set(tx * 0.42, F + 0.36, id * 0.3); g.add(dLeg);
        }
        // Candle on desk
        const dCandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 6),
            new THREE.MeshLambertMaterial({ color: 0xe8d8a0 }));
        dCandle.position.set(0.3, F + 0.82, id * 0.3); g.add(dCandle);
        const dFlame = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 5),
            new THREE.MeshBasicMaterial({ color: 0xffa020 }));
        dFlame.position.set(0.3, F + 0.92, id * 0.3); g.add(dFlame);
        // Book on desk
        const openBook = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.03, 0.18),
            new THREE.MeshLambertMaterial({ color: 0x6a4a1a }));
        openBook.position.set(-0.1, F + 0.78, id * 0.3); g.add(openBook);
        // Quill
        const quill = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.002, 0.2, 4), iWhite);
        quill.rotation.z = 0.5;
        quill.position.set(0.1, F + 0.8, id * 0.3 + 0.1); g.add(quill);

        // Scroll rack
        const scrollShelf = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.8), iWood);
        scrollShelf.position.set(0, F + 1.5, -id + 0.2); g.add(scrollShelf);
        for (let si = 0; si < 4; si++) {
            const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 8), iLinen);
            scroll.rotation.x = Math.PI / 2;
            scroll.position.set(0, F + 1.58, -id + 0.2 - 0.2 + si * 0.15);
            g.add(scroll);
        }

        // Simple cot
        const cot = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 1.6), iWoodDk);
        cot.position.set(0, F + 0.1, -id * 0.5); g.add(cot);
        const cotMatt = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 1.5), iLinen);
        cotMatt.position.set(0, F + 0.24, -id * 0.5); g.add(cotMatt);

        // Small brazier instead of fireplace (iron cylinder with ember glow)
        const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.4, 10), iIron);
        brazier.position.set(iw * 0.5, F + 0.2, -id * 0.1); g.add(brazier);
        const brazierGlow = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), iEmber);
        brazierGlow.position.set(iw * 0.5, F + 0.42, -id * 0.1); g.add(brazierGlow);
        break;
    }
    case 'guard': {
        // Weapon rack (2-3 swords + a shield)
        const wRack = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 1.0), iWoodDk);
        wRack.position.set(-iw, F + 1.0, -id * 0.3); g.add(wRack);
        for (let si = 0; si < 3; si++) {
            const sw = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.75, 0.04), iIron);
            sw.position.set(-iw + 0.15, F + 1.1, -id * 0.3 - 0.3 + si * 0.3);
            sw.rotation.z = -0.2;
            g.add(sw);
        }
        // Shield on wall (circle mesh)
        const shieldGeo = new THREE.CircleGeometry(0.3, 16);
        const shield1 = new THREE.Mesh(shieldGeo, new THREE.MeshLambertMaterial({ color: 0x8a2020, side: THREE.DoubleSide }));
        shield1.position.set(-iw + 0.02, F + 1.8, id * 0.2);
        shield1.rotation.y = Math.PI / 2;
        g.add(shield1);

        // Armor stand (T-shaped post with chestplate box)
        const aPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), iWoodDk);
        aPost.position.set(iw * 0.4, F + 0.7, -id * 0.4); g.add(aPost);
        const aCross = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.06), iWoodDk);
        aCross.position.set(iw * 0.4, F + 1.3, -id * 0.4); g.add(aCross);
        const aChest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.2), iIron);
        aChest.position.set(iw * 0.4, F + 1.0, -id * 0.4); g.add(aChest);

        // Narrow cot
        const gCot = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 1.5), iWoodDk);
        gCot.position.set(iw * 0.6, F + 0.1, id * 0.3); g.add(gCot);
        const gMatt = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 1.4), iStraw);
        gMatt.position.set(iw * 0.6, F + 0.24, id * 0.3); g.add(gMatt);

        // Simple fireplace
        const sfW = 1.2, sfH = 1.1, sfD = 0.5;
        const sfZ = -id + sfD / 2;
        const sfp = new THREE.Mesh(new THREE.BoxGeometry(sfW, sfH, sfD), iStone);
        sfp.position.set(0, F + sfH / 2, sfZ); g.add(sfp);
        const sfHole = new THREE.Mesh(new THREE.BoxGeometry(sfW * 0.5, sfH * 0.5, sfD + 0.1), iBlack);
        sfHole.position.set(0, F + sfH * 0.25, sfZ + 0.05); g.add(sfHole);

        // Lantern hanging from ceiling (box frame with yellow emissive sphere)
        const lanFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.12), iIron);
        lanFrame.position.set(0, F + wh - 0.6, 0); g.add(lanFrame);
        const lanGlow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6),
            new THREE.MeshBasicMaterial({ color: 0xffcc44 }));
        lanGlow.position.set(0, F + wh - 0.6, 0); g.add(lanGlow);
        const lanChain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.6, 4), iIron);
        lanChain.position.set(0, F + wh - 0.3, 0); g.add(lanChain);

        // Shield on wall 2
        const shield2 = new THREE.Mesh(new THREE.CircleGeometry(0.25, 16),
            new THREE.MeshLambertMaterial({ color: 0x2a4a6a, side: THREE.DoubleSide }));
        shield2.position.set(iw - 0.02, F + 1.6, -id * 0.1);
        shield2.rotation.y = -Math.PI / 2;
        g.add(shield2);
        break;
    }
    } // end switch
    } // end if/else houseType

    // Anchor at the LOWEST visible ground in the footprint, so the
    // flatten only ever cuts hills DOWN into the slope (no plateau).
    const sampleR = Math.max(w, d) * 0.7;
    let anchorY = Infinity;
    for (let a = 0; a < 9; a++) {
        const ang = (a / 9) * Math.PI * 2;
        const sxp = x + Math.cos(ang) * sampleR;
        const szp = z + Math.sin(ang) * sampleR;
        const yh = sampleGroundY(sxp, szp);
        if (yh < anchorY) anchorY = yh;
    }
    const cy = sampleGroundY(x, z);
    if (cy < anchorY) anchorY = cy;
    const footprintR = Math.max(w, d) * 1.6 + 6;
    flattenAt(x, z, footprintR, anchorY);
    _terrainEdited = true;
    g.position.set(x, anchorY, z);
    g.rotation.y = rotY;
    propRoot.add(g);

    houseColliders.push({
        x, z, rot: rotY,
        w, d, wallT, doorW, doorH, anchorY,
        doorPivot, doorOpen: false, doorAng: 0,
    });
}

function buildWell(x, z) {
    const g = new THREE.Group();
    const stoneMat  = new THREE.MeshLambertMaterial({ color: 0x7a7670, flatShading: true });
    const stoneDark = new THREE.MeshLambertMaterial({ color: 0x4f4a44, flatShading: true });
    const woodMat   = new THREE.MeshLambertMaterial({ color: 0x4a2f18 });
    const woodDark  = new THREE.MeshLambertMaterial({ color: 0x2c1a0c });
    const thatchMat = new THREE.MeshLambertMaterial({ color: 0xb8862c });
    const thatchEdgeMat = new THREE.MeshLambertMaterial({ color: 0x7d5a18 });
    const waterMat  = new THREE.MeshLambertMaterial({ color: 0x16323a });

    const wellR = 1.4;
    const wellH = 1.2;
    // Stone ring (cylinder, slightly tapered)
    const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(wellR, wellR + 0.1, wellH, 16),
        stoneMat
    );
    ring.position.y = wellH / 2;
    ring.castShadow = true; ring.receiveShadow = true;
    g.add(ring);
    // Decorative individual stones around the rim
    for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        const stone = new THREE.Mesh(
            new THREE.BoxGeometry(0.42, 0.36, 0.32),
            Math.random() < 0.5 ? stoneMat : stoneDark
        );
        stone.position.set(
            Math.cos(ang) * (wellR + 0.05),
            wellH + 0.18,
            Math.sin(ang) * (wellR + 0.05)
        );
        stone.rotation.y = ang;
        g.add(stone);
    }
    // Inner shaft (dark hole)
    const inner = new THREE.Mesh(
        new THREE.CylinderGeometry(wellR - 0.18, wellR - 0.18, 0.05, 16),
        new THREE.MeshLambertMaterial({ color: 0x05080a })
    );
    inner.position.y = wellH + 0.02;
    g.add(inner);
    // Water surface a little below the rim
    const water = new THREE.Mesh(
        new THREE.CylinderGeometry(wellR - 0.22, wellR - 0.22, 0.02, 16),
        waterMat
    );
    water.position.y = wellH - 0.4;
    g.add(water);

    // === Two posts holding up the roof + winch ===
    const postH = 3.2;
    for (const sx of [-1, 1]) {
        const post = new THREE.Mesh(
            new THREE.BoxGeometry(0.22, postH, 0.22),
            woodMat
        );
        post.position.set(sx * (wellR + 0.05), wellH + postH / 2, 0);
        post.castShadow = true;
        g.add(post);
    }

    // === Pitched roof: two slabs meeting at the ridge ===
    const wellRoofH = 1.1;
    const wellRoofRun = wellR + 0.6;
    const wellSlopeLen = Math.sqrt(wellRoofRun * wellRoofRun + wellRoofH * wellRoofH);
    const wellAng = Math.atan2(wellRoofH, wellRoofRun);
    const ridgeY = wellH + postH + 0.2;
    const slopeW = (wellR + 0.6) * 2 + 0.2;
    // Front slope (covers +Z half) — ridge edge at -Z, eave at +Z
    const slopeF = new THREE.Mesh(
        new THREE.BoxGeometry(slopeW, 0.18, wellSlopeLen + 0.2),
        thatchMat
    );
    slopeF.position.set(0, ridgeY - wellRoofH / 2, wellRoofRun / 2);
    slopeF.rotation.x = wellAng;
    slopeF.castShadow = true;
    g.add(slopeF);
    const slopeB = slopeF.clone();
    slopeB.position.z = -wellRoofRun / 2;
    slopeB.rotation.x = -wellAng;
    g.add(slopeB);
    // Ridge cap
    const wellRidge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, slopeW + 0.05, 8),
        thatchEdgeMat
    );
    wellRidge.rotation.z = Math.PI / 2;
    wellRidge.position.set(0, ridgeY, 0);
    g.add(wellRidge);

    // === Winch: horizontal log spanning the posts, with a crank handle ===
    const winchY = wellH + postH - 0.3;
    const winch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, (wellR + 0.05) * 2 - 0.1, 10),
        woodMat
    );
    winch.rotation.z = Math.PI / 2;
    winch.position.set(0, winchY, 0);
    winch.castShadow = true;
    g.add(winch);
    // Crank arm
    const crank = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.4, 0.05),
        woodDark
    );
    crank.position.set((wellR + 0.05) - 0.05, winchY - 0.2, 0);
    g.add(crank);
    // Crank handle
    const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.25, 6),
        woodDark
    );
    handle.rotation.z = Math.PI / 2;
    handle.position.set((wellR + 0.05) + 0.1, winchY - 0.4, 0);
    g.add(handle);

    // === Rope hanging from the winch down toward the water ===
    const ropeMat = new THREE.MeshLambertMaterial({ color: 0xc8b078 });
    const ropeLen = winchY - (wellH + 0.6);
    const rope = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, ropeLen, 5),
        ropeMat
    );
    rope.position.set(0, winchY - ropeLen / 2, 0);
    g.add(rope);

    // === Wooden bucket hanging at the bottom of the rope ===
    const bucket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.22, 0.36, 12),
        woodMat
    );
    bucket.position.set(0, winchY - ropeLen - 0.18, 0);
    bucket.castShadow = true;
    g.add(bucket);
    // Bucket bands
    for (const yo of [-0.12, 0.12]) {
        const band = new THREE.Mesh(
            new THREE.TorusGeometry(0.27, 0.018, 6, 16),
            woodDark
        );
        band.rotation.x = Math.PI / 2;
        band.position.set(0, winchY - ropeLen - 0.18 + yo, 0);
        g.add(band);
    }
    // Bucket handle
    const bhandle = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.012, 5, 12, Math.PI),
        woodDark
    );
    bhandle.position.set(0, winchY - ropeLen, 0);
    g.add(bhandle);

    let wellAnchor = sampleGroundY(x, z);
    // Sample around the rim and use the LOWEST so the well is never elevated
    for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        const yh = sampleGroundY(x + Math.cos(ang) * 3, z + Math.sin(ang) * 3);
        if (yh < wellAnchor) wellAnchor = yh;
    }
    flattenAt(x, z, 20.0, wellAnchor);
    _terrainEdited = true;
    g.position.set(x, wellAnchor, z);
    propRoot.add(g);
    houseColliders.push({ x, z, hw: 2.2, hd: 2.2, rot: 0 });
}

// ----- Dirt path: carve directly into the terrain mesh -----
// Path width must be >> CELL (≈5m) so that multiple vertices always fall
// within it; otherwise the path is invisible between grid points.
const DIRT  = new THREE.Color(0x705028);
const DIRT2 = new THREE.Color(0x553a1a);
function carvePath(x1, z1, x2, z2, halfWidth, depth) {
    halfWidth = halfWidth || 6.5;
    depth     = depth     || 0.45;
    const pos = groundGeo.attributes.position;
    const col = groundGeo.attributes.color;
    const stride = SEG + 1;
    const dx = x2 - x1, dz = z2 - z1;
    const lenSq = dx * dx + dz * dz;
    if (lenSq < 0.01) return;
    const minX = Math.min(x1, x2) - halfWidth - CELL;
    const maxX = Math.max(x1, x2) + halfWidth + CELL;
    const minZ = Math.min(z1, z2) - halfWidth - CELL;
    const maxZ = Math.max(z1, z2) + halfWidth + CELL;
    const i0 = Math.max(0,   Math.floor((minX + WORLD / 2) / CELL));
    const i1 = Math.min(SEG, Math.ceil( (maxX + WORLD / 2) / CELL));
    const j0 = Math.max(0,   Math.floor((minZ + WORLD / 2) / CELL));
    const j1 = Math.min(SEG, Math.ceil( (maxZ + WORLD / 2) / CELL));
    for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
            const vx = -WORLD / 2 + i * CELL;
            const vz = -WORLD / 2 + j * CELL;
            const t = Math.max(0, Math.min(1,
                ((vx - x1) * dx + (vz - z1) * dz) / lenSq));
            const px = x1 + dx * t, pz = z1 + dz * t;
            const d = Math.hypot(vx - px, vz - pz);
            if (d > halfWidth) continue;
            const idx = j * stride + i;
            const u = d / halfWidth;          // 0 center -> 1 edge
            const fade = 1 - u * u;            // sharper at center
            pos.setY(idx, pos.getY(idx) - depth * fade);
            // Solid dirt at center, blends to surrounding biome at edge
            const target = u < 0.5 ? DIRT2 : DIRT;
            const k = u < 0.7 ? 1 : (1 - (u - 0.7) / 0.3);
            const r = col.getX(idx) * (1 - k) + target.r * k;
            const gC = col.getY(idx) * (1 - k) + target.g * k;
            const b = col.getZ(idx) * (1 - k) + target.b * k;
            col.setXYZ(idx, r, gC, b);
        }
    }
}

let _terrainEdited = false;

// Continuous dirt path ribbon. Builds one BufferGeometry strip whose
// left and right edges hug the terrain via sampleGroundY at every step.
// No gaps, no overlaps, follows hills smoothly. Vertex-colored with
// hash-based variation so it reads as dirt rather than a flat slab.
const PATH_DIRT_A = new THREE.Color(0x6c4823);
const PATH_DIRT_B = new THREE.Color(0x4a3014);
const pathMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
function buildPath(x1, z1, x2, z2, halfWidth) {
    halfWidth = halfWidth || 2.2;
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.5) return;
    const ux = dx / len, uz = dz / len;
    const nx = -uz, nz = ux;
    const step = 0.7;
    const n = Math.max(2, Math.ceil(len / step));
    const verts  = [];
    const colors = [];
    const idx    = [];
    // Simple top-only ribbon, 2 verts per step, hugging the ground
    for (let i = 0; i <= n; i++) {
        const t = i / n;
        const wobble = Math.sin(i * 0.45) * 0.22;
        const cxw = x1 + dx * t + nx * wobble;
        const czw = z1 + dz * t + nz * wobble;
        const w = halfWidth * (0.92 + Math.sin(i * 0.8) * 0.08);
        const lx = cxw + nx * w, lz = czw + nz * w;
        const rx = cxw - nx * w, rz = czw - nz * w;
        verts.push(lx, sampleGroundY(lx, lz) + 0.12, lz);
        verts.push(rx, sampleGroundY(rx, rz) + 0.12, rz);

        const k1 = 0.35 + Math.abs(Math.sin(i * 2.31 + lx * 0.07)) * 0.65;
        const k2 = 0.35 + Math.abs(Math.cos(i * 1.77 + rx * 0.09)) * 0.65;
        const c1 = PATH_DIRT_A.clone().lerp(PATH_DIRT_B, 1 - k1);
        const c2 = PATH_DIRT_A.clone().lerp(PATH_DIRT_B, 1 - k2);
        colors.push(c1.r, c1.g, c1.b);
        colors.push(c2.r, c2.g, c2.b);
    }
    for (let i = 0; i < n; i++) {
        const a = i * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, pathMaterial);
    mesh.receiveShadow = true; mesh.castShadow = true;
    propRoot.add(mesh);
    _terrainEdited = true;
}

// ===================================================================
//  VILLAGER SYSTEM — typed villagers with per-type accessories
// ===================================================================
const VILLAGER_TYPES = [
    { name: 'blacksmith' },
    { name: 'farmer' },
    { name: 'baker' },
    { name: 'chief' },
    { name: 'librarian' },
    { name: 'guard' },
];
const villagers = [];

function buildVillager(type) {
    const g = new THREE.Group();
    const skinMat  = new THREE.MeshLambertMaterial({ color: 0xc8a078 });
    const hairDk   = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
    const hairGray = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const bootMat  = new THREE.MeshLambertMaterial({ color: 0x1a1208 });
    const tunicBrown = new THREE.MeshLambertMaterial({ color: 0x5a3818 });
    const tunicTan   = new THREE.MeshLambertMaterial({ color: 0xb89868 });
    const tunicRed   = new THREE.MeshLambertMaterial({ color: 0x8a2020 });
    const tunicGold  = new THREE.MeshLambertMaterial({ color: 0xd4af37 });
    const apronDk    = new THREE.MeshLambertMaterial({ color: 0x3a2210 });
    const apronWhite = new THREE.MeshLambertMaterial({ color: 0xe8e0d0 });
    const chainMat   = new THREE.MeshLambertMaterial({ color: 0x7a7a7a });
    const robeMat    = new THREE.MeshLambertMaterial({ color: 0x5a3a1a });
    const ironMat    = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
    const strawMat   = new THREE.MeshLambertMaterial({ color: 0xb8a060 });
    const furMat     = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
    const skinLight  = new THREE.MeshLambertMaterial({ color: 0xd8b898 });

    // Pick tunic color and arm radius based on type
    let tunicMat = tunicBrown;
    let armR = 0.06;
    let bodyScale = 1.0;
    let useSkin = skinMat;
    if (type === 'farmer')    tunicMat = tunicTan;
    if (type === 'chief')     { tunicMat = tunicRed; bodyScale = 1.12; }
    if (type === 'blacksmith') armR = 0.08;
    if (type === 'guard')     tunicMat = chainMat;
    if (type === 'baker')     useSkin = skinLight;

    // --- Head ---
    const head = new THREE.Mesh(SP(0.14), useSkin);
    head.position.set(0, 1.65, 0);
    head.castShadow = true;
    g.add(head);

    // Eyes
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    for (const sz of [-1, 1]) {
        const eye = new THREE.Mesh(SP(0.02), eyeMat);
        eye.position.set(0.12, 1.68, sz * 0.05);
        g.add(eye);
    }
    // Nose
    const nose = new THREE.Mesh(SP(0.025), useSkin);
    nose.scale.set(0.7, 1, 1);
    nose.position.set(0.14, 1.62, 0);
    g.add(nose);

    // Hair (type-dependent)
    if (type !== 'blacksmith') {
        const hMat = type === 'chief' ? hairGray : hairDk;
        const hair = new THREE.Mesh(SP(0.15), hMat);
        hair.scale.set(1, 0.7, 1);
        hair.position.set(-0.02, 1.75, 0);
        g.add(hair);
    }

    // --- Torso ---
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32 * bodyScale, 0.45, 0.22 * bodyScale), tunicMat);
    torso.position.set(0, 1.2, 0);
    torso.castShadow = true;
    g.add(torso);

    // --- Arms (upper + lower + hands) ---
    const shoulderW = 0.18 * bodyScale;
    for (const sz of [-1, 1]) {
        // Upper arm
        const upperArm = new THREE.Mesh(CY(armR, armR * 0.9, 0.28), tunicMat);
        upperArm.position.set(0, 1.28, sz * (shoulderW + armR));
        upperArm.rotation.x = sz * 0.05;
        g.add(upperArm);
        // Lower arm
        const lowerArm = new THREE.Mesh(CY(armR * 0.85, armR * 0.7, 0.24), useSkin);
        lowerArm.position.set(0, 1.0, sz * (shoulderW + armR));
        g.add(lowerArm);
        // Hand
        const hand = new THREE.Mesh(SP(0.035), useSkin);
        hand.position.set(0, 0.86, sz * (shoulderW + armR));
        g.add(hand);
    }

    // --- Legs (pivot groups for walk animation) ---
    const legs = [];
    for (const sz of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(0, 0.85, sz * 0.08);
        // Upper leg
        const upperLeg = new THREE.Mesh(CY(0.065, 0.055, 0.38), tunicMat);
        upperLeg.position.y = -0.19;
        pivot.add(upperLeg);
        // Lower leg
        const lowerLeg = new THREE.Mesh(CY(0.05, 0.045, 0.34), useSkin);
        lowerLeg.position.y = -0.55;
        pivot.add(lowerLeg);
        // Boot/foot
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.14), bootMat);
        boot.position.set(0.02, -0.74, 0);
        pivot.add(boot);
        g.add(pivot);
        legs.push(pivot);
    }
    g.userData.legs = legs;

    // ========== Per-type accessories ==========

    if (type === 'blacksmith') {
        // Dark brown apron in front of torso
        const apron = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.4, 0.04), apronDk);
        apron.position.set(0.03, 1.05, 0);
        g.add(apron);
    }

    if (type === 'farmer') {
        // Straw hat (cone + disk)
        const hatBrim = new THREE.Mesh(CY(0.22, 0.22, 0.03), strawMat);
        hatBrim.position.set(0, 1.82, 0);
        g.add(hatBrim);
        const hatCone = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.16, 8), strawMat);
        hatCone.position.set(0, 1.93, 0);
        g.add(hatCone);
        // Pitchfork in hand (right side)
        const pfH = new THREE.Mesh(CY(0.015, 0.015, 1.2, 6), new THREE.MeshLambertMaterial({ color: 0x5a3818 }));
        pfH.position.set(0, 1.1, shoulderW + armR + 0.04);
        g.add(pfH);
        for (let ti = 0; ti < 3; ti++) {
            const tine = new THREE.Mesh(CY(0.006, 0.006, 0.18, 4), ironMat);
            tine.position.set(0, 1.72, shoulderW + armR + 0.04 + (ti - 1) * 0.03);
            g.add(tine);
        }
    }

    if (type === 'baker') {
        // White apron
        const apron = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.45, 0.04), apronWhite);
        apron.position.set(0.03, 1.0, 0);
        g.add(apron);
        // Rounder belly
        const belly = new THREE.Mesh(SP(0.12), apronWhite);
        belly.scale.set(0.8, 0.7, 1);
        belly.position.set(0.08, 1.08, 0);
        g.add(belly);
    }

    if (type === 'chief') {
        // Fur collar (torus around neck)
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 8, 16), furMat);
        collar.rotation.x = Math.PI / 2;
        collar.position.set(0, 1.48, 0);
        g.add(collar);
        // Gold belt/sash
        const sash = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.24), tunicGold);
        sash.position.set(0, 0.97, 0);
        g.add(sash);
    }

    if (type === 'librarian') {
        // Long brown robe (cylinder from shoulders to ankles, visually covers legs)
        const robe = new THREE.Mesh(CY(0.18, 0.22, 1.1), robeMat);
        robe.position.set(0, 0.72, 0);
        g.add(robe);
        // Hood (half-sphere behind head)
        const hood = new THREE.Mesh(SP(0.15), robeMat);
        hood.scale.set(0.9, 0.8, 0.6);
        hood.position.set(-0.06, 1.75, 0);
        g.add(hood);
        // Book in hand (left side)
        const book = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.03),
            new THREE.MeshLambertMaterial({ color: 0x6a2020 }));
        book.position.set(0, 0.9, -(shoulderW + armR));
        g.add(book);
    }

    if (type === 'guard') {
        // Helmet (sphere + cone on top)
        const helmet = new THREE.Mesh(SP(0.155), chainMat);
        helmet.position.set(0, 1.7, 0);
        g.add(helmet);
        const helmetSpike = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 6), chainMat);
        helmetSpike.position.set(0, 1.88, 0);
        g.add(helmetSpike);
        // Sword on hip (thin box)
        const sword = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.04), ironMat);
        sword.position.set(0, 0.7, shoulderW + 0.12);
        sword.rotation.x = 0.15;
        g.add(sword);
        const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.1),
            new THREE.MeshLambertMaterial({ color: 0x5a3818 }));
        hilt.position.set(0, 1.0, shoulderW + 0.12);
        g.add(hilt);
    }

    return g;
}

// ----- Village builder with multiple layouts + spacing rules + paths -----
function buildVillage(cx, cz) {
    // Flatten the entire village center area first
    flattenAt(cx, cz, 30.0, sampleGroundY(cx, cz));
    _terrainEdited = true;

    const layout = Math.random();   // 0..1 picks a layout style
    const houseCount = 6 + (Math.random() * 12 | 0);   // 6..17 houses
    const placed = [];               // {x, z, facing}
    const MIN_HOUSE_SPACING = 16;    // m

    function tryPlace(px, pz, facing) {
        // Min spacing to other houses + the well
        if (Math.hypot(px - cx, pz - cz) < 11) return false;
        for (const p of placed) {
            if (Math.hypot(p.x - px, p.z - pz) < MIN_HOUSE_SPACING) return false;
        }
        // Local flatness
        const ph = heightAt(px, pz);
        const flat = Math.abs(heightAt(px+6, pz) - ph) +
                     Math.abs(heightAt(px-6, pz) - ph) +
                     Math.abs(heightAt(px, pz+6) - ph) +
                     Math.abs(heightAt(px, pz-6) - ph);
        if (flat > 3.5) return false;
        // Avoid the river
        if (distToRiver(px, pz) < 60) return false;
        // World bounds
        if (Math.abs(px) > WORLD/2 - 30 || Math.abs(pz) > WORLD/2 - 30) return false;
        placed.push({ x: px, z: pz, facing });
        return true;
    }

    if (layout < 0.34) {
        // CLUSTER — random angle/radius around the center
        for (let attempt = 0; attempt < 400 && placed.length < houseCount; attempt++) {
            const ang = Math.random() * Math.PI * 2;
            const r = rand(18, 60);
            const px = cx + Math.cos(ang) * r;
            const pz = cz + Math.sin(ang) * r;
            tryPlace(px, pz, Math.atan2(cx - px, cz - pz));
        }
    } else if (layout < 0.67) {
        // LINEAR — houses lined up on either side of a road
        const heading = Math.random() * Math.PI * 2;
        const cosH = Math.cos(heading), sinH = Math.sin(heading);
        const spacing = rand(20, 26);
        const sideOff = rand(11, 14);
        const half = Math.ceil(houseCount / 2);
        for (let i = -half; i <= half && placed.length < houseCount; i++) {
            if (i === 0) continue;     // gap for the well
            for (const side of [-1, 1]) {
                const along = i * spacing + rand(-2, 2);
                const off   = side * (sideOff + rand(-1.5, 1.5));
                const px = cx + cosH * along + sinH * off;
                const pz = cz + sinH * along - cosH * off;
                // Houses face the road
                tryPlace(px, pz, Math.atan2(-sinH * side, cosH * side));
                if (placed.length >= houseCount) break;
            }
        }
    } else {
        // SCATTERED — wider spread, irregular spacing
        for (let attempt = 0; attempt < 600 && placed.length < houseCount; attempt++) {
            const ang = Math.random() * Math.PI * 2;
            const r = rand(20, 90);
            const px = cx + Math.cos(ang) * r;
            const pz = cz + Math.sin(ang) * r;
            tryPlace(px, pz, Math.random() * Math.PI * 2);
        }
    }

    // Build the well at the center
    buildWell(cx, cz);

    // Assign villager types to houses — guarantee exactly 1 chief
    const typePool = VILLAGER_TYPES.filter(t => t.name !== 'chief');
    let chiefAssigned = false;
    const chiefIdx = Math.floor(Math.random() * placed.length);
    for (let i = 0; i < placed.length; i++) {
        if (i === chiefIdx) {
            placed[i].type = 'chief';
            chiefAssigned = true;
        } else {
            placed[i].type = typePool[Math.floor(Math.random() * typePool.length)].name;
        }
    }

    // Build all the placed houses with their assigned type
    for (const p of placed) {
        buildHouse(p.x, p.z, p.facing, p.type);
    }

    // Each house's door is on the front face — facing wraps the house so
    // its +Z (in local frame) points along (sin(facing), cos(facing)) in
    // world space. The door is at front-center, so:
    //   doorWorld = housePos + (sin(facing), cos(facing)) * (d/2 + step)
    // We use ~5.5 m as a typical "front of door" offset.
    const DOOR_OFFSET = 5.8;
    function doorPoint(p) {
        return {
            x: p.x + Math.sin(p.facing) * DOOR_OFFSET,
            z: p.z + Math.cos(p.facing) * DOOR_OFFSET,
        };
    }

    // Main paths: well -> in front of each door
    for (const p of placed) {
        const dp = doorPoint(p);
        buildPath(cx, cz, dp.x, dp.z, 1.5);
    }
    // Cross-paths between nearest door fronts (sparse, organic)
    for (let i = 0; i < placed.length; i++) {
        let bestJ = -1, bestD = 1e9;
        for (let j = 0; j < placed.length; j++) {
            if (i === j) continue;
            const dd = Math.hypot(placed[i].x - placed[j].x, placed[i].z - placed[j].z);
            if (dd < bestD) { bestD = dd; bestJ = j; }
        }
        if (bestJ >= 0 && bestD < 38 && Math.random() < 0.55) {
            const a = doorPoint(placed[i]);
            const b = doorPoint(placed[bestJ]);
            buildPath(a.x, a.z, b.x, b.z, 1.2);
        }
    }

    // Spawn one villager per house
    for (const p of placed) {
        const dp = doorPoint(p);
        const vObj = buildVillager(p.type);
        const vy = sampleGroundY(dp.x, dp.z);
        vObj.position.set(dp.x, vy, dp.z);
        vObj.rotation.y = p.facing;
        propRoot.add(vObj);
        // Work position: near house for most, center for chief
        const workX = p.type === 'chief' ? cx : p.x + Math.sin(p.facing) * 3;
        const workZ = p.type === 'chief' ? cz : p.z + Math.cos(p.facing) * 3;
        villagers.push({
            obj: vObj, type: p.type,
            homeX: p.x, homeZ: p.z,
            workX, workZ,
            wellX: cx, wellZ: cz,
            state: 'idle', stateT: rand(0, 3),
            x: dp.x, z: dp.z,
            speed: 0, phase: rand(0, Math.PI * 2),
            dirX: 0, dirZ: 0,
        });
    }
}

// --- Pick village locations FIRST, before placing trees ---
const VILLAGE_TARGET = 5;
for (let attempt = 0; attempt < 4000 && villageCenters.length < VILLAGE_TARGET; attempt++) {
    const cx = rand(-WORLD/2 + 120, WORLD/2 - 120);
    const cz = rand(-WORLD/2 + 120, WORLD/2 - 120);
    if (distToRiver(cx, cz) < 100) continue;
    const ch = heightAt(cx, cz);
    if (ch < 14 || ch > 26) continue;
    const b = biomeAt(cx, cz, ch);
    if (b !== 1 && b !== 2) continue;             // only dry plains / meadow
    // Flatness check
    const flat = Math.abs(heightAt(cx+8, cz) - ch) +
                 Math.abs(heightAt(cx-8, cz) - ch) +
                 Math.abs(heightAt(cx, cz+8) - ch) +
                 Math.abs(heightAt(cx, cz-8) - ch);
    if (flat > 2.5) continue;
    // Min distance from other villages
    let tooClose = false;
    for (const v of villageCenters) {
        if (Math.hypot(v.cx - cx, v.cz - cz) < 380) { tooClose = true; break; }
    }
    if (tooClose) continue;
    villageCenters.push({ cx, cz });
}

// ----- prop placement: rejection-sampled, biome-aware, river/village-aware -----
function nearVillage(x, z) {
    for (const v of villageCenters) {
        if (Math.hypot(v.cx - x, v.cz - z) < VILLAGE_CLEAR) return true;
    }
    return false;
}

const ATTEMPTS = 16000;     // scaled for the larger 1600 m world
for (let i = 0; i < ATTEMPTS; i++) {
    const x = rand(-WORLD/2 + 10, WORLD/2 - 10);
    const z = rand(-WORLD/2 + 10, WORLD/2 - 10);
    const d = distToRiver(x, z);
    const h = heightAt(x, z);
    const b = biomeAt(x, z, h);

    const inRiver = d < RIVER_HALF + 1.5;
    const onBank  = d < BANK_HALF;
    if (inRiver) continue;

    const villageZone = nearVillage(x, z);
    const r = Math.random();

    if (villageZone) continue;

    if (b === 0 || (onBank && h < 4)) {
        if (r < 0.75) { const rk = makeRock(); rk.mesh.scale.setScalar(rand(0.3, 0.7)); place(rk.mesh, x, z, rk.sink * 0.6); }
        else continue;
    } else if (b === 1) {
        // Dry plains: bushes, very rare lone oaks
        if (r < 0.94) continue;
        else if (r < 0.985) place(makeOak(rand(0.7, 1.0)), x, z, 0, true);
        else { const rk = makeRock(); rk.mesh.scale.setScalar(rand(0.4, 0.9)); place(rk.mesh, x, z, rk.sink); }
    } else if (b === 2) {
        // Meadow plains: lots of bushes, scattered oaks
        if (r < 0.7) continue;
        else if (r < 0.86) place(makeBush(), x, z, 0.2);
        else if (r < 0.97) place(makeOak(rand(0.85, 1.2)), x, z, 0, true);
        else { const rk = makeRock(); place(rk.mesh, x, z, rk.sink); }
    } else if (b === 3) {
        // Light woodland: ~30% trees with open glades
        if (r < 0.30) place(makeOak(rand(0.9, 1.3)), x, z, 0, true);
        else if (r < 0.42) place(makeBirch(rand(0.9, 1.2)), x, z, 0, true);
        else if (r < 0.62) place(makeBush(), x, z, 0.2);
        else continue;
    } else if (b === 4) {
        // Dense forest
        if (r < 0.55) place(makeOak(rand(1.0, 1.5)), x, z, 0, true);
        else if (r < 0.78) place(makeBirch(rand(0.9, 1.4)), x, z, 0, true);
        else if (r < 0.92) place(makeBush(), x, z, 0.2);
        else continue;
    } else if (b === 5) {
        // Highlands: pines + rocks
        if (r < 0.4) place(makePine(rand(0.9, 1.5)), x, z, 0, true);
        else if (r < 0.6) { const rk = makeRock(); place(rk.mesh, x, z, rk.sink); }
        else if (r < 0.78) place(makeBush(), x, z, 0.2);
        else continue;
    } else {
        // Mountains: big rocks, sparse dead pines
        if (r < 0.6) { const rk = makeRock(); rk.mesh.scale.setScalar(rand(1.2, 2.4)); place(rk.mesh, x, z, rk.sink); }
        else if (r < 0.75) place(makeDeadTree(rand(0.8, 1.2)), x, z, 0, true);
        else if (r < 0.88) place(makePine(rand(0.6, 1.0)), x, z, 0, true);
    }
}

// ----- Build the actual village structures (after props) -----
for (const v of villageCenters) {
    buildVillage(v.cx, v.cz);
}
if (_terrainEdited) {
    groundGeo.attributes.position.needsUpdate = true;
    groundGeo.attributes.color.needsUpdate = true;
    groundGeo.computeVertexNormals();
    // Re-snap every tree onto the new ground so nothing floats after
    // village flattening lowered the terrain underneath them.
    for (const t of trees) {
        const y = sampleGroundY(t.x, t.z) - (t.sink || 0);
        t.obj.position.y = y;
        t.y = y;
    }
}
