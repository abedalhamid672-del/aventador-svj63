import { MeshReflectorMaterial } from '@react-three/drei';
import { useExperience } from '../app/store';

const FLOOR_COLOR = '#0a0a0b';

/**
 * Studio floor. High quality renders a blurred, depth-faded reflection; it is heavily blurred,
 * so 256px is visually identical to 512px at roughly half the cost. Low quality falls back to a
 * plain dark floor and relies on the car's contact shadow.
 */
export function Floor() {
  const quality = useExperience((s) => s.quality);

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.006}>
      <planeGeometry args={[60, 60]} />
      {quality === 'high' ? (
        <MeshReflectorMaterial
          resolution={256}
          blur={[300, 90]}
          mixBlur={1}
          mixStrength={3}
          mixContrast={1}
          depthScale={1.1}
          minDepthThreshold={0.35}
          maxDepthThreshold={1.3}
          mirror={0.6}
          roughness={0.9}
          metalness={0.5}
          color={FLOOR_COLOR}
        />
      ) : (
        <meshStandardMaterial color={FLOOR_COLOR} roughness={0.85} metalness={0.2} />
      )}
    </mesh>
  );
}
