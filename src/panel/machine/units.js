import { currentToken } from './session';

/**
 * Changing the server's units.
 *
 * Only the change goes this way. What the units *are* arrives over the socket
 * (`units:change`), to every panel at once — this one included — so the
 * screen that pressed the button learns the result the same way as the
 * phone in the workshop, and neither can show a choice the server did not
 * make.
 */
export const saveUnits = async (change) => {
  const token = currentToken();
  const res = await fetch('/api/units', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(change),
  });
  if (!res.ok) {
    throw new Error(`PUT /api/units: ${res.status}`);
  }
  return res.json();
};
