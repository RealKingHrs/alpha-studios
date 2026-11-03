import type { Tokens } from './palette';
import { isTap, useCursor } from './interact';

/** Placeholder bust. Milestone 4 replaces the body with the avatar renderer. */
export function Bust({
  tokens,
  position,
  rotY,
  onPick,
}: {
  tokens: Tokens;
  position: [number, number, number];
  rotY: number;
  onPick: () => void;
}) {
  const cursor = useCursor();
  const clay = <meshStandardMaterial color={tokens.silver} roughness={0.85} metalness={0} />;
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.3, 0.34, 0.9, 32]} />
        <meshStandardMaterial color={tokens.graphite} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.02, 0]} scale={[1.2, 0.6, 0.7]}>
        <sphereGeometry args={[0.33, 24, 16]} />
        {clay}
      </mesh>
      <mesh position={[0, 1.27, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.16, 16]} />
        {clay}
      </mesh>
      <mesh position={[0, 1.46, 0]}>
        <sphereGeometry args={[0.17, 24, 16]} />
        {clay}
      </mesh>
      {/* A small nose marks the front of the placeholder */}
      <mesh position={[0, 1.45, 0.17]}>
        <sphereGeometry args={[0.03, 12, 8]} />
        {clay}
      </mesh>
      <mesh
        position={[0, 1, 0]}
        visible={false}
        onClick={(e) => isTap(e) && (e.stopPropagation(), onPick())}
        {...cursor}
      >
        <cylinderGeometry args={[0.45, 0.45, 2, 10]} />
      </mesh>
    </group>
  );
}
