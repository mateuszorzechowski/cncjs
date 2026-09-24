import { create, update, __delete as remove } from '../api.events';

const mockStore = { events: [] };
jest.mock('../../services/configstore', () => ({
  get: (key, fallback) => (key in mockStore ? mockStore[key] : fallback),
  set: (key, value) => {
    mockStore[key] = value;
  },
}));

/** Hand back what the handler said, as status and body. */
const call = (handler, req) => {
  const res = { statusCode: 200 };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.send = jest.fn((body) => {
    res.body = body;
  });

  handler({ params: {}, body: {}, ...req }, res);

  return res;
};

const SHELL = { id: 'shell', enabled: true, event: 'gcode:start', trigger: 'system', commands: 'fan-on.sh' };
const GCODE = { id: 'gcode', enabled: true, event: 'gcode:start', trigger: 'gcode', commands: 'G21 G90' };

beforeEach(() => {
  mockStore.events = [{ ...SHELL }, { ...GCODE }];
});

describe('a client cannot put a shell command on the server', () => {
  it('refuses to create an event that would run the shell', () => {
    const res = call(create, { body: { event: 'gcode:start', trigger: 'system', commands: 'rm -rf ~' } });

    expect(res.statusCode).toBe(403);
    expect(mockStore.events).toHaveLength(2);
  });

  it('refuses to turn a G-code event into a shell one', () => {
    const res = call(update, { params: { id: 'gcode' }, body: { trigger: 'system', commands: 'rm -rf ~' } });

    expect(res.statusCode).toBe(403);
    expect(mockStore.events[1]).toEqual(GCODE);
  });

  it('refuses to change a shell event written on the server', () => {
    const res = call(update, { params: { id: 'shell' }, body: { commands: 'rm -rf ~' } });

    expect(res.statusCode).toBe(403);
    expect(mockStore.events[0]).toEqual(SHELL);
  });

  it('refuses to turn a shell event into a G-code one', () => {
    const res = call(update, { params: { id: 'shell' }, body: { trigger: 'gcode' } });

    expect(res.statusCode).toBe(403);
    expect(mockStore.events[0]).toEqual(SHELL);
  });

  it('refuses to delete a shell event written on the server', () => {
    const res = call(remove, { params: { id: 'shell' } });

    expect(res.statusCode).toBe(403);
    expect(mockStore.events).toHaveLength(2);
  });
});

describe('G-code events are managed as before', () => {
  it('creates one', () => {
    const res = call(create, { body: { event: 'gcode:stop', trigger: 'gcode', commands: 'M5' } });

    expect(res.statusCode).toBe(200);
    expect(mockStore.events).toHaveLength(3);
  });

  it('updates one', () => {
    const res = call(update, { params: { id: 'gcode' }, body: { commands: 'G21' } });

    expect(res.statusCode).toBe(200);
    expect(mockStore.events[1].commands).toBe('G21');
  });

  it('deletes one', () => {
    const res = call(remove, { params: { id: 'gcode' } });

    expect(res.statusCode).toBe(200);
    expect(mockStore.events).toEqual([SHELL]);
  });
});
