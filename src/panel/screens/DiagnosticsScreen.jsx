import FadeScroller from '../ui/FadeScroller';
import InputsCard from '../ui/InputsCard';
import InstallationCard from '../ui/InstallationCard';

/**
 * Diagnostyka: what the controller sees and what this installation costs.
 *
 * Built on the night of 2026-09-29 with its scope decided there — see
 * `cncjs-notes/night-2026-09-29/decisions.md`. Two cards, one above the
 * other up to a tablet and side by side on a PC (beside each other at 1024
 * the tiles cut their own names short): the inputs and outputs
 * live, and the installation — controller, port, panel, and where a jog's
 * stopping distance comes from. Nothing here moves or writes anything.
 */
const DiagnosticsScreen = ({ machine }) => (
  <FadeScroller>
    <div className="grid min-h-full content-start gap-gap @6xl/shell:grid-cols-2">
      <InputsCard inputs={machine.inputs} connected={machine.connected} />
      <InstallationCard machine={machine} />
    </div>
  </FadeScroller>
);

export default DiagnosticsScreen;
