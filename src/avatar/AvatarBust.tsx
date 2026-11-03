import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { describeAvatar, readSwatches, type AvatarSpec } from './kit';

interface Props {
  /** A stored avatar record. Anything else is normalised, so a bad record still renders. */
  record: unknown;
  position?: [number, number, number];
  rotationY?: number;
  /** Follow the pointer with the head (desktop). Otherwise the head turns slowly by itself. */
  follow?: boolean;
  /** Changing this number plays a short nod, the reaction to being selected. */
  reactKey?: number;
  /** Reduced motion: hold still, no blinking. */
  reduce?: boolean;
  /** Overall scale. 1 fits a bust on a plinth in the gallery. */
  scale?: number;
  /** 'low' halves the smoothness of every round part. For busts seen from a distance. */
  detail?: 'high' | 'low';
}

/** Height of the surface of the head ellipsoid at (x, y), so features sit on the face. */
const faceZ = (head: AvatarSpec['head'], x: number, y: number) =>
  head.d * Math.sqrt(Math.max(0, 1 - (x / head.w) ** 2 - (y / head.h) ** 2));

/** Hair caps cover the top of the head: the sphere is cut at this angle from the crown. */
const CAP = {
  short: 0.58,
  buzz: 0.5,
  long: 0.6,
  sidePart: 0.6,
  bun: 0.56,
  spiky: 0.54,
  curly: 0.5,
} as const;

/**
 * One avatar bust, rebuilt from a record. The same component is used in the builder, the crew gallery and
 * the project rooms, so a member looks the same everywhere. Origin is the base of the shoulders.
 */
