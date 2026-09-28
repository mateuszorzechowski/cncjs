import { useEffect, useState } from 'react';
import SegmentedChoice from './SegmentedChoice';

/**
 * One of this device's looks — density, number face — as a row of chips.
 *
 * `ThemeChoice` with the look passed in: read back from `ui/look` rather than
 * held here, so two rows showing one look, or a change from the review
 * overlay, cannot disagree. `labels` maps each value to its key, written out
 * at the call so the resources test can find every one.
 */
const LookChoice = ({ look, label, labels }) => {
  const [choice, setChoice] = useState(look.read);

  useEffect(() => look.watch(setChoice), [look]);

  return (
    <SegmentedChoice
      joined
      fitWide
      label={label}
      options={look.values}
      value={choice}
      onChange={look.set}
      format={(id) => labels[id]}
    />
  );
};

export default LookChoice;
