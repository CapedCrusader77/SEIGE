import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";

const pseudoRandom = (seed) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

function DriftingPoints() {
  const pointsRef = useRef(null);
  const positions = useMemo(() => {
    const values = new Float32Array(2000 * 3);
    for (let i = 0; i < 2000; i += 1) {
      values[i * 3] = (pseudoRandom(i + 1) - 0.5) * 24;
      values[i * 3 + 1] = (pseudoRandom(i + 2) - 0.5) * 14;
      values[i * 3 + 2] = (pseudoRandom(i + 3) - 0.5) * 10;
    }
    return values;
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = clock.elapsedTime * 0.02;
    pointsRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.08) * 0.04;
    pointsRef.current.position.y = Math.sin(clock.elapsedTime * 0.18) * 0.2;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.03} sizeAttenuation transparent opacity={0.9} />
    </points>
  );
}

export default function ParticleField() {
  return (
    <Canvas camera={{ position: [0, 0, 7], fov: 62 }}>
      <DriftingPoints />
    </Canvas>
  );
}
