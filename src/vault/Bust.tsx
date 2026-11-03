import { useState } from 'react';
import { AvatarBust } from '../avatar/AvatarBust';
import type { Tokens } from './palette';
import { isTap, useCursor } from './interact';

/** A plinth with a bust on it: the member's avatar when a record is given, a plain placeholder otherwise. */
export function Bust({
  tokens,
  position,
  rotY,
  onPick,
  record,
  reduce = false,
}: {
  tokens: Tokens;
  position: [number, number, number];
  rotY: number;
  onPick: () => void;
  record?: unknown;
  reduce?: boolean;
}) {
  const cursor = useCursor();
  const [reactKey, setReactKey] = useState(0);
  const clay = <meshStandardMaterial color={tokens.silver} roughness={0.85} metalness={0} />;
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.3, 0.34, 0.9, 32]} />
        <meshStandardMaterial color={tokens.graphite} roughness={0.5} metalness={0.3} />
      </mesh>
      {record ? (
        <AvatarBust record={record} position={[0, 0.9, 0]} reduce={reduce} reactKey={reactKey} />
      ) : (
        <>
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
        </>
      )}
      <mesh
        position={[0, 1, 0]}
        visible={false}
        onClick={(e) => isTap(e) && (e.stopPropagation(), setReactKey((k) => k + 1), onPick())}
        {...cursor}
      >
        <cylinderGeometry args={[0.45, 0.45, 2, 10]} />
      </mesh>
    </group>
  );
}
