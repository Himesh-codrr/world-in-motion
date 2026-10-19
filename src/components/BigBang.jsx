import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { intro, SECTION_STARS, TL } from './SceneRig'

const N = 5000
const { clamp } = THREE.MathUtils
const RAMP = ['#FFFDF5', '#F0C76A', '#FF7655', '#A991FF'].map((c) => new THREE.Color(c)) // hot -> cool
const tmp = new THREE.Color()
const smoothstep = (x) => x * x * (3 - 2 * x)

function ring(m, mat, w, cam) {
  const on = w > 0 && w < 2.6
  m.visible = on
  if (!on) return
  m.scale.setScalar(0.5 + w * 9)
  const enter = smoothstep(clamp(w / 0.2, 0, 1))
  const leave = 1 - smoothstep(clamp((w - 1.8) / 0.8, 0, 1))
  mat.opacity = enter * leave * 0.42
  m.quaternion.copy(cam.quaternion)
}

// Intro: singularity -> big bang -> cooling debris -> constellation -> dive toward the first chapter star.
// The first chapter star sits exactly where the sculpture's core lives, so the reveal is spatially coherent.
export default function BigBang() {
  const grp = useRef(), pts = useRef(), ptsMat = useRef()
  const r1 = useRef(), r1m = useRef(), r2 = useRef(), r2m = useRef()
  const { dirs, pos } = useMemo(() => {
    const dirs = new Float32Array(N * 3), pos = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u)
      const sp = 2 + Math.pow(Math.random(), 2.2) * 14 // many slow, a few very fast
      dirs[i * 3] = r * Math.cos(a) * sp; dirs[i * 3 + 1] = u * sp; dirs[i * 3 + 2] = r * Math.sin(a) * sp
    }
    return { dirs, pos }
  }, [])

  useFrame(({ camera }) => {
    const t = intro.t
    if (intro.done) { grp.current.visible = false; return }
    const tau = Math.max(0, t - TL.BANG)
    const s = (1 - Math.exp(-0.55 * tau)) / 0.55 // debris decelerates (drag)
    for (let i = 0; i < N * 3; i++) pos[i] = dirs[i] * s
    pts.current.geometry.attributes.position.needsUpdate = true

    const cool = clamp(tau / 3.5, 0, 1) * 3, i0 = Math.min(2, Math.floor(cool))
    ptsMat.current.color.copy(tmp.copy(RAMP[i0]).lerp(RAMP[i0 + 1], cool - i0))
    const burstIn = smoothstep(clamp(tau / 0.22, 0, 1))
    const cooling = 1 - smoothstep(clamp((t - 4.2) / 1.4, 0, 1))
    ptsMat.current.opacity = 0.82 * burstIn * cooling

    ring(r1.current, r1m.current, tau, camera)
    ring(r2.current, r2m.current, tau - 0.35, camera)
  })

  const ringMat = { transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: false, side: THREE.DoubleSide }
  return (
    <group ref={grp} position={SECTION_STARS[0].position}>
      <points ref={pts} frustumCulled={false}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[pos, 3]} /></bufferGeometry>
        <pointsMaterial ref={ptsMat} size={0.07} sizeAttenuation transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} />
      </points>
      <mesh ref={r1} visible={false}><ringGeometry args={[0.95, 1, 96]} /><meshBasicMaterial ref={r1m} color="#F0C76A" {...ringMat} /></mesh>
      <mesh ref={r2} visible={false}><ringGeometry args={[0.97, 1, 96]} /><meshBasicMaterial ref={r2m} color="#A991FF" {...ringMat} /></mesh>
    </group>
  )
}
