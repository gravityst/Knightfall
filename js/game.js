// ===================================================================
//  GAME LOOP
// ===================================================================
const biomeEl = document.getElementById('biome');
const doorPromptEl = document.getElementById('doorprompt');
let lastBiome = -1;
let last = performance.now();

function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    const running = move.run && stamina > 0.05;
    const speed = (running ? 26 : 16) * dt;
    const fwd = (move.f ? 1 : 0) - (move.b ? 1 : 0);
    const str = (move.r ? 1 : 0) - (move.l ? 1 : 0);
    const moving = (fwd !== 0 || str !== 0);
    if (moving) {
        const len = Math.hypot(fwd, str);
        const nx = -Math.sin(yaw) * (fwd / len) + Math.cos(yaw) * (str / len);
        const nz = -Math.cos(yaw) * (fwd / len) - Math.sin(yaw) * (str / len);
        // Sub-step the movement so we never tunnel through thin walls.
        const stepSize = 0.12;
        const totalDist = speed;
        const subs = Math.max(1, Math.ceil(totalDist / stepSize));
        const sxStep = nx * speed / subs;
        const szStep = nz * speed / subs;
        for (let s = 0; s < subs; s++) {
            const nextX = camera.position.x + sxStep;
            const nextZ = camera.position.z + szStep;
            const hit = collide(nextX, nextZ);
            if (hit) {
                camera.position.x = hit.x;
                camera.position.z = hit.z;
                break;
            } else {
                camera.position.x = nextX;
                camera.position.z = nextZ;
            }
        }
    }
    // Stamina
    if (running && moving) stamina = Math.max(0, stamina - STAM_DRAIN * dt);
    else                   stamina = Math.min(1, stamina + STAM_REGEN * dt);
    staminaEl.style.width = (stamina * 100).toFixed(1) + '%';
    // Sprint FOV punch
    const targetFov = running && moving ? 66 : 60;
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 6);
    camera.updateProjectionMatrix();
    // Vertical: glue to ground except when jumping. If inside a house,
    // walk on the house's flat anchor floor instead of the rolling terrain.
    const inHouse = insideHouse(camera.position.x, camera.position.z);
    const gh = inHouse ? (inHouse.anchorY + 0.22) : sampleGroundY(camera.position.x, camera.position.z);
    const floorY = gh + EYE;
    if (vy > 0) {
        vy -= GRAVITY * dt;
        camera.position.y += vy * dt;
        if (camera.position.y <= floorY) { camera.position.y = floorY; vy = 0; }
    } else {
        camera.position.y = floorY;
        vy = 0;
    }
    // Head bob (only when grounded and moving)
    if (moving && vy === 0) {
        bobPhase += dt * (running ? 13 : 8);
        const bobAmp = running ? 0.18 : 0.10;
        camera.position.y += Math.sin(bobPhase) * bobAmp;
    } else {
        bobPhase *= 0.9;
    }

    // Day/night
    timeOfDay = (timeOfDay + dt / DAY_LENGTH) % 1;
    updateSky(timeOfDay);

    // Tree fall animation
    for (const t of trees) {
        if (t.alive || t.fall >= 1) continue;
        t.fall = Math.min(1, t.fall + dt * 1.4);
        const ang = (t.fall * t.fall) * (Math.PI / 2 - 0.05);
        t.obj.rotation.set(t.fallAxisX * ang, t.obj.rotation.y, t.fallAxisZ * ang);
    }
    // Door swing animation (slower so it's clearly visible)
    for (const h of houseColliders) {
        if (!h.doorPivot) continue;
        const target = h.doorOpen ? -Math.PI * 0.55 : 0;
        h.doorAng += (target - h.doorAng) * Math.min(1, dt * 3);
        h.doorPivot.rotation.y = h.doorAng;
    }
    // Door prompt
    const doorH = nearestDoor(camera.position.x, camera.position.z, yaw);
    if (doorH) {
        doorPromptEl.textContent = doorH.doorOpen ? 'Press E to close' : 'Press E to open';
        doorPromptEl.style.display = 'block';
    } else {
        doorPromptEl.style.display = 'none';
    }
    // Wind sway on living trees
    const wt = now * 0.001;
    const windStrength = 0.025 + Math.sin(wt * 0.3) * 0.012;
    for (const t of swaying) {
        if (!t.alive) continue;
        const phase = wt * 1.4 + t.seed;
        t.obj.rotation.x = t.baseRotX + Math.sin(phase)        * windStrength;
        t.obj.rotation.z = t.baseRotZ + Math.cos(phase * 0.8)  * windStrength;
    }

    // Animal AI + walk-cycle leg animation
    for (const a of animals) {
        const s = a.spec;
        const dxp = camera.position.x - a.x;
        const dzp = camera.position.z - a.z;
        const distP = Math.hypot(dxp, dzp);
        let dirX, dirZ, sp;
        if (s.chaseR && distP < s.chaseR) {
            // Bear: chase the player
            dirX = dxp / (distP || 1);
            dirZ = dzp / (distP || 1);
            sp = s.speedChase;
        } else if (s.fleeR && distP < s.fleeR) {
            // Rabbit/deer: flee
            dirX = -dxp / (distP || 1);
            dirZ = -dzp / (distP || 1);
            sp = s.speedFlee;
        } else {
            a.wanderT -= dt;
            if (a.wanderT <= 0) {
                a.wanderT = rand(2.5, 6);
                a.dirX = rand(-1, 1);
                a.dirZ = rand(-1, 1);
                const m = Math.hypot(a.dirX, a.dirZ) || 1;
                a.dirX /= m; a.dirZ /= m;
            }
            dirX = a.dirX; dirZ = a.dirZ;
            sp = s.speedWalk;
        }
        a.x += dirX * sp * dt;
        a.z += dirZ * sp * dt;
        if (a.x < -WORLD/2 + 30) a.x = -WORLD/2 + 30;
        if (a.x >  WORLD/2 - 30) a.x =  WORLD/2 - 30;
        if (a.z < -WORLD/2 + 30) a.z = -WORLD/2 + 30;
        if (a.z >  WORLD/2 - 30) a.z =  WORLD/2 - 30;
        // Collide with house walls (same check as the player)
        const aHit = collide(a.x, a.z);
        if (aHit) {
            a.x = aHit.x; a.z = aHit.z;
            // Reverse wander direction so they don't keep ramming the wall
            a.dirX = -a.dirX; a.dirZ = -a.dirZ;
            a.wanderT = 0;
        }
        a.obj.position.set(a.x, sampleGroundY(a.x, a.z), a.z);
        // Face direction of travel. Body's +X is its forward, so the
        // group rotation around Y is atan2(dirX, dirZ) - PI/2.
        a.obj.rotation.y = Math.atan2(dirX, dirZ) - Math.PI / 2;

        // Walk cycle: paired-diagonal gait (FL+BR, FR+BL)
        const cycleRate = s.cycleSpeed * (sp / s.speedWalk);
        a.phase += cycleRate * dt;
        const amp = s.legAmp * Math.min(1.4, sp / s.speedWalk);
        const legs = a.obj.userData.legs;
        // Legs swing FORWARD/BACKWARD along the body's X axis,
        // so rotate each leg pivot around Z (perpendicular to X and Y).
        // Diagonal gait: FL+BR in phase, FR+BL half-cycle offset.
        legs[0].rotation.z =  Math.sin(a.phase)             * amp;  // FL
        legs[3].rotation.z =  Math.sin(a.phase)             * amp;  // BR
        legs[1].rotation.z =  Math.sin(a.phase + Math.PI)   * amp;  // FR
        legs[2].rotation.z =  Math.sin(a.phase + Math.PI)   * amp;  // BL
    }

    // Villager AI + walk-cycle leg animation
    for (const v of villagers) {
        v.stateT -= dt;

        // --- State transitions based on time of day ---
        if (timeOfDay > 0.68 && v.state !== 'sleep' && v.state !== 'walkHome') {
            v.state = 'walkHome';
            v.stateT = 0;
        } else if (timeOfDay < 0.05 && v.state === 'sleep') {
            v.state = 'walkToWork';
            v.stateT = 0;
        }

        // --- Determine target position and speed ---
        let tgtX = v.x, tgtZ = v.z;
        let moveSpeed = 0;

        switch (v.state) {
            case 'walkToWork':
                tgtX = v.workX; tgtZ = v.workZ;
                moveSpeed = 2.5;
                if (Math.hypot(v.x - tgtX, v.z - tgtZ) < 1.0) {
                    v.state = 'work';
                    v.stateT = rand(4, 10);
                }
                break;
            case 'work':
                moveSpeed = 0;
                if (v.stateT <= 0) {
                    v.state = 'walkToWell';
                    v.stateT = 0;
                }
                break;
            case 'walkToWell':
                tgtX = v.wellX; tgtZ = v.wellZ;
                moveSpeed = 2.5;
                if (Math.hypot(v.x - tgtX, v.z - tgtZ) < 1.0) {
                    v.state = 'idle';
                    v.stateT = rand(3, 7);
                }
                break;
            case 'idle':
                // Wander slowly near current position
                if (v.stateT <= 0) {
                    v.stateT = rand(2, 5);
                    const wAng = rand(0, Math.PI * 2);
                    v.dirX = Math.cos(wAng);
                    v.dirZ = Math.sin(wAng);
                }
                moveSpeed = 0.6;
                tgtX = v.x + v.dirX * 2;
                tgtZ = v.z + v.dirZ * 2;
                // After idle period, go back to work (if daytime)
                if (v.stateT <= 0 && timeOfDay > 0.05 && timeOfDay < 0.68) {
                    v.state = 'walkToWork';
                    v.stateT = 0;
                }
                break;
            case 'walkHome':
                tgtX = v.homeX; tgtZ = v.homeZ;
                moveSpeed = 2.5;
                if (Math.hypot(v.x - tgtX, v.z - tgtZ) < 1.0) {
                    v.state = 'sleep';
                    v.stateT = 0;
                }
                break;
            case 'sleep':
                moveSpeed = 0;
                break;
        }

        // --- Movement ---
        if (moveSpeed > 0) {
            const dx = tgtX - v.x;
            const dz = tgtZ - v.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 0.2) {
                const nx = dx / dist;
                const nz = dz / dist;
                v.x += nx * moveSpeed * dt;
                v.z += nz * moveSpeed * dt;
                v.dirX = nx;
                v.dirZ = nz;
                v.speed = moveSpeed;
            } else {
                v.speed = 0;
            }
        } else {
            v.speed = 0;
        }

        // World bounds
        if (v.x < -WORLD/2 + 30) v.x = -WORLD/2 + 30;
        if (v.x >  WORLD/2 - 30) v.x =  WORLD/2 - 30;
        if (v.z < -WORLD/2 + 30) v.z = -WORLD/2 + 30;
        if (v.z >  WORLD/2 - 30) v.z =  WORLD/2 - 30;

        // Collide with house walls
        const vHit = collide(v.x, v.z);
        if (vHit) {
            v.x = vHit.x; v.z = vHit.z;
            v.dirX = -v.dirX; v.dirZ = -v.dirZ;
        }

        // Update position
        v.obj.position.set(v.x, sampleGroundY(v.x, v.z), v.z);

        // Face direction of travel (body +X is forward)
        if (v.speed > 0.1) {
            v.obj.rotation.y = Math.atan2(v.dirX, v.dirZ) - Math.PI / 2;
        }

        // Walk cycle: 2-leg bipedal gait
        const vLegs = v.obj.userData.legs;
        if (v.speed > 0.1) {
            const cycleRate = 6.0 * (v.speed / 2.5);
            v.phase += cycleRate * dt;
            const amp = 0.4 * Math.min(1.2, v.speed / 2.5);
            vLegs[0].rotation.z = Math.sin(v.phase) * amp;
            vLegs[1].rotation.z = Math.sin(v.phase + Math.PI) * amp;
        } else {
            // Idle: reset legs
            vLegs[0].rotation.z *= 0.9;
            vLegs[1].rotation.z *= 0.9;
        }
    }

    const b = biomeAt(camera.position.x, camera.position.z, gh);
    if (b !== lastBiome) { biomeEl.textContent = '— ' + BIOME_NAMES[b] + ' —'; lastBiome = b; }

    // Sword swing animation (overhead chop)
    if (swingT > 0) {
        swingT = Math.max(0, swingT - dt);
        const p = 1 - swingT / SWING_DUR;          // 0..1
        const arc = Math.sin(p * Math.PI);          // ease in/out
        sword.rotation.x = SWORD_REST.rx - arc * 1.8;
        sword.rotation.z = SWORD_REST.rz + arc * 0.6;
        sword.position.z = SWORD_REST.z - arc * 0.25;
    } else {
        sword.rotation.set(SWORD_REST.rx, SWORD_REST.ry, SWORD_REST.rz);
        sword.position.set(SWORD_REST.x, SWORD_REST.y, SWORD_REST.z);
    }

    renderer.render(scene, camera);
}
requestAnimationFrame(animate);
