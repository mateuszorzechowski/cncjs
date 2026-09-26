import config from '../services/configstore';

const noop = () => {};

class EventTrigger {
  constructor(callback = noop) {
    this.callback = callback || noop;
  }

  trigger(eventKey, callback = null) {
    if (!eventKey) {
      return;
    }

    const events = config.get('events', []);

    events
      .filter(event => event && event.event === eventKey)
      .forEach(options => {
        const {
          enabled = false,
          event,
          trigger,
          commands
        } = { ...options };

        if (!enabled) {
          return;
        }

        // One caller may take the commands itself: `gcode:start` on Grbl
        // sends them before the program, and has to know when they are done.
        const handle = callback || this.callback;
        if (typeof handle === 'function') {
          handle(event, trigger, commands);
        }
      });
  }
}

export default EventTrigger;
