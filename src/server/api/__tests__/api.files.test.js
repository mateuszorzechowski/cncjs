import fs from 'fs';
import os from 'os';
import path from 'path';
import { fetch, read, write, remove, load } from '../api.files';
import library from '../../services/library';
import store from '../../store';
import journal from '../../services/journal';

jest.mock('../../store', () => ({ get: jest.fn() }));

/** Hand back what the handler said, once it has said it. */
const call = async (handler, req) => {
  const res = { statusCode: 200 };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.send = jest.fn((body) => {
    res.body = body;
  });

  await handler({ params: {}, body: {}, query: {}, ...req }, res);

  return res;
};

const controllerSaying = (reason) => ({
  clientRefusal: jest.fn(() => reason),
  command: jest.fn((cmd, name, gcode, context, callback) => callback(null, { name })),
});

let dir;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'files-'));
  library.open({ dir });
});

afterEach(() => {
  library.close();
});

describe('the library over HTTP', () => {
  test('keeps, lists, reads and deletes a program', async () => {
    expect((await call(write, { params: { name: 'part.nc' }, body: { data: 'G0 X1' } })).statusCode).toBe(200);

    const listed = await call(fetch, {});
    expect(listed.body.files).toEqual([expect.objectContaining({ name: 'part.nc', size: 5 })]);
    expect(listed.body.disk.free).toBeGreaterThan(0);

    expect((await call(read, { params: { name: 'part.nc' } })).body).toEqual({ name: 'part.nc', data: 'G0 X1' });

    expect((await call(remove, { params: { name: 'part.nc' } })).statusCode).toBe(200);
    expect((await call(fetch, {})).body.files).toEqual([]);
  });

  test('keeping and deleting go in the journal, as codes', async () => {
    await call(write, { params: { name: 'part.nc' }, body: { data: 'G0 X1' } });
    await call(remove, { params: { name: 'part.nc' } });

    const [deleted, written] = journal.query({ event: 'file' }, { limit: 2 }).records;
    expect(written).toMatchObject({ code: 'write', data: { name: 'part.nc', size: 5 } });
    expect(deleted).toMatchObject({ code: 'delete', data: { name: 'part.nc' } });
  });

  test('a path for a name is refused with a reason', async () => {
    const res = await call(write, { params: { name: '../part.nc' }, body: { data: 'G0' } });

    expect(res.statusCode).toBe(400);
    expect(res.body.reason).toBe('bad-name');
  });

  test('a file that is not there is 404', async () => {
    const res = await call(read, { params: { name: 'none.nc' } });

    expect(res.statusCode).toBe(404);
    expect(res.body.reason).toBe('not-found');
  });

  test('no room on the disk is 507', async () => {
    jest.spyOn(library, 'disk').mockResolvedValueOnce({ total: 10, free: 1 });

    const res = await call(write, { params: { name: 'part.nc' }, body: { data: 'G0 X1' } });

    expect(res.statusCode).toBe(507);
    expect(res.body.reason).toBe('no-space');
  });

  test('no data is refused rather than kept as an empty file', async () => {
    const res = await call(write, { params: { name: 'part.nc' }, body: {} });

    expect(res.statusCode).toBe(400);
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  test('keeping is not held back by a program under way', async () => {
    store.get.mockReturnValue(controllerSaying('program-running'));

    expect((await call(write, { params: { name: 'next.nc' }, body: { data: 'G0' } })).statusCode).toBe(200);
  });
});

describe('loading from the library', () => {
  beforeEach(async () => {
    await library.write('part.nc', 'G0 X1');
  });

  test('hands the file to the port, by the same road as an upload', async () => {
    const controller = controllerSaying(null);
    store.get.mockReturnValue(controller);

    const res = await call(load, { params: { name: 'part.nc' }, body: { port: 'COM3' } });

    expect(res.statusCode).toBe(200);
    expect(controller.clientRefusal).toHaveBeenCalledWith('gcode:load');
    expect(controller.command).toHaveBeenCalledWith('gcode:load', 'part.nc', 'G0 X1', {}, expect.any(Function));
  });

  test('is refused while a program is under way', async () => {
    const controller = controllerSaying('program-running');
    store.get.mockReturnValue(controller);

    const res = await call(load, { params: { name: 'part.nc' }, body: { port: 'COM3' } });

    expect(res.statusCode).toBe(409);
    expect(res.body.reason).toBe('program-running');
    expect(controller.command).not.toHaveBeenCalled();
  });

  test('a file that is not there never reaches the controller', async () => {
    const controller = controllerSaying(null);
    store.get.mockReturnValue(controller);

    const res = await call(load, { params: { name: 'none.nc' }, body: { port: 'COM3' } });

    expect(res.statusCode).toBe(404);
    expect(controller.command).not.toHaveBeenCalled();
  });

  test('without a port it is refused', async () => {
    expect((await call(load, { params: { name: 'part.nc' }, body: {} })).statusCode).toBe(400);
  });
});
