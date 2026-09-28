import { Meter } from 'cncjs';

export const JobProgress = () => (
  // A bar whose length is a reading. The job's progress, in green, under the
  // percentage and the line it has reached — the Przebieg zadania card.
  // Telefon / tablet / PC: same look on every device; the job card's progress bar and the Pliki disk bar show at every width, while the status-bar progress and the tool card's override bars exist only on a tablet/PC (a phone has no status bar and no tool card).
  <div className="flex w-side flex-col gap-2">
    <div className="flex items-baseline gap-2">
      <span className="font-num text-head font-medium tabular-nums text-ink">42</span>
      <span className="min-w-0 truncate font-num text-note text-mut">% · linia 7741/18432</span>
    </div>
    <Meter percent={42} label="Przebieg zadania" tone="bg-grn" />
  </div>
);

export const NoJob = () => (
  // No job loaded: an empty track, not a missing one.
  <div className="flex w-side flex-col gap-2">
    <span className="font-num text-note text-mut">brak zadania</span>
    <Meter percent={0} label="Przebieg zadania" tone="bg-grn" />
  </div>
);

export const DiskWithLibrary = () => (
  // Disk room on Pliki: the rest of the computer in grey, cncjs's own files as
  // an accent part at the end of it.
  <div className="flex w-side flex-col gap-2">
    <Meter percent={64} tone="bg-mut" part={{ percent: 2, tone: 'bg-acc' }} label="Zajęte miejsce na dysku" />
    <span className="font-num text-note text-mut">
      wolne 42,5 GB z 118 GB · <span className="mr-1 inline-block size-2 bg-acc" aria-hidden="true" />pliki cncjs 1,4 GB
    </span>
  </div>
);

export const DiskLow = () => (
  // Nearly full: the rest turns red, the part stays the accent.
  <div className="flex w-side flex-col gap-2">
    <Meter percent={96} tone="bg-red" part={{ percent: 1, tone: 'bg-acc' }} label="Zajęte miejsce na dysku" />
    <span className="font-num text-note text-mut">
      wolne 4,7 GB z 118 GB · <span className="mr-1 inline-block size-2 bg-acc" aria-hidden="true" />pliki cncjs 1,4 GB
    </span>
  </div>
);
