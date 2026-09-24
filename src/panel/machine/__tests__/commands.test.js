import controller from '../controller';
import { controlledStop, emergencyStop } from '../commands';

jest.mock('../controller', () => ({ command: jest.fn() }));

const names = () => controller.command.mock.calls.map(([name]) => name);

describe('controlledStop on Grbl', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    controller.command.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /*
   * One command, because the gap between the hold and the reset belongs to the
   * side holding the port. It was a `setTimeout` here, which made the second
   * half of a safety control depend on this page still being alive — and this
   * panel is installed as an application on a phone, where background timers
   * are throttled to seconds.
   */
  test('is one command, sent immediately', () => {
    controlledStop('Grbl');

    expect(controller.command).toHaveBeenCalledTimes(1);
    expect(controller.command).toHaveBeenCalledWith('estop');
  });

  test('leaves no timer behind, so nothing arrives late or not at all', () => {
    controlledStop('Grbl');
    jest.runAllTimers();

    expect(names()).toEqual(['estop']);
  });

  test('two presses stop twice rather than cancelling each other', () => {
    controlledStop('Grbl');
    controlledStop('Grbl');
    jest.runAllTimers();

    expect(names()).toEqual(['estop', 'estop']);
  });
});

describe('controlledStop on a controller whose server side cannot do it', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    controller.command.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Marlin, Smoothie and TinyG have no `estop`, so they keep the two-step. It
  // is worse — the gap is a guess and it is counted here — and it is what those
  // firmwares can actually be given.
  test.each(['Marlin', 'Smoothie', 'TinyG'])('%s holds first, and holds immediately', (type) => {
    controlledStop(type);

    // Not after a tick, not after a promise: the first thing that happens when
    // the button is pressed is the machine being told to stop moving.
    expect(controller.command).toHaveBeenCalledTimes(1);
    expect(controller.command).toHaveBeenCalledWith('feedhold');
  });

  test('resets after the hold, not with it', () => {
    controlledStop('Marlin');
    expect(controller.command).toHaveBeenCalledTimes(1);

    // The gap is the point. A reset sent in the same breath as the hold
    // abandons the motion planner while the axes are still decelerating,
    // which is the same as never having held at all.
    jest.advanceTimersByTime(499);
    expect(controller.command).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1);
    expect(controller.command).toHaveBeenCalledTimes(2);
    expect(controller.command).toHaveBeenLastCalledWith('reset');
  });

  test('two presses stop twice rather than cancelling each other', () => {
    // An operator who hits it again because nothing looked like it happened
    // must not end up with a hold and no reset.
    controlledStop('Marlin');
    controlledStop('Marlin');
    jest.runAllTimers();

    expect(names()).toEqual(['feedhold', 'feedhold', 'reset', 'reset']);
  });

  /*
   * And this is the shape the wiring got wrong once.
   *
   * `onStop={controlledStop}` hands the click event in as the first argument, so
   * the type reads as a SyntheticEvent and every machine — Grbl included —
   * takes this path with the gap back in a browser timer. Nothing looks broken,
   * which is why it is a case rather than a comment.
   */
  test.each([[undefined], [null], [{ type: 'click' }], ['grbl']])(
    'falls back for %j rather than pretending it is Grbl',
    (type) => {
      controlledStop(type);
      jest.runAllTimers();

      expect(names()).toEqual(['feedhold', 'reset']);
    }
  );
});

describe('emergencyStop — the big button', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    controller.command.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test.each(['Grbl', 'Marlin', 'Smoothie', 'TinyG', undefined])('is a reset, at once and alone, on %s', () => {
    // No hold first: a hold leaves the spindle turning while the axes slow
    // down, and this is the button hit when that is the wrong thing to do.
    emergencyStop();
    jest.runAllTimers();

    expect(names()).toEqual(['reset']);
  });

  test('two presses reset twice', () => {
    emergencyStop();
    emergencyStop();

    expect(names()).toEqual(['reset', 'reset']);
  });
});
