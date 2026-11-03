import { Canvas, useThree } from '@react-three/fiber';
import { AvatarBust } from '../avatar/AvatarBust';
import type { Member } from '../content/schema';

function Row({
  members,
  col,
  reacts,
  reduce,
}: {
  members: Member[];
  col: number;
  reacts: number[];
  reduce: boolean;
}) {
  const size = useThree((s) => s.size);
  return (
    <>
      {members.map((m, i) => (
        <AvatarBust
          key={m.slug}
          record={m.avatar}
          // One unit is one pixel here, so avatars line up with the cards in the page.
          position={[(i + 0.5) * col - size.width / 2, -size.height / 2 + col * 0.16, 0]}
          scale={col * 0.95}
          reactKey={reacts[i] ?? 0}
          reduce={reduce}
          follow={!reduce}
          detail="high"
        />
      ))}
    </>
  );
}

/** One canvas for a whole row of avatars, so the page only ever holds a single WebGL context. */
export default function CrewCanvas({
  members,
  col,
  active,
  reacts,
  reduce,
}: {
  members: Member[];
  col: number;
  active: boolean;
  reacts: number[];
  reduce: boolean;
}) {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 600], zoom: 1, near: 1, far: 2000 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      frameloop={active ? 'always' : 'never'}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <ambientLight intensity={1.5} />
      <directionalLight position={[120, 220, 300]} intensity={2.4} />
      <directionalLight position={[-160, 40, 200]} intensity={0.9} />
      <Row members={members} col={col} reacts={reacts} reduce={reduce} />
    </Canvas>
  );
}
