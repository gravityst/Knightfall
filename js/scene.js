// ===================================================================
//  SCENE
// ===================================================================
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xbcc7d3, 0.0028);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

// ----- SKY DOME with shader gradient driven by sun direction -----
const sunDir = new THREE.Vector3(0.4, 0.7, 0.3).normalize();
const skyUniforms = {
    topColor:    { value: new THREE.Color(0x2a5a9a) },
    midColor:    { value: new THREE.Color(0xc9d6e0) },
    bottomColor: { value: new THREE.Color(0xe6c98a) },
    sunDir:      { value: sunDir },
    sunColor:    { value: new THREE.Color(0xfff0c8) },
};
const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: skyUniforms,
    vertexShader: `
        varying vec3 vWorldPos;
        void main() {
            vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        uniform vec3 sunDir;
        uniform vec3 sunColor;
        varying vec3 vWorldPos;
        void main() {
            vec3 v = normalize(vWorldPos);
            float h = clamp(v.y, -1.0, 1.0);
            vec3 col;
            if (h > 0.0) {
                col = mix(midColor, topColor, pow(h, 0.6));
            } else {
                col = mix(midColor, bottomColor, pow(-h, 0.7));
            }
            // Sun disk + glow
            float sd = max(dot(v, normalize(sunDir)), 0.0);
            float disk = smoothstep(0.9985, 0.9995, sd);
            float glow = pow(sd, 80.0) * 0.6 + pow(sd, 8.0) * 0.18;
            col += sunColor * (disk * 6.0 + glow);
            gl_FragColor = vec4(col, 1.0);
        }
    `
});
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat);
scene.add(skyDome);

// ----- LIGHTS -----
const hemiLight = new THREE.HemisphereLight(0x9ab4d4, 0x40341e, 0.85);
scene.add(hemiLight);
const sun = new THREE.DirectionalLight(0xfff0c8, 1.7);
sun.position.copy(sunDir).multiplyScalar(300);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -250;
sun.shadow.camera.right = 250;
sun.shadow.camera.top = 250;
sun.shadow.camera.bottom = -250;
sun.shadow.camera.far = 1200;
sun.shadow.bias = -0.0005;
scene.add(sun);
const sunTarget = new THREE.Object3D();
scene.add(sunTarget);
sun.target = sunTarget;

// ----- DAY / NIGHT CYCLE -----
// 0..1 fraction of full day. Sun sweeps through the sky over DAY_LENGTH seconds.
const DAY_LENGTH = 720;        // 12-minute cycle (≈8.4 min day, ≈3.6 min night)
const DAY_FRAC   = 0.70;       // fraction of cycle that is daylight
let timeOfDay = 0.20;          // start mid-morning
function updateSky(t) {
    // Day = sun above horizon, night = sun below.
    let sx, sy, sz;
    if (t < DAY_FRAC) {
        // s in [0..1]: 0 = sunrise, 0.5 = noon, 1 = sunset
        const s = t / DAY_FRAC;
        sy = Math.sin(s * Math.PI);                    // 0..1..0
        const horizAng = s * Math.PI - Math.PI / 2;    // -π/2..π/2
        sx = Math.cos(horizAng) * 0.6;
        sz = Math.cos(horizAng) * 0.4 + 0.2;
    } else {
        // Night arc: sun below horizon, sweeping the other way
        const s = (t - DAY_FRAC) / (1 - DAY_FRAC);
        sy = -Math.sin(s * Math.PI) * 0.6 - 0.05;
        const horizAng = Math.PI - s * Math.PI - Math.PI / 2;
        sx = Math.cos(horizAng) * 0.6;
        sz = Math.cos(horizAng) * 0.4 + 0.2;
    }
    sunDir.set(sx, sy, sz).normalize();
    sun.position.copy(sunDir).multiplyScalar(300);
    sun.target.position.set(0, 0, 0);
    // Color palettes
    const altitude = Math.max(-0.2, sunDir.y);    // -1..1 ish
    const dayK = Math.max(0, altitude);            // 0 night → 1 noon
    const horizonK = Math.exp(-Math.pow(altitude * 4.0, 2.0)); // peak near horizon
    const top = new THREE.Color(0x06112a).lerp(new THREE.Color(0x2a5a9a), dayK);
    const mid = new THREE.Color(0x1a2238).lerp(new THREE.Color(0xc9d6e0), dayK);
    let bot = new THREE.Color(0x0a0a18).lerp(new THREE.Color(0xe6c98a), dayK);
    // Sunrise/sunset color injection
    const sunsetTint = new THREE.Color(0xff8a3a).multiplyScalar(horizonK * 0.7);
    bot.add(sunsetTint);
    skyUniforms.topColor.value.copy(top);
    skyUniforms.midColor.value.copy(mid);
    skyUniforms.bottomColor.value.copy(bot);
    // Sun + light color
    const sunCol = new THREE.Color(0xfff0c8).lerp(new THREE.Color(0xff8e3c), horizonK * 0.7);
    skyUniforms.sunColor.value.copy(sunCol);
    sun.color.copy(sunCol);
    sun.intensity = 0.15 + dayK * 1.7;
    hemiLight.intensity = 0.25 + dayK * 0.85;
    hemiLight.color.copy(mid);
    // Fog matches the sky horizon
    scene.fog.color.copy(mid);
    scene.fog.density = 0.0022 + (1 - dayK) * 0.0020;
    // Renderer exposure: a touch brighter at night so player can see
    renderer.toneMappingExposure = 1.0 + (1 - dayK) * 0.25;
}
updateSky(timeOfDay);
