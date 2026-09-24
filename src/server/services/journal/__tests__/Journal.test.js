import fs from 'fs';
import os from 'os';
import path from 'path';
import Journal, { matches } from '../Journal';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'journal-'));
const closed = (journal) => new Promise((resolve) => journal.close(resolve));
const settled = () => new Promise((resolve) => setTimeout(resolve, 50));

const ALARM = { level: 'error', source: 'controller', event: 'alarm', code: 'ALARM:3', port: 'COM3' };
const REFUSED = { level: 'warn', source: 'server', event: 'refused', code: 'program-running', device: 'phone' };
const START = { level: 'info', source: 'server', event: 'program', code: 'start', program: { name: 'part.nc', total: 10 } };
const SENT = { level: 'debug', source: 'controller', event: 'sent', data: { line: 'G0 X0' } };

describe('what is kept', () => {
  test('an entry is its fields, with an id and a time', () => {
    const journal = new Journal();
    const entry = journal.record(ALARM);

    expect(entry).toMatchObject({ id: 1, ...ALARM });
    expect(Date.parse(entry.time)).not.toBeNaN();
  });

  test('nothing below the threshold, which starts at info', () => {
    const journal = new Journal();

    expect(journal.record(SENT)).toBeNull();
    expect(journal.record(START)).not.toBeNull();

    // Debug is the operator's to switch on, in the settings.
    journal.setLevel('debug');
    expect(journal.record(SENT)).not.toBeNull();
  });

  test('an unknown level is ignored rather than switching the journal off', () => {
    const journal = new Journal();
    journal.setLevel('verbose');
    expect(journal.threshold).toBe('info');
  });

  test('each entry is told to whoever listens', () => {
    const journal = new Journal();
    const heard = [];
    journal.on('entry', (entry) => heard.push(entry.code));

    journal.record(ALARM);
    journal.record(SENT);

    expect(heard).toEqual(['ALARM:3']);
  });
});

describe('finding entries', () => {
  const entry = { id: 1, time: '2026-09-24T17:45:52.118Z', ...ALARM, program: { name: 'Circle.gcode', line: 700 } };

  test('a level is a floor', () => {
    expect(matches(entry, { level: 'warn' })).toBe(true);
    expect(matches({ ...entry, level: 'info' }, { level: 'warn' })).toBe(false);
  });

  test('by source, event, device and time', () => {
    expect(matches(entry, { source: 'controller' })).toBe(true);
    expect(matches(entry, { source: 'server' })).toBe(false);
    expect(matches(entry, { event: 'error' })).toBe(false);
    expect(matches({ ...entry, device: 'phone' }, { device: 'laptop' })).toBe(false);
    expect(matches(entry, { since: '2026-09-24T18:00:00.000Z' })).toBe(false);
    expect(matches(entry, { until: '2026-09-24T17:00:00.000Z' })).toBe(false);
  });

  test('by text, in anything the entry stored', () => {
    expect(matches(entry, { q: 'alarm:3' })).toBe(true);
    expect(matches(entry, { q: 'circle' })).toBe(true);
    expect(matches(entry, { q: 'com3' })).toBe(true);
    expect(matches(entry, { q: '700' })).toBe(true);
    expect(matches({ ...entry, data: { sent: 'G2 X1 Y1' } }, { q: 'g2 x1' })).toBe(true);
    expect(matches(entry, { q: 'octocat' })).toBe(false);
  });

  test('by text, in the words the panel says it with', () => {
    // The panel knows which codes its sentences for the needle belong to;
    // the server only knows codes.
    expect(matches(entry, { q: 'blokada', said: ['ALARM:3'] })).toBe(true);
    expect(matches(entry, { q: 'blokada', said: ['ALARM:1'] })).toBe(false);
  });

  test('newest first, a page at a time, stable while more arrive', () => {
    const journal = new Journal();
    for (let i = 0; i < 5; i += 1) {
      journal.record(ALARM);
      journal.record(REFUSED);
    }

    const first = journal.query({ event: 'alarm' }, { limit: 2 });
    expect(first.records.map((e) => e.id)).toEqual([9, 7]);
    expect(first.next).toBe(7);

    // Something new lands between two pages; the second page does not move.
    journal.record(ALARM);
    const second = journal.query({ event: 'alarm' }, { before: first.next, limit: 2 });
    expect(second.records.map((e) => e.id)).toEqual([5, 3]);

    const last = journal.query({ event: 'alarm' }, { before: second.next, limit: 2 });
    expect(last.records.map((e) => e.id)).toEqual([1]);
    expect(last.next).toBeNull();
  });
});

describe('on disk', () => {
  test('survives a restart, and ids carry on', async () => {
    const file = path.join(tmp(), 'journal.jsonl');
    const before = new Journal();
    before.open({ file });
    before.record(ALARM);
    before.record(START);
    await closed(before);

    const after = new Journal();
    after.open({ file });
    expect(after.query().records.map((e) => e.code)).toEqual(['start', 'ALARM:3']);
    expect(after.record(REFUSED).id).toBe(3);
    await closed(after);
  });

  test('one line an entry, and a torn last line does not lose the rest', async () => {
    const file = path.join(tmp(), 'journal.jsonl');
    const journal = new Journal();
    journal.open({ file });
    journal.record(ALARM);
    await closed(journal);

    fs.appendFileSync(file, '{"id":2,"lev');

    const again = new Journal();
    again.open({ file });
    expect(again.query().records).toHaveLength(1);
    await closed(again);
  });

  test('keeps the level it was opened with', () => {
    const journal = new Journal();
    journal.open({ file: path.join(tmp(), 'journal.jsonl'), level: 'debug' });
    expect(journal.threshold).toBe('debug');
    journal.close();
  });

  test('rotates into .1 and keeps both files readable', async () => {
    const dir = tmp();
    const file = path.join(dir, 'journal.jsonl');
    const journal = new Journal();
    // Small enough to rotate every few entries.
    journal.open({ file, maxBytes: 300 });
    for (let i = 0; i < 12; i += 1) {
      journal.record(ALARM);
    }
    await settled();
    await closed(journal);

    expect(fs.existsSync(`${file}.1`)).toBe(true);

    // Only the two newest files survive, but every id in them is in order and
    // nothing written during a rotation was lost.
    const again = new Journal();
    again.open({ file, maxBytes: 300 });
    const ids = again.query({}, { limit: 100 }).records.map((e) => e.id).reverse();
    expect(ids[ids.length - 1]).toBe(12);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(new Set(ids).size).toBe(ids.length);
    ids.slice(1).forEach((id, i) => expect(id).toBe(ids[i] + 1));
    await closed(again);
  });
});
