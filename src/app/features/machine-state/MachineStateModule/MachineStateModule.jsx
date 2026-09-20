import { PureComponent } from 'react';
import controller from 'app/lib/controller';
import { machineState } from '../selectors';

/**
 * What the connected machine is doing, for whoever needs to say it.
 *
 * It renders no markup of its own: it calls `children` with the one reading
 * the top bar is about. Unlike the per-controller modules it listens for every
 * firmware, because the bar is above the panels and does not get to assume
 * which one is plugged in.
 */
class MachineStateModule extends PureComponent {
    state = this.getInitialState();

    controllerEvents = {
      'serialport:open': ({ port, controllerType }) => {
        this.setState({ port, type: controllerType });
      },
      'serialport:close': () => {
        this.setState(this.getInitialState());
      },
      'controller:state': (type, controllerState) => {
        this.setState({ type, controllerState });
      },
    };

    componentDidMount() {
      Object.keys(this.controllerEvents).forEach((eventName) => {
        controller.addListener(eventName, this.controllerEvents[eventName]);
      });
    }

    componentWillUnmount() {
      Object.keys(this.controllerEvents).forEach((eventName) => {
        controller.removeListener(eventName, this.controllerEvents[eventName]);
      });
    }

    getInitialState() {
      return {
        port: controller.port,
        type: controller.type,
        controllerState: controller.state,
      };
    }

    render() {
      const { port, type, controllerState } = this.state;

      return this.props.children(machineState({ port, type, state: controllerState }));
    }
}

export default MachineStateModule;
