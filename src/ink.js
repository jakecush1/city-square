// Illustration post pass: the scene is drawn to a colour+depth target, normals to a second one,
// then a full-screen shader inks edges where depth or normals jump, lays paper grain over
// everything, flattens the palette a little and applies tone mapping to the screen.
import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { paperNoise } from "./textures.js";

export const FX_LAYER = 1; // rain, halos, steam, ground smears: drawn in colour, skipped for normals

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  #include <packing>
  #include <tonemapping_pars_fragment>
  // the colour-space chunk is prepended by three to every fragment shader; the tone-mapping one is not (toneMapped: false)
  uniform sampler2D tDiffuse;
  uniform sampler2D tDepth;
  uniform sampler2D tNormal;
  uniform sampler2D tPaper;
  uniform vec2 resolution;
  uniform float cameraNear;
  uniform float cameraFar;
  uniform float ink;
  uniform float grain;
  uniform float time;
  varying vec2 vUv;

  float depthAt(vec2 uv) {
    float d = texture2D(tDepth, uv).x;
    return -perspectiveDepthToViewZ(d, cameraNear, cameraFar);
  }
  vec3 normalAt(vec2 uv) {
    return texture2D(tNormal, uv).xyz * 2.0 - 1.0;
  }

  void main() {
    vec2 px = 1.3 / resolution;
    vec4 col = texture2D(tDiffuse, vUv);
    float d0 = depthAt(vUv);
    vec3 n0 = normalAt(vUv);
    float dd = 0.0, nd = 0.0;
    vec2 offs[4];
    offs[0] = vec2(px.x, 0.0); offs[1] = vec2(-px.x, 0.0); offs[2] = vec2(0.0, px.y); offs[3] = vec2(0.0, -px.y);
    for (int i = 0; i < 4; i++) {
      dd = max(dd, abs(depthAt(vUv + offs[i]) - d0));
      nd = max(nd, 1.0 - dot(n0, normalAt(vUv + offs[i])));
    }
    float depthEdge = smoothstep(0.012 * d0, 0.045 * d0, dd);
    float normalEdge = smoothstep(0.18, 0.5, nd);
    float edge = clamp(max(depthEdge, normalEdge), 0.0, 1.0) * ink * exp(-d0 * 0.011);
    col.rgb *= 1.0 - edge * 0.8;

    // paper grain, drifting very slightly so it reads as texture rather than dirt on the lens
    float g = texture2D(tPaper, (gl_FragCoord.xy + vec2(floor(time * 3.0) * 37.0)) / 384.0).r;
    col.rgb *= 1.0 + (g - 0.5) * grain;

    // matte: pull saturation in a touch and lift the blacks
    float l = dot(col.rgb, vec3(0.299, 0.587, 0.114));
    col.rgb = mix(vec3(l), col.rgb, 0.86);
    col.rgb += 0.008;

    gl_FragColor = vec4(col.rgb, 1.0);
    gl_FragColor.rgb = ACESFilmicToneMapping(gl_FragColor.rgb);
    gl_FragColor = sRGBTransferOETF(gl_FragColor);
  }
`;

export function createInk(renderer, scene, camera, { ink = 0.85, grain = 0.16, samples = 4 } = {}) {
  const sceneRT = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples,
    depthTexture: new THREE.DepthTexture(1, 1, THREE.FloatType),
  });
  const normalRT = new THREE.WebGLRenderTarget(1, 1, { samples });
  const normalMat = new THREE.MeshNormalMaterial();
  const material = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: sceneRT.texture },
      tDepth: { value: sceneRT.depthTexture },
      tNormal: { value: normalRT.texture },
      tPaper: { value: paperNoise() },
      resolution: { value: new THREE.Vector2(1, 1) },
      cameraNear: { value: camera.near },
      cameraFar: { value: camera.far },
      ink: { value: ink },
      grain: { value: grain },
      time: { value: 0 },
      toneMappingExposure: { value: renderer.toneMappingExposure },
    },
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const quad = new FullScreenQuad(material);
  const clear = new THREE.Color(0.5, 0.5, 1.0);
  const size = new THREE.Vector2();

  function setSize() {
    renderer.getDrawingBufferSize(size);
    sceneRT.setSize(size.x, size.y);
    normalRT.setSize(size.x, size.y);
    material.uniforms.resolution.value.copy(size);
  }

  function render(t) {
    material.uniforms.time.value = t;
    material.uniforms.toneMappingExposure.value = renderer.toneMappingExposure;

    camera.layers.enableAll();
    renderer.setRenderTarget(sceneRT);
    renderer.render(scene, camera);

    const { fog, background, overrideMaterial } = scene;
    scene.fog = null;
    scene.background = null;
    scene.overrideMaterial = normalMat;
    camera.layers.set(0);
    renderer.setRenderTarget(normalRT);
    renderer.setClearColor(clear, 1);
    renderer.clear();
    renderer.render(scene, camera);
    scene.fog = fog;
    scene.background = background;
    scene.overrideMaterial = overrideMaterial;
    camera.layers.enableAll();

    renderer.setRenderTarget(null);
    quad.render(renderer);
  }

  setSize();
  return { render, setSize, material };
}
