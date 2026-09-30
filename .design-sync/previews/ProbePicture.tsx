import { ProbePicture } from 'cncjs';

export const Methods = () => (
  // The pictograms the method cards carry: the Z plate, the L plate in a
  // corner, and the paper.
  // Telefon / tablet / PC: fixed size set by className; the same everywhere.
  <div className="flex gap-4">
    <ProbePicture method="z" label="Płytka Z" className="h-24 w-32" />
    <ProbePicture method="corner" label="Narożnik XYZ" className="h-24 w-32" />
    <ProbePicture method="paper" choice="z" label="Kartka" className="h-24 w-32" />
  </div>
);

export const PaperEdges = () => (
  // Paper on the side of the work the tool faces.
  <div className="flex gap-4">
    <ProbePicture method="paper" choice="x-left" label="Kartka, lewy bok" className="h-24 w-32" />
    <ProbePicture method="paper" choice="y-front" label="Kartka, przód" className="h-24 w-32" />
  </div>
);
