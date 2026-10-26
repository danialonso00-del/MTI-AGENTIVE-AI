// Visor 3D del «modelo de ejemplo»: geometría paramétrica construida desde los rasgos de la pieza
// (contorno, bolsillo y taladros reales del fixture). No es una lectura del STEP del cliente.
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import type { MaterialId, OperationKind, PartFeatures } from '@/domain/types';
import { holePositions } from './PartDrawing';

const MM = 0.01;

function roundedRect(L: number, W: number, r: number) {
  const s = new THREE.Shape();
  s.moveTo(r, 0);
  s.lineTo(L - r, 0); s.quadraticCurveTo(L, 0, L, r);
  s.lineTo(L, W - r); s.quadraticCurveTo(L, W, L - r, W);
  s.lineTo(r, W); s.quadraticCurveTo(0, W, 0, W - r);
  s.lineTo(0, r); s.quadraticCurveTo(0, 0, r, 0);
  return s;
}
function circlePath(cx: number, cy: number, r: number) {
  const p = new THREE.Path();
  p.absarc(cx, cy, r, 0, Math.PI * 2, true);
  return p;
}

function buildGeometries(f: PartFeatures) {
  const holes = holePositions({ ...f } as never) as [number, number][];
  const make = (withPocket: boolean, depth: number) => {
    let shape: THREE.Shape;
    if (f.family === 'torneado') {
      shape = new THREE.Shape();
      shape.absarc(f.widthMm / 2, f.widthMm / 2, f.widthMm / 2, 0, Math.PI * 2, false);
    } else shape = roundedRect(f.lengthMm, f.widthMm, 4);
    for (const [x, y] of holes) shape.holes.push(circlePath(x, y, f.holes.diameterMm / 2));
    if (withPocket && f.pocket) {
      const px = (f.lengthMm - f.pocket.lengthMm) / 2;
      const py = (f.widthMm - f.pocket.widthMm) / 2;
      const r = 3;
      const p = new THREE.Path();
      p.moveTo(px + r, py);
      p.lineTo(px, py + r); // sentido inverso para agujero
      p.lineTo(px, py + f.pocket.widthMm - r);
      p.lineTo(px + r, py + f.pocket.widthMm);
      p.lineTo(px + f.pocket.lengthMm - r, py + f.pocket.widthMm);
      p.lineTo(px + f.pocket.lengthMm, py + f.pocket.widthMm - r);
      p.lineTo(px + f.pocket.lengthMm, py + r);
      p.lineTo(px + f.pocket.lengthMm - r, py);
      p.closePath();
      shape.holes.push(p);
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 28 });
    return g;
  };
  const pocketDepth = f.pocket?.depthMm ?? 0;
  const base = make(false, f.heightMm - pocketDepth);
  const top = f.pocket ? make(true, pocketDepth) : null;
  return { base, top, holes };
}

const COLORS: Record<MaterialId, string> = { 'al-6082-t6': '#c3cad4', 'steel-s275': '#7d8590', 'ss-304': '#aeb6c0' };
const GOLD = '#e6a817';

function Part({ f, material, highlight }: { f: PartFeatures; material: MaterialId | null; highlight?: OperationKind | null }) {
  const { base, top, holes } = useMemo(() => buildGeometries(f), [f]);
  const edgesBase = useMemo(() => new THREE.EdgesGeometry(base, 25), [base]);
  const edgesTop = useMemo(() => (top ? new THREE.EdgesGeometry(top, 25) : null), [top]);
  const color = material ? COLORS[material] : '#b6bcc6';
  const pocketDepth = f.pocket?.depthMm ?? 0;
  const edgeColor = highlight === 'desbarbado' || highlight === 'fresado' ? GOLD : '#334155';
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[(-f.lengthMm / 2) * MM, 0, (f.widthMm / 2) * MM]} scale={MM}>
      <mesh geometry={base} castShadow receiveShadow>
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.38} />
      </mesh>
      <lineSegments geometry={edgesBase}><lineBasicMaterial color={edgeColor} transparent opacity={highlight === 'desbarbado' || highlight === 'fresado' ? 1 : 0.35} /></lineSegments>
      {top && (
        <group position={[0, 0, f.heightMm - pocketDepth]}>
          <mesh geometry={top} castShadow receiveShadow>
            <meshStandardMaterial color={color} metalness={0.55} roughness={0.38} />
          </mesh>
          {edgesTop && <lineSegments geometry={edgesTop}><lineBasicMaterial color={edgeColor} transparent opacity={highlight === 'desbarbado' || highlight === 'fresado' ? 1 : 0.35} /></lineSegments>}
        </group>
      )}
      {highlight === 'bolsillo' && f.pocket && (
        <mesh position={[f.lengthMm / 2, f.widthMm / 2, f.heightMm - pocketDepth / 2]}>
          <boxGeometry args={[f.pocket.lengthMm - 0.4, f.pocket.widthMm - 0.4, pocketDepth - 0.2]} />
          <meshStandardMaterial color={GOLD} transparent opacity={0.55} emissive={GOLD} emissiveIntensity={0.35} />
        </mesh>
      )}
      {highlight === 'taladrado' && holes.map(([x, y], i) => (
        <mesh key={i} position={[x, y, f.heightMm / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[f.holes.diameterMm / 2 + 0.6, f.holes.diameterMm / 2 + 0.6, f.heightMm + 6, 28]} />
          <meshStandardMaterial color={GOLD} transparent opacity={0.75} emissive={GOLD} emissiveIntensity={0.4} />
        </mesh>
      ))}
      {highlight === 'corte' && (
        <mesh position={[f.lengthMm / 2, f.widthMm / 2, f.blankMm.height / 2 - (f.blankMm.height - f.heightMm) / 2]}>
          <boxGeometry args={[f.blankMm.length, f.blankMm.width, f.blankMm.height]} />
          <meshBasicMaterial color={GOLD} wireframe transparent opacity={0.6} />
        </mesh>
      )}
      {(highlight === 'inspeccion' || highlight === 'torneado') && (
        <mesh position={[f.lengthMm / 2, f.widthMm / 2, f.heightMm / 2]}>
          <boxGeometry args={[f.lengthMm + 4, f.widthMm + 4, f.heightMm + 4]} />
          <meshBasicMaterial color={GOLD} wireframe transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

export default function PartViewer3D({ features, material, highlight, autoRotate = true }: { features: PartFeatures; material: MaterialId | null; highlight?: OperationKind | null; autoRotate?: boolean }) {
  const span = Math.max(features.lengthMm, features.widthMm) * MM;
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [span * 0.95, span * 0.8, span * 1.15], fov: 38, near: 0.01, far: 100 }} gl={{ antialias: true, preserveDrawingBuffer: true }}>
      <color attach="background" args={['#0f1626']} />
      <hemisphereLight args={['#dbe4f3', '#1a2438', 0.9]} />
      <directionalLight position={[3, 5, 2]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 2, -2]} intensity={0.6} color="#f0bc3d" />
      <Part f={features} material={material} highlight={highlight} />
      <gridHelper args={[span * 3, 30, '#2a3a57', '#1c2a42']} position={[0, -0.001, 0]} />
      <OrbitControls makeDefault enablePan={false} autoRotate={autoRotate} autoRotateSpeed={0.8} minDistance={span * 0.6} maxDistance={span * 4} />
    </Canvas>
  );
}
