import React, { PureComponent } from 'react';
import Button from 'app/components/Button';
import ButtonGroup from 'app/components/ButtonGroup';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';

/**
 * The machine commands that are not the stop.
 *
 * They used to be six buttons of six different colours — primary, success,
 * warning, danger — sitting as equals in a dark bar, which made the one that
 * stops a running machine look like the one that puts it to sleep. The stop
 * now lives on its own at the other end of the bar, drawn large and red, and
 * these five are deliberately quiet: they are things an operator reaches for
 * deliberately, not things that should catch the eye.
 *
 * Reset is not here. It is the stop.
 */
class QuickAccessToolbar extends PureComponent {
    commands = [
      { id: 'cyclestart', label: () => i18n._('Cycle Start') },
      { id: 'feedhold', label: () => i18n._('Feedhold') },
      { id: 'homing', label: () => i18n._('Homing') },
      { id: 'sleep', label: () => i18n._('Sleep') },
      { id: 'unlock', label: () => i18n._('Unlock') },
    ];

    render() {
      return (
        <ButtonGroup role="toolbar" label={i18n._('Quick access toolbar')}>
          {this.commands.map(({ id, label }) => (
            <Button
              key={id}
              size="small"
              variant="outlined"
              onClick={() => controller.command(id)}
            >
              {label()}
            </Button>
          ))}
        </ButtonGroup>
      );
    }
}

export default QuickAccessToolbar;
