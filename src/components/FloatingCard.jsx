import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, RoundedBox, Text } from '@react-three/drei'
import * as THREE from 'three'

const { damp } = THREE.MathUtils

export const GLASS = {
  color: '#0C1424', roughness: 0.12, metalness: 0.14, transmission: 0.72, thickness: 0.55,
  ior: 1.42, transparent: true, opacity: 0.9, envMapIntensity: 1.6, side: THREE.DoubleSide,
}
const SHARDS = [[1.45, 0.72, 0.12, 0.1], [1.15, -0.72, 0.16, 0.08], [-1.5, -0.8, 0.1, 0.12], [0.25, 0.95, 0.14, 0.07], [1.6, 0.05, 0.2, 0.09]]

export default function FloatingCard({ card, position, motion, nodeRef }) {
  const g = useRef(), edge = useRef(), shards = useRef()
  const [hover, setHover] = useState(false)
  const phase = useMemo(() => position[0] * 0.7, [position])

  useFrame(({ camera, clock }, delta) => {
    const o = g.current
    const yaw = Math.atan2(camera.position.x - position[0], camera.position.z - position[2]) + (hover && motion ? 0.16 : 0)
    const d = Math.atan2(Math.sin(yaw - o.rotation.y), Math.cos(yaw - o.rotation.y)) // shortest turn: no 360° flips
    o.rotation.y += d * (1 - Math.exp(-5 * delta))
    o.rotation.x = damp(o.rotation.x, hover && motion ? -0.12 : 0, 5, delta)
    o.rotation.z = Math.sin(clock.elapsedTime * 0.8 + phase) * 0.02 * motion
    o.position.z = damp(o.position.z, position[2] + (hover ? 0.28 : 0), 5, delta)
    edge.current.opacity = damp(edge.current.opacity, hover ? 1 : 0.4, 14, delta)
    shards.current.rotation.y += (0.01 + (hover ? 0.05 : 0)) * motion
  })

  const over = (e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }
  const out = () => { setHover(false); document.body.style.cursor = '' }
  const click = () => card.url && window.open(card.url, '_blank', 'noopener,noreferrer')

  return (
    <Float speed={1.1} rotationIntensity={0.08 * motion} floatIntensity={0.22 * motion}>
      <group ref={(node) => { g.current = node; nodeRef?.(node) }} position={position}>
        <RoundedBox args={[3.7, 2.15, 0.12]} radius={0.12} smoothness={6} castShadow receiveShadow onPointerOver={over} onPointerOut={out} onClick={click}>
          <meshPhysicalMaterial {...GLASS} />
        </RoundedBox>
        <RoundedBox args={[3.78, 2.23, 0.1]} radius={0.14} smoothness={4} position={[0, 0, -0.03]}>
          <meshBasicMaterial ref={edge} color={card.accent} transparent opacity={0.4} toneMapped={false} />
        </RoundedBox>
        <mesh position={[0, 0, 0.08]}>
          <planeGeometry args={[3.5, 1.95]} />
          <meshBasicMaterial color={card.accent} transparent opacity={0.075} depthWrite={false} />
        </mesh>
        <Text position={[-1.42, 0.86, 0.13]} fontSize={0.14} letterSpacing={0.05} color={card.accent} anchorX="left" anchorY="top">{card.eyebrow}</Text>
        <Text position={[-1.42, 0.58, 0.13]} fontSize={0.34} maxWidth={2.8} lineHeight={0.9} color="#C3CEDF" anchorX="left" anchorY="top">{card.title}</Text>
        <Text position={[-1.42, -0.2, 0.13]} fontSize={0.13} maxWidth={2.7} lineHeight={1.35} color="#7A869E" anchorX="left" anchorY="top">{card.detail}</Text>
        <group ref={shards}>
          {SHARDS.map(([x, y, z, s], i) => (
            <mesh key={i} position={[x, y, z]} scale={s} rotation={[i, i * 0.7, 0]} castShadow>
              <octahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color={card.accent} emissive={card.accent} emissiveIntensity={0.55} toneMapped={false} />
            </mesh>
          ))}
        </group>
      </group>
    </Float>
  )
}
