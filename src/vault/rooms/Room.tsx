import { useTexture } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Snapshot } from '../../content/schema';
import { Bust } from '../Bust';
import { ROOM, roomSide, roomToWorld } from '../layout';
import type { Tokens } from '../palette';
import { DeviceFrame } from './DeviceFrame';

interface Props {
  snap: Snapshot;
  /** Index of the project whose room this is. */
  index: number;
  tokens: Tokens;
  reduce: boolean;
  /** Site base, so screenshot addresses work under the deploy path. */
  base: string;
  onReady: () => void;
  onPick: (path: string) => void;
}

/**
 * One project's room, in its own frame: entrance at +z, back wall at -z. It is mounted only while the
 * visitor is there, so its textures and geometry exist only then.
 */
export default function Room({ snap, index, tokens, reduce, base, onReady, onPick }: Props) {
  const project = snap.projects[index];
  const side = roomSide(index);
  const urls = useMemo(() => project.screenshots.map((s) => base + s.src), [project, base]);
  const textures = useTexture(urls) as THREE.Texture[];

  useEffect(() => {
    // Textures are configured imperatively once they have loaded.
    // eslint-disable-next-line react-hooks/immutability
    for (const t of textures) t.colorSpace = THREE.SRGBColorSpace;
    onReady();
    return () => {
      for (const t of textures) t.dispose();
      useTexture.clear(urls);
    };
    // Textures are fixed for the life of this room.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const team = snap.memberships
    .filter((m) => m.projectSlug === project.slug)
    .map((m) => snap.members.find((x) => x.slug === m.memberSlug)!);

  const { halfW: hw, halfD: hd, height: h, passageEnd, doorW } = ROOM;
  const wall = <meshStandardMaterial color={tokens.graphite} roughness={0.9} />;
  const origin = roomToWorld(index, [0, 0, 0]);
  const rotY = -side * (Math.PI / 2);
  const n = project.screenshots.length;

  return (
    <group position={origin} rotation={[0, rotY, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, (passageEnd - hd) / 2]}>
        <planeGeometry args={[hw * 2, hd + passageEnd]} />
        <meshStandardMaterial color={tokens.graphite} roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[0, h, 0]}>
        <boxGeometry args={[hw * 2, 0.2, hd * 2]} />
        {wall}
      </mesh>
      {/* back and side walls */}
      <mesh position={[0, h / 2, -hd]}>
        <boxGeometry args={[hw * 2, h, 0.2]} />
        {wall}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * hw, h / 2, 0]}>
          <boxGeometry args={[0.2, h, hd * 2]} />
          {wall}
        </mesh>
      ))}
      {/* front wall with an opening for the passage */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * ((hw + doorW / 2) / 2), h / 2, hd]}>
          <boxGeometry args={[hw - doorW / 2, h, 0.2]} />
          {wall}
        </mesh>
      ))}
      {/* passage to the corridor */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (doorW / 2), ROOM.doorH / 2, (hd + passageEnd) / 2]}>
          <boxGeometry args={[0.2, ROOM.doorH, passageEnd - hd]} />
          {wall}
        </mesh>
      ))}
      <mesh position={[0, ROOM.doorH, (hd + passageEnd) / 2]}>
        <boxGeometry args={[doorW, 0.2, passageEnd - hd]} />
        {wall}
      </mesh>

      <pointLight
        position={[0, 4, 0]}
        intensity={60}
        distance={14}
        decay={2}
        color={tokens.chrome}
      />
      <pointLight
        position={[0, 3, -4]}
        intensity={40}
        distance={10}
        decay={2}
        color={tokens.chrome}
      />
      <pointLight
        position={[0, 2.4, 9]}
        intensity={12}
        distance={7}
        decay={2}
        color={tokens.chrome}
      />

      {project.screenshots.map((s, k) => {
        const x = (k - (n - 1) / 2) * 2.9;
        return (
          <DeviceFrame
            key={s.src}
            device={s.device}
            texture={textures[k]}
            tokens={tokens}
            position={[x, s.device === 'iphone' || s.device === 'android' ? 1.6 : 1.9, -hd + 1.4]}
            rotationY={-x * 0.05}
            phase={k * 1.7}
            reduce={reduce}
          />
        );
      })}

      {team.map((m, k) => (
        <Bust
          key={m.slug}
          tokens={tokens}
          position={[-hw + 1.4, 0, -3 + k * 1.8]}
          rotY={Math.PI / 2}
          record={m.avatar}
          reduce={reduce}
          onPick={() => onPick(`/crew/${m.slug}/`)}
        />
      ))}
    </group>
  );
}
