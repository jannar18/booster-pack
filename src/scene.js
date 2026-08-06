// Renderer, camera, lighting, environment, bloom, and the soft sky background.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeCanvas } from './util.js';

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.NeutralToneMapping;
  // Keep painted foil in the middle of the tone curve. The light effects can
  // still exceed 1.0 and bloom, but the product art must not live there.
  renderer.toneMappingExposure = 3.4;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  // Soft vertical sky gradient with an upper-center bloom of light.
  const [bgC, bg] = makeCanvas(512, 1024);
  const grad = bg.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, '#f4f8fc');
  grad.addColorStop(0.35, '#dbe7f3');
  grad.addColorStop(0.7, '#c3d5e9');
  grad.addColorStop(1, '#b2c8e2');
  bg.fillStyle = grad;
  bg.fillRect(0, 0, 512, 1024);
  const glow = bg.createRadialGradient(256, 190, 10, 256, 190, 420);
  glow.addColorStop(0, 'rgba(255,255,252,0.9)');
  glow.addColorStop(0.4, 'rgba(255,255,250,0.28)');
  glow.addColorStop(1, 'rgba(255,255,250,0)');
  bg.fillStyle = glow;
  bg.fillRect(0, 0, 512, 1024);
  const bgTex = new THREE.CanvasTexture(bgC);
  bgTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = bgTex;

  const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 7.2);

  // Lighting: soft key from upper front, cool fill, rim.
  const key = new THREE.DirectionalLight(0xfff6e8, 0.9);
  key.position.set(1.5, 3.5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xcfe0ff, 0.28);
  fill.position.set(-2.5, -1, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.24);
  rim.position.set(0, 2, -4);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xdde8f8, 0.3));

  // Environment for foil reflections.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.38;

  // Bloom keeps the slice beam and sparkles hot.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), 0.28, 0.38, 1.08
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  }
  window.addEventListener('resize', resize);

  // World-units height visible at z=0 plane.
  function viewHeightAt(z = 0) {
    const dist = camera.position.z - z;
    return 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  }
  function viewWidthAt(z = 0) { return viewHeightAt(z) * camera.aspect; }

  return { renderer, scene, camera, composer, bloom, resize, viewHeightAt, viewWidthAt };
}
