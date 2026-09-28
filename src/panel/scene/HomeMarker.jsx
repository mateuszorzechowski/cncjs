import { useScreenScale } from './screenScale';

/*
 * Where homing leaves the machine — not machine zero, which the three
 * coloured axes mark (Mateusz, 2026-09-28: *"pozycja bazowania to co innego
 * niż MPos; MPos to osie kolorowe, pozycję HOME zaznacz czymś innym"*).
 *
 * A small diamond in the accent: not an axis, not the orange cone of the
 * tool, and the same size on screen however far the camera is zoomed —
 * `useScreenScale`, as the tool's marker. Drawn over what is in front of it,
 * like the tool, since a home inside the travel's corner is what it marks.
 */
const SIZE_PIXELS = 7;

const HomeMarker = ({ at, color }) => {
  const scale = useScreenScale(SIZE_PIXELS);
  return (
    <mesh ref={scale} position={[at.x, at.y, at.z]} renderOrder={10}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color={color} depthTest={false} transparent />
    </mesh>
  );
};

export default HomeMarker;
