import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { NeuralLinkState, NEURAL_STATES, AudioBands } from './neuralTypes'

interface NeuralBrainCanvasProps {
  state: NeuralLinkState
  audioBandsRef: React.MutableRefObject<AudioBands>
  reducedMotion?: boolean
  className?: string
}

export const NeuralBrainCanvas: React.FC<NeuralBrainCanvasProps> = ({
  state,
  audioBandsRef,
  reducedMotion = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<NeuralLinkState>(state)
  stateRef.current = state
  const reducedMotionRef = useRef<boolean>(reducedMotion)
  reducedMotionRef.current = reducedMotion

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let isDisposed = false
    let animId: number | null = null

    // 1. Setup Renderer
    const width = Math.max(container.clientWidth, 100)
    const height = Math.max(container.clientHeight, 100)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true,
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(width, height)
    renderer.setClearColor(0x020408, 1)
    container.appendChild(renderer.domElement)

    // 2. Scene & Camera
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 60)
    camera.position.set(0, 0.35, 4.4)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.enablePan = false
    controls.minDistance = 2.6
    controls.maxDistance = 9
    controls.rotateSpeed = 0.55

    // 3. Post-processing: UnrealBloomPass
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.9, 0.62, 0.08)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())

    // 4. Background Digital Grid
    const gridMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = vec4(position.xy, 0.9995, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        float gridLine(vec2 c){
          vec2 g = abs(fract(c) - 0.5);
          float l = max(smoothstep(0.492, 0.5, g.x), smoothstep(0.492, 0.5, g.y));
          return l;
        }
        void main(){
          vec2 c = vUv * 34.0;
          float l = gridLine(c);
          float d = distance(vUv, vec2(0.5, 0.46));
          float fade = smoothstep(0.78, 0.18, d);
          float breath = 0.72 + 0.28 * sin(uTime * 0.5);
          vec3 cyan = vec3(0.0, 0.55, 0.75);
          vec3 violet = vec3(0.35, 0.2, 0.65);
          vec3 col = mix(cyan, violet, smoothstep(0.0, 1.0, vUv.x));
          float a = l * fade * 0.20 * breath;
          gl_FragColor = vec4(col * a, a);
        }
      `,
    })
    const gridQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), gridMat)
    gridQuad.frustumCulled = false
    gridQuad.renderOrder = -10
    scene.add(gridQuad)

    // 5. Shared Uniforms
    const U = {
      uTime: { value: 0 },
      uPulseSpeed: { value: 1.3 },
      uW0: { value: 1 },
      uW1: { value: 0 },
      uW2: { value: 0 },
      uW3: { value: 0 },
      uAudio: { value: 0 },
      uWave: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uColor: { value: new THREE.Color(NEURAL_STATES.idle.color) },
      uSize: { value: 0.115 },
      uLineBase: { value: 0.06 },
    }

    const DISP = `
      float hash13(vec3 p){
        p = fract(p * 0.1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }
      vec3 displace(vec3 p, float h){
        vec3 n = normalize(p);
        vec3 d = vec3(0.0);
        d += n * 0.020 * sin(uTime * 1.4 + h * 6.2831) * uW0;
        float r = length(p);
        d += n * 0.085 * uW1 * (0.25 + uWave) * sin(r * 7.0 - uTime * 5.0 + h * 1.7);
        d += n * uW3 * (
          uBass * 0.13 +
          uMid * 0.11 * sin(p.y * 9.0 + uTime * 9.0) +
          uTreble * 0.07 * sin(p.x * 14.0 - uTime * 14.0) +
          0.02 * sin(uTime * 12.0 + h * 6.2831)
        );
        return d;
      }
    `

    // 6. Brain Geometry: Ellipsoid + Sulci + Hemispheric Fissure
    const NODES = 2000
    function brainPoint(): [number, number, number] {
      const u = Math.random() * 2 - 1
      const th = Math.random() * Math.PI * 2
      const s = Math.sqrt(Math.max(0, 1 - u * u))
      const x = s * Math.cos(th)
      const y = u
      const z = s * Math.sin(th)
      let px = x * 1.16
      let py = y * 0.8
      let pz = z * 1.34
      const sulci =
        0.5 + 0.5 * Math.sin(7.0 * Math.atan2(z, x) + 5.0 * y + 2.0 * Math.sin(y * 6.28))
      const shrink = 1 - 0.1 * sulci
      px *= shrink
      py *= shrink
      pz *= shrink
      const f = 0.17 * Math.exp(-(px * px) / 0.018)
      px += (px >= 0 ? 1 : -1) * f
      py -= f * 0.25
      if (py < 0) py *= 0.9
      return [px, py, pz]
    }

    const nodePos = new Float32Array(NODES * 3)
    for (let i = 0; i < NODES; i++) {
      const p = brainPoint()
      nodePos[i * 3] = p[0]
      nodePos[i * 3 + 1] = p[1]
      nodePos[i * 3 + 2] = p[2]
    }

    const cand: [number, number][] = []
    const MAXD2 = 0.042
    for (let i = 0; i < NODES; i++) {
      const ax = nodePos[i * 3]
      const ay = nodePos[i * 3 + 1]
      const az = nodePos[i * 3 + 2]
      for (let j = i + 1; j < NODES; j++) {
        const dx = nodePos[j * 3] - ax
        const dy = nodePos[j * 3 + 1] - ay
        const dz = nodePos[j * 3 + 2] - az
        const d2 = dx * dx + dy * dy + dz * dz
        if (d2 < MAXD2) {
          cand.push(Math.random() < 0.5 ? [i, j] : [j, i])
        }
      }
    }
    for (let i = cand.length - 1; i > 0; i--) {
      const k = (Math.random() * (i + 1)) | 0
      const tmp = cand[i]
      cand[i] = cand[k]
      cand[k] = tmp
    }
    const LINKS = Math.min(cand.length, 4200)

    const linePos = new Float32Array(LINKS * 6)
    const lineT = new Float32Array(LINKS * 2)
    const lineSeed = new Float32Array(LINKS * 2)
    for (let s = 0; s < LINKS; s++) {
      const pair = cand[s]
      const a = pair[0]
      const b = pair[1]
      const o = s * 6
      linePos[o] = nodePos[a * 3]
      linePos[o + 1] = nodePos[a * 3 + 1]
      linePos[o + 2] = nodePos[a * 3 + 2]
      linePos[o + 3] = nodePos[b * 3]
      linePos[o + 4] = nodePos[b * 3 + 1]
      linePos[o + 5] = nodePos[b * 3 + 2]
      lineT[s * 2] = 0
      lineT[s * 2 + 1] = 1
      lineSeed[s * 2] = Math.random()
      lineSeed[s * 2 + 1] = lineSeed[s * 2]
    }

    // Nodes (Particles)
    const nodeGeo = new THREE.BufferGeometry()
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePos, 3))
    const nodeMat = new THREE.ShaderMaterial({
      uniforms: U,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float uTime, uPulseSpeed, uAudio, uW2, uSize;
        uniform float uW0, uW1, uW3, uWave, uBass, uMid, uTreble;
        varying float vB;
        ${DISP}
        void main(){
          float h = hash13(position);
          vec3 p = position + displace(position, h);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float flick = uW2 * step(0.74, fract(h * 9.0 + uTime * 4.2));
          vB = 0.45 + 0.55 * sin(uTime * uPulseSpeed + h * 6.2831);
          vB = mix(vB, 0.82, uW2);
          vB += uAudio * 0.9 + flick * 0.85;
          gl_PointSize = uSize * (0.75 + 0.6 * h) * (1.0 + uAudio * 0.9 + flick * 0.55) * (140.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vB;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float core = smoothstep(0.5, 0.10, d);
          float halo = smoothstep(0.5, 0.0, d) * 0.35;
          vec3 col = mix(uColor, vec3(1.0), core * 0.42);
          float a = (core * 0.9 + halo) * vB;
          gl_FragColor = vec4(col * a, a);
        }
      `,
    })
    const nodes = new THREE.Points(nodeGeo, nodeMat)

    // Synapses (Lines)
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3))
    lineGeo.setAttribute('aT', new THREE.BufferAttribute(lineT, 1))
    lineGeo.setAttribute('aSeed', new THREE.BufferAttribute(lineSeed, 1))
    const lineMat = new THREE.ShaderMaterial({
      uniforms: U,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aT;
        attribute float aSeed;
        varying float vT;
        varying float vSeed;
        varying float vH;
        uniform float uTime, uW0, uW1, uW3, uWave, uBass, uMid, uTreble;
        ${DISP}
        void main(){
          vT = aT;
          vSeed = aSeed;
          vH = hash13(position);
          vec3 p = position + displace(position, vH);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uTime, uW2, uLineBase;
        varying float vT;
        varying float vSeed;
        varying float vH;
        void main(){
          float head = fract(uTime * (0.4 + vSeed * 1.1) + vSeed * 7.31);
          float d = abs(head - vT);
          d = min(d, 1.0 - d);
          float pulse = exp(-d * d * 160.0);
          float act = uLineBase + uW2 * pulse * 1.65 + pulse * 0.08;
          gl_FragColor = vec4(uColor * act, act);
        }
      `,
    })
    const synapses = new THREE.LineSegments(lineGeo, lineMat)

    // Dust
    const DUST = 260
    const dustPos = new Float32Array(DUST * 3)
    for (let i = 0; i < DUST; i++) {
      const r = 5 + Math.random() * 5
      const u = Math.random() * 2 - 1
      const th = Math.random() * Math.PI * 2
      const s = Math.sqrt(Math.max(0, 1 - u * u))
      dustPos[i * 3] = r * s * Math.cos(th)
      dustPos[i * 3 + 1] = r * u
      dustPos[i * 3 + 2] = r * s * Math.sin(th)
    }
    const dustGeo = new THREE.BufferGeometry()
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
    const dustMat = new THREE.PointsMaterial({
      size: 0.03,
      color: 0x2a4a7a,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const dust = new THREE.Points(dustGeo, dustMat)

    const brainGroup = new THREE.Group()
    brainGroup.add(nodes, synapses)
    brainGroup.scale.setScalar(1.12)
    scene.add(brainGroup, dust)

    // Interpolation state
    const cur = {
      color: new THREE.Color(NEURAL_STATES.idle.color),
      bloom: NEURAL_STATES.idle.bloom,
      pulse: NEURAL_STATES.idle.pulse,
      rot: NEURAL_STATES.idle.rot,
      line: NEURAL_STATES.idle.line,
      w0: 1,
      w1: 0,
      w2: 0,
      w3: 0,
    }
    const _tmpColor = new THREE.Color()
    const clock = new THREE.Clock()
    let rotY = 0

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    const animate = () => {
      if (isDisposed) return
      animId = requestAnimationFrame(animate)

      const dt = Math.min(clock.getDelta(), 0.05)
      const t = clock.elapsedTime
      const k = 1 - Math.exp(-dt * 3.2)

      const currentStateKey = stateRef.current
      const S = NEURAL_STATES[currentStateKey]
      const bands = audioBandsRef.current || { bass: 0, mid: 0, treble: 0, level: 0 }

      // State interpolation
      cur.color.lerp(_tmpColor.setHex(S.color), k)
      cur.bloom = lerp(cur.bloom, S.bloom + bands.level * 0.5, k)
      cur.pulse = lerp(cur.pulse, S.pulse, k)
      cur.rot = lerp(cur.rot, S.rot, k)
      cur.line = lerp(cur.line, S.line, k)
      cur.w0 = lerp(cur.w0, currentStateKey === 'idle' ? 1 : 0, k)
      cur.w1 = lerp(cur.w1, currentStateKey === 'listening' ? 1 : 0, k)
      cur.w2 = lerp(cur.w2, currentStateKey === 'thinking' ? 1 : 0, k)
      cur.w3 = lerp(cur.w3, currentStateKey === 'speaking' ? 1 : 0, k)

      U.uTime.value = t
      U.uPulseSpeed.value = cur.pulse
      U.uColor.value.copy(cur.color)
      U.uW0.value = cur.w0
      U.uW1.value = cur.w1
      U.uW2.value = cur.w2
      U.uW3.value = cur.w3
      U.uAudio.value = lerp(U.uAudio.value, bands.level, k * 2.2)
      U.uWave.value = lerp(U.uWave.value, bands.level, k * 2.2)
      U.uBass.value = lerp(U.uBass.value, bands.bass, k * 2.5)
      U.uMid.value = lerp(U.uMid.value, bands.mid, k * 2.5)
      U.uTreble.value = lerp(U.uTreble.value, bands.treble, k * 2.5)
      U.uLineBase.value = cur.line
      gridMat.uniforms.uTime.value = t

      if (!reducedMotionRef.current) {
        rotY += cur.rot * dt
        brainGroup.rotation.y = rotY
        brainGroup.rotation.z = Math.sin(t * 0.23) * 0.05
        brainGroup.position.y = Math.sin(t * 0.6) * 0.085
        dust.rotation.y = t * 0.012
      }

      bloom.strength = cur.bloom
      controls.update()
      composer.render()
    }

    animate()

    // 7. ResizeObserver (Strict Container Boundary)
    const resizeObserver = new ResizeObserver((entries) => {
      if (isDisposed) return
      for (const entry of entries) {
        const newW = Math.max(entry.contentRect.width, 50)
        const newH = Math.max(entry.contentRect.height, 50)
        camera.aspect = newW / newH
        camera.updateProjectionMatrix()
        renderer.setSize(newW, newH)
        composer.setSize(newW, newH)
        bloom.setSize(newW, newH)
      }
    })
    resizeObserver.observe(container)

    // 8. Lifecycle cleanup on unmount
    return () => {
      isDisposed = true
      if (animId !== null) {
        cancelAnimationFrame(animId)
      }
      resizeObserver.disconnect()
      controls.dispose()

      // Geometries
      gridQuad.geometry.dispose()
      nodeGeo.dispose()
      lineGeo.dispose()
      dustGeo.dispose()

      // Materials
      gridMat.dispose()
      nodeMat.dispose()
      lineMat.dispose()
      dustMat.dispose()

      // Post-processing & Renderer
      bloom.dispose()
      composer.dispose()
      renderer.dispose()

      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none pointer-events-auto ${className}`}
      aria-label="Palco Neural 3D"
    />
  )
}
