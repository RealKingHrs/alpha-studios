import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Project } from '../../content/schema';
import type { Tokens } from '../palette';

type Device = Project['screenshots'][number]['device'];

/** Body and screen sizes in metres. Screens match the aspect ratio of the placeholder screenshots. */
const SIZES: Record<
  Device,
  { body: [number, number, number]; screen: [number, number]; radius: number }
> = {
  iphone: { body: [0.8, 1.62, 0.1], screen: [0.72, 1.5], radius: 0.1 },
  android: { body: [0.8, 1.62, 0.1], screen: [0.72, 1.5], radius: 0.07 },
  mac: { body: [2.5, 1.6, 0.07], screen: [2.4, 1.5], radius: 0.05 },
  browser: { body: [2.5, 1.6, 0.07], screen: [2.4, 1.38], radius: 0.05 },
};

interface Props {
  device: Device;
  texture: THREE.Texture;
  tokens: Tokens;
  position: [number, number, number];
  rotationY: number;
  /** Phase offset so devices do not float in step. */
  phase: number;
  reduce: boolean;
}

/** A floating device: a rounded body, a screen showing a screenshot, and for browsers a tab bar. */
export function DeviceFrame({
  device,
  texture,
  tokens,
  position,
  rotationY,
  phase,
  reduce,
}: Props) {
  const group = useRef<THREE.Group>(null);
  const spec = SIZES[device];
  const body = useMemo(
    () => new RoundedBoxGeometry(spec.body[0], spec.body[1], spec.body[2], 3, spec.radius),
    [spec],
  );
  useEffect(() => () => body.dispose(), [body]);

  useFrame(({ clock }) => {
    if (!group.current || reduce) return;
    group.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.6 + phase) * 0.05;
    group.current.rotation.y = rotationY + Math.sin(clock.elapsedTime * 0.3 + phase) * 0.04;
  });

  const frontZ = spec.body[2] / 2 + 0.002;
  return (
    <group ref={group} position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={body}>
        <meshStandardMaterial color={tokens.graphite} roughness={0.35} metalness={0.8} />
      </mesh>
      <mesh position={[0, device === 'browser' ? -0.06 : 0, frontZ]}>
        <planeGeometry args={spec.screen} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {device === 'browser' && (
        <group position={[0, spec.body[1] / 2 - 0.07, frontZ]}>
          {[-1, 0, 1].map((k) => (
            <mesh key={k} position={[-spec.body[0] / 2 + 0.16 + (k + 1) * 0.1, 0, 0]}>
              <circleGeometry args={[0.025, 16]} />
              <meshBasicMaterial color={tokens.silver} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
