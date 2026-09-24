import { upload } from '../api.gcode';
import store from '../../store';

jest.mock('../../store', () => ({ get: jest.fn() }));

const call = (body) => {
  const res = { statusCode: 200 };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.send = jest.fn((payload) => {
    res.body = payload;
  });

  upload({ body }, res);

  return res;
};

const controllerSaying = (reason) => ({
  clientRefusal: jest.fn(() => reason),
  command: jest.fn((cmd, name, gcode, context, callback) => callback(null, { name })),
});

describe('uploading a program', () => {
  test('is refused while one is under way, because loading stops it', () => {
    const controller = controllerSaying('program-running');
    store.get.mockReturnValue(controller);

    const res = call({ port: 'COM3', name: 'next.nc', gcode: 'G0 X0' });

    expect(res.statusCode).toBe(409);
    expect(res.body.reason).toBe('program-running');
    expect(controller.command).not.toHaveBeenCalled();
  });

  test('loads when nothing is in the way', () => {
    const controller = controllerSaying(null);
    store.get.mockReturnValue(controller);

    const res = call({ port: 'COM3', name: 'next.nc', gcode: 'G0 X0' });

    expect(res.statusCode).toBe(200);
    expect(controller.clientRefusal).toHaveBeenCalledWith('gcode:load');
    expect(controller.command).toHaveBeenCalledWith('gcode:load', 'next.nc', 'G0 X0', {}, expect.any(Function));
  });
});
