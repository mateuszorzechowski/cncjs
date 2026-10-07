// SVG's word for text centred on its x.
const MIDDLE = 'middle';

// Each probe from outside a wall as a label: a small solid drop whose point touches the wall
// it goes into, and in its white middle the way it goes, X+ or Y− (review notes, 2026-09-30:
// *"łezka"*, *"delikatniejsze, lite … w środku białe kółko ma X+"*).
const DROP = 13;
const TIP = 21;
const ProbeDrop = ({ wall, angle, dir }) => {
  const rad = (angle * Math.PI) / 180;
  const cx = wall[0] - TIP * Math.cos(rad);
  const cy = wall[1] - TIP * Math.sin(rad);
  const c = DROP / TIP;
  const s = Math.sqrt(1 - c * c);
  const drop = `M${cx + TIP} ${cy} L${cx + DROP * c} ${cy - DROP * s} A${DROP} ${DROP} 0 1 0 ${cx + DROP * c} ${cy + DROP * s} Z`;
  return (
    <>
      <path d={drop} transform={`rotate(${angle} ${cx} ${cy})`} className="fill-acc" />
      <circle cx={cx} cy={cy} r={10.5} className="fill-surf" />
      <text x={cx} y={cy + 2.8} textAnchor={MIDDLE} fontSize={8} className="fill-acc font-num font-semibold">{dir}</text>
    </>
  );
};

export default ProbeDrop;
