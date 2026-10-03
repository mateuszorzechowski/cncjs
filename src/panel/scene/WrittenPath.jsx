import Toolpath from './Toolpath';

/**
 * A program as written, faint, placed by the work offset as the path is: the
 * height map's preview draws it under the program bent to the map, to see
 * what the map changes (Mateusz, 2026-10-03).
 */
const FADE = 0.75;

const WrittenPath = ({ toolpath, offset, colors }) => (
  <group position={[offset.x, offset.y, offset.z]}>
    <Toolpath toolpath={toolpath} colors={colors} fade={FADE} />
  </group>
);

export default WrittenPath;
