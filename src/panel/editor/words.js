import { currentToken } from '../machine/session';

const request = async (url, options) => {
  const token = currentToken();
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`${url}: ${res.status}`);
  }
  return res.json();
};

let asked = null;

/**
 * What the server's file check accepts — asked once per page: it changes
 * with the server's code, not while anybody types.
 */
export const fetchWords = () => {
  asked = asked || request('/api/editor/words').catch((err) => {
    asked = null;
    throw err;
  });
  return asked;
};

/** The server's check of text not yet saved: `{ findings, more }`. */
export const checkText = (text) => request('/api/editor/check', { method: 'POST', body: JSON.stringify({ text }) });

/*
 * What each word means, for the suggestions. Written out, so every key is a
 * literal the resources test can find; `.` in a code is `p` in its key
 * (`G28.1` is `G28p1`), which would otherwise be read as a path.
 */
export const CODE_KEYS = {
  G0: 'gcode.code.G0',
  G1: 'gcode.code.G1',
  G2: 'gcode.code.G2',
  G3: 'gcode.code.G3',
  G4: 'gcode.code.G4',
  G10: 'gcode.code.G10',
  G17: 'gcode.code.G17',
  G18: 'gcode.code.G18',
  G19: 'gcode.code.G19',
  G20: 'gcode.code.G20',
  G21: 'gcode.code.G21',
  G28: 'gcode.code.G28',
  'G28.1': 'gcode.code.G28p1',
  G30: 'gcode.code.G30',
  'G30.1': 'gcode.code.G30p1',
  'G38.2': 'gcode.code.G38p2',
  'G38.3': 'gcode.code.G38p3',
  'G38.4': 'gcode.code.G38p4',
  'G38.5': 'gcode.code.G38p5',
  G40: 'gcode.code.G40',
  'G43.1': 'gcode.code.G43p1',
  G49: 'gcode.code.G49',
  G53: 'gcode.code.G53',
  G54: 'gcode.code.G54',
  G55: 'gcode.code.G55',
  G56: 'gcode.code.G56',
  G57: 'gcode.code.G57',
  G58: 'gcode.code.G58',
  G59: 'gcode.code.G59',
  G61: 'gcode.code.G61',
  G80: 'gcode.code.G80',
  G90: 'gcode.code.G90',
  G91: 'gcode.code.G91',
  'G91.1': 'gcode.code.G91p1',
  G92: 'gcode.code.G92',
  'G92.1': 'gcode.code.G92p1',
  G93: 'gcode.code.G93',
  G94: 'gcode.code.G94',
  M0: 'gcode.code.M0',
  M1: 'gcode.code.M1',
  M2: 'gcode.code.M2',
  M3: 'gcode.code.M3',
  M4: 'gcode.code.M4',
  M5: 'gcode.code.M5',
  M8: 'gcode.code.M8',
  M9: 'gcode.code.M9',
  M30: 'gcode.code.M30',
};

export const LETTER_KEYS = {
  F: 'gcode.letter.F',
  I: 'gcode.letter.I',
  J: 'gcode.letter.J',
  K: 'gcode.letter.K',
  L: 'gcode.letter.L',
  N: 'gcode.letter.N',
  P: 'gcode.letter.P',
  R: 'gcode.letter.R',
  S: 'gcode.letter.S',
  T: 'gcode.letter.T',
  X: 'gcode.letter.X',
  Y: 'gcode.letter.Y',
  Z: 'gcode.letter.Z',
};

export const BUILTIN_KEYS = {
  '%wait': 'gcode.builtin.wait',
  '%msg': 'gcode.builtin.msg',
};
