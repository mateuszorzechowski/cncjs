import SegmentedChoice from './SegmentedChoice';
import { bendProgram } from '../machine/probe';
import { t } from '../i18n';

const OPTIONS = ['off', 'on'];
const [OFF, ON] = OPTIONS;
const WORDS = { off: 'job.map.off', on: 'job.map.on' };

// Why the map cannot bend the program, as the operator reads it, with the file's line.
const REFUSED = {
  'outside-map': 'job.map.outsideMap',
  'no-z': 'job.map.noZ',
  'relative-unknown': 'job.map.relativeUnknown',
  'unknown-position': 'job.map.unknownPosition',
  g92: 'job.map.g92',
  'arc-plane': 'job.map.arcPlane',
  'bad-arc': 'job.map.badArc',
};

/**
 * The loaded program with the height map or without it (Mateusz,
 * 2026-10-02: a switch at the program). The server bent it when it was
 * loaded; this only says which one it sends. Where the map cannot bend it the
 * switch stays off and says why, at which line of the file.
 */
const JobHeightMap = ({ machine }) => {
  const { on, refused } = machine.job.heightMap;
  const line = Number.isInteger(refused?.line) ? refused.line + 1 : null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <span className="text-note text-mut">{t('job.map.title')}</span>
        <SegmentedChoice
          options={OPTIONS}
          value={on ? ON : OFF}
          onChange={(option) => bendProgram(option === ON)}
          format={(option) => t(WORDS[option])}
          label={t('job.map.title')}
          disabled={!machine.canBendProgram || Boolean(refused)}
          compact
          joined
        />
      </div>
      {refused ? <span className="text-note text-ambT">{t(REFUSED[refused.code] || 'job.map.cannot', { line })}</span> : null}
    </div>
  );
};

export default JobHeightMap;