export function AvatarBust({
  record,
  position = [0, 0, 0],
  rotationY = 0,
  follow = false,
  reactKey = 0,
  reduce = false,
  scale = 1,
  detail = 'high',
}: Props) {
  const S = (n: number) => (detail === 'low' ? Math.max(6, Math.round(n / 2)) : n);
  const spec = useMemo(() => describeAvatar(record), [record]);
  const color = useMemo(() => {
    const read = readSwatches();
    return (name: string) => new THREE.Color(read(name));
  }, []);

  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Mesh>(null);
  const eyeR = useRef<THREE.Mesh>(null);
  const react = useRef(-1);
  useEffect(() => {
    if (reactKey > 0) react.current = performance.now() / 1000;
  }, [reactKey]);

  useFrame(({ clock, pointer }) => {
    const t = clock.elapsedTime;
    const idle = !reduce;
    if (body.current) body.current.scale.y = 1 + (idle ? Math.sin(t * 1.6) * 0.012 : 0);
    if (head.current) {
      const targetYaw = follow ? pointer.x * 0.55 : idle ? Math.sin(t * 0.35) * 0.3 : 0;
      const targetPitch = follow ? -pointer.y * 0.25 : 0;
      let nod = 0;
      if (react.current > 0) {
        const k = (performance.now() / 1000 - react.current) / 0.9;
        nod = k < 1 ? Math.sin(k * Math.PI * 2) * 0.2 * (1 - k) : 0;
      }
      head.current.rotation.y += (targetYaw - head.current.rotation.y) * 0.08;
      head.current.rotation.x += (targetPitch + nod - head.current.rotation.x) * 0.2;
    }
    const blink = idle && t % 4.2 > 4.05 ? 0.1 : 1;
    if (eyeL.current) eyeL.current.scale.y = blink;
    if (eyeR.current) eyeR.current.scale.y = blink;
  });

  const { head: H, eyes: E, brows: B, nose: N, mouth: M } = spec;
  const skin = color(spec.skin);
  const hair = color(spec.hair.color);
  const outfit = color(spec.outfit.color);
  const headY = 0.33 + H.h;
  const clay = (c: THREE.Color, rough = 0.85) => (
    <meshStandardMaterial color={c} roughness={rough} metalness={0} />
  );
  const metal = <meshStandardMaterial color="#e9ecef" roughness={0.25} metalness={0.9} />;

  const eyeY = E.y + 0.02;
  const mouthY = -H.h * 0.45;
  const nz = faceZ(H, 0, -0.02);
  const capAngle = CAP[spec.hair.style as keyof typeof CAP];

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <group ref={body}>
        {/* shoulders and neck */}
        <mesh position={[0, 0.1, 0]} scale={[0.34, 0.17, 0.19]}>
          <sphereGeometry args={[1, S(32), S(20)]} />
          {clay(outfit)}
        </mesh>
        <mesh position={[0, 0.27, 0]}>
          <cylinderGeometry args={[0.055, 0.065, 0.14, S(20)]} />
          {clay(skin)}
        </mesh>
        {spec.outfit.style === 'hoodie' && (
          <>
            <mesh position={[0, 0.26, -0.01]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.09, 0.035, 12, 32]} />
              {clay(outfit)}
            </mesh>
            <mesh position={[0, 0.27, -0.07]} scale={[1.2, 1, 0.6]}>
              <sphereGeometry args={[0.1, S(20), S(14)]} />
              {clay(outfit)}
            </mesh>
          </>
        )}
        {spec.outfit.style === 'collar' &&
          [-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.05, 0.25, 0.07]} rotation={[0.3, 0, s * 0.7]}>
              <boxGeometry args={[0.07, 0.05, 0.015]} />
              {clay(new THREE.Color('#e9ecef'), 0.7)}
            </mesh>
          ))}
        {spec.outfit.style === 'tee' && (
          <mesh position={[0, 0.25, 0.005]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.075, 0.012, 10, 32]} />
            {clay(outfit.clone().multiplyScalar(0.7))}
          </mesh>
        )}
        {spec.chain !== 'none' && (
          <mesh position={[0, 0.2, 0.02]} rotation={[Math.PI / 2.4, 0, 0]} scale={[1, 1, 1]}>
            <torusGeometry args={[0.1, spec.chain === 'thick' ? 0.014 : 0.006, 10, 40]} />
            {metal}
          </mesh>
        )}
      </group>

      <group ref={head} position={[0, headY, 0]}>
        <mesh scale={[H.w, H.h, H.d]}>
          <sphereGeometry args={[1, S(40), S(28)]} />
          {clay(skin, 0.75)}
        </mesh>
        {/* ears */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * H.w * 0.98, -0.01, 0]} scale={[0.5, 1, 0.8]}>
            <sphereGeometry args={[0.035, S(14), S(10)]} />
            {clay(skin)}
          </mesh>
        ))}
        {spec.earrings === 'stud' &&
          [-1, 1].map((s) => (
            <mesh key={s} position={[s * (H.w + 0.012), -0.055, 0.005]}>
              <sphereGeometry args={[0.012, S(10), S(8)]} />
              {metal}
            </mesh>
          ))}
        {spec.earrings === 'hoop' &&
          [-1, 1].map((s) => (
            <mesh
              key={s}
              position={[s * (H.w + 0.012), -0.075, 0.005]}
              rotation={[0, Math.PI / 2, 0]}
            >
              <torusGeometry args={[0.028, 0.004, 8, 24]} />
              {metal}
            </mesh>
          ))}

        {/* eyes and brows */}
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh
              ref={s < 0 ? eyeL : eyeR}
              position={[s * E.gap, eyeY, faceZ(H, s * E.gap, eyeY) - 0.004]}
              scale={[1, 1.15, 0.6]}
            >
              <sphereGeometry args={[E.r, S(14), S(10)]} />
              <meshStandardMaterial color="#1b1b1d" roughness={0.3} />
            </mesh>
            <mesh
              position={[s * E.gap, eyeY + 0.045, faceZ(H, s * E.gap, eyeY + 0.045) + 0.002]}
              rotation={[0, 0, s * -B.tilt]}
            >
              <boxGeometry args={[B.w, B.t, 0.01]} />
              {clay(hair)}
            </mesh>
          </group>
        ))}

        {/* nose */}
        <mesh position={[0, -0.02, nz + N.z * 0.5]} scale={[1, 1.1, 1]}>
          <sphereGeometry args={[N.r, S(14), S(10)]} />
          {clay(skin.clone().multiplyScalar(0.96))}
        </mesh>

        {/* mouth */}
        <group position={[0, mouthY, faceZ(H, 0, mouthY) + 0.002]}>
          {M.kind === 'flat' && (
            <mesh>
              <boxGeometry args={[M.w, 0.008, 0.008]} />
              <meshStandardMaterial color="#7a3b3b" roughness={0.6} />
            </mesh>
          )}
          {(M.kind === 'smile' || M.kind === 'smirk') && (
            <mesh rotation={[0, 0, Math.PI + (M.kind === 'smirk' ? 0.25 : 0)]}>
              <torusGeometry args={[M.w * 0.6, 0.006, 8, 20, Math.PI * 0.8]} />
              <meshStandardMaterial color="#7a3b3b" roughness={0.6} />
            </mesh>
          )}
          {M.kind === 'open' && (
            <mesh scale={[1, 0.7, 0.4]}>
              <sphereGeometry args={[M.w * 0.5, S(14), S(10)]} />
              <meshStandardMaterial color="#5a2a2a" roughness={0.6} />
            </mesh>
          )}
        </group>

        {/* glasses */}
        {spec.glasses.style !== 'none' && (
          <group position={[0, eyeY, faceZ(H, 0, eyeY) + 0.012]}>
            {[-1, 1].map((s) => (
              <mesh
                key={s}
                position={[s * E.gap, 0, 0]}
                rotation={[0, 0, spec.glasses.style === 'square' ? Math.PI / 4 : 0]}
                scale={spec.glasses.style === 'aviator' ? [1.1, 1.3, 1] : [1, 1, 1]}
              >
                <torusGeometry
                  args={[E.r * 1.9, 0.004, 8, spec.glasses.style === 'square' ? 4 : 28]}
                />
                {clay(color(spec.glasses.color), 0.4)}
              </mesh>
            ))}
            <mesh>
              <boxGeometry args={[E.gap * 0.5, 0.004, 0.004]} />
              {clay(color(spec.glasses.color), 0.4)}
            </mesh>
          </group>
        )}

        {/* hair */}
        {spec.hair.style !== 'none' && spec.hair.style !== 'curly' && (
          <mesh
            scale={[H.w * (spec.hair.style === 'buzz' ? 1.02 : 1.06), H.h * 1.05, H.d * 1.06]}
            position={[0, 0.005, -0.004]}
          >
            <sphereGeometry args={[1, S(36), S(20), 0, Math.PI * 2, 0, Math.PI * capAngle]} />
            {clay(hair)}
          </mesh>
        )}
        {spec.hair.style === 'long' && (
          <mesh position={[0, -H.h * 0.35, -H.d * 0.35]} scale={[H.w * 1.1, H.h * 1.0, H.d * 0.7]}>
            <sphereGeometry args={[1, S(24), S(16)]} />
            {clay(hair)}
          </mesh>
        )}
        {spec.hair.style === 'bun' && (
          <mesh position={[0, H.h * 1.05, -H.d * 0.2]}>
            <sphereGeometry args={[0.065, S(20), S(14)]} />
            {clay(hair)}
          </mesh>
        )}
        {spec.hair.style === 'spiky' &&
          [0, 1, 2, 3, 4, 5, 6].map((k) => {
            const a = (k / 7) * Math.PI * 2;
            return (
              <mesh
                key={k}
                position={[Math.sin(a) * H.w * 0.55, H.h * 0.88, Math.cos(a) * H.d * 0.45 - 0.02]}
                rotation={[Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5]}
              >
                <coneGeometry args={[0.03, 0.09, S(10)]} />
                {clay(hair)}
              </mesh>
            );
          })}
        {spec.hair.style === 'curly' &&
          Array.from({ length: 16 }, (_, k) => {
            const a = (k / 16) * Math.PI * 2;
            const ring = k % 2 === 0 ? 0.82 : 0.55;
            return (
              <mesh
                key={k}
                position={[
                  Math.sin(a) * H.w * ring,
                  H.h * (0.5 + (k % 3) * 0.17),
                  Math.cos(a) * H.d * ring * 0.8 - 0.015,
                ]}
              >
                <sphereGeometry args={[0.05, S(14), S(10)]} />
                {clay(hair)}
              </mesh>
            );
          })}
        {spec.hair.style === 'curly' &&
          [0, 1, 2, 3, 4].map((k) => (
            <mesh
              key={`crown-${k}`}
              position={[
                (k - 2) * H.w * 0.32,
                H.h * (k % 2 === 0 ? 0.9 : 0.82),
                H.d * (0.1 + (k % 2) * 0.28),
              ]}
            >
              <sphereGeometry args={[0.055, S(14), S(10)]} />
              {clay(hair)}
            </mesh>
          ))}
        {spec.hair.style === 'sidePart' && (
          <mesh
            position={[-H.w * 0.35, H.h * 0.62, H.d * 0.5]}
            rotation={[0.5, 0, 0.35]}
            scale={[H.w * 0.75, 0.04, H.d * 0.6]}
          >
            <sphereGeometry args={[1, S(18), S(12)]} />
            {clay(hair)}
          </mesh>
        )}

        {/* facial hair */}
        {spec.facialHair.style === 'stubble' && (
          <mesh scale={[H.w * 1.008, H.h * 1.008, H.d * 1.008]}>
            <sphereGeometry
              args={[1, S(32), S(16), 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38]}
            />
            <meshStandardMaterial color={hair} roughness={1} transparent opacity={0.4} />
          </mesh>
        )}
        {spec.facialHair.style === 'moustache' && (
          <mesh
            position={[0, mouthY + 0.035, faceZ(H, 0, mouthY + 0.035) + 0.006]}
            scale={[1, 0.45, 0.5]}
          >
            <capsuleGeometry args={[0.012, 0.07, 6, 12]} />
            {clay(hair)}
          </mesh>
        )}
        {spec.facialHair.style === 'beard' && (
          <mesh scale={[H.w * 1.05, H.h * 1.04, H.d * 1.05]} position={[0, -0.01, 0.004]}>
            <sphereGeometry
              args={[1, S(32), S(16), 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4]}
            />
            {clay(hair)}
          </mesh>
        )}
      </group>
    </group>
  );
}
