import { UndoNotice } from 'cncjs';

export const Discarded = () => (
  // Telefon / tablet / PC: the same face everywhere; the caller places it — on a phone above the menu's mound, wider at the bottom of the content.
  // Something just thrown away, with the way back: "Odrzuć wszystkie" in the controller's settings asks nothing and offers "Cofnij" for about six seconds. RefusalNotice's face — amber and the triangle — chosen over a dark bar (2026-09-28).
  <div style={{ position: 'relative', width: 400, height: 90 }}>
    <UndoNotice notice={{ seq: 1, text: 'Odrzucono zmian: 3' }} onUndo={() => {}} className="inset-x-0 top-0" />
  </div>
);
