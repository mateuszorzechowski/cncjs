/**
 * Who this pendant is, across reloads and reconnections.
 *
 * The server arbitrates movement between devices, and a socket is not a
 * device: socket.io issues a new id every time a client reconnects, and a
 * phone carried around a workshop reconnects. A claim held against a socket id
 * would be lost by its own owner, mid-jog, to itself.
 *
 * **It identifies a browser, not a person or a machine.** Two tabs on one
 * computer are one device, which is right — they are one operator with one
 * pair of hands. A phone and the desktop beside it are two, which is also
 * right, and is the case this exists for.
 *
 * Nothing about it is a secret. It is not authentication, and a device that
 * made one up would be claiming the right to move a machine it can already
 * move; the sign-in is what decides that.
 */

const KEY = 'cncjs.panel.device';

/**
 * A new identifier, by whichever means this browser has.
 *
 * `randomUUID` is only defined in a secure context, and the panel is opened
 * outside one whenever somebody runs the server without TLS — which the serve
 * script offers by name. So the fallback is an ordinary path rather than
 * paranoia; it only has to be unlikely to collide with the two or three other
 * devices in a workshop.
 */
const fresh = () => (
  globalThis.crypto?.randomUUID?.() ?? `device-${Math.random().toString(36).slice(2)}`
);

/*
 * Kept here as well as in storage, for the browser that has none.
 *
 * Private browsing throws on both reading and writing, and a panel that let
 * that through would fail at the handshake rather than where the storage is.
 * The identity then lasts as long as the page does, which is a device that
 * forgets itself on reload — worse than the alternative and better than no
 * panel.
 */
let current = null;

export const deviceId = () => {
  if (current) {
    return current;
  }

  try {
    current = window.localStorage.getItem(KEY);
    if (!current) {
      current = fresh();
      window.localStorage.setItem(KEY, current);
    }
  } catch (error) {
    current = fresh();
  }

  return current;
};

export default deviceId;
