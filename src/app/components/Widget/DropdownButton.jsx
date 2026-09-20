import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Button } from '../Buttons';
import Dropdown from '../Dropdown';
import { DropdownFrame } from './styles';

class DropdownButton extends PureComponent {
    static propTypes = {
      ...Dropdown.propTypes,

      // One of: 'lg', 'md', 'sm', 'xs'
      btnSize: Button.propTypes.btnSize,

      // One of: 'default', 'primary', 'emphasis', 'flat', 'link'
      btnStyle: Button.propTypes.btnStyle,

      // toggle
      toggle: PropTypes.node.isRequired,

      // Accessible label for the toggle button
      'aria-label': PropTypes.string,

      // Align the menu to the right side of the dropdown toggle.
      pullRight: PropTypes.bool,

      // Whether to prevent a caret from being rendered next to the title.
      noCaret: PropTypes.bool
    };

    static defaultProps = {
      pullRight: true,
      noCaret: true
    };

    render() {
      const { btnSize, toggle, children, ...props } = this.props;

      // Split component props
      const dropdownProps = {};
      const toggleProps = {};
      Object.keys(props).forEach(propName => {
        const propValue = props[propName];
        if (Dropdown.ControlledComponent.propTypes[propName]) {
          dropdownProps[propName] = propValue;
        } else {
          toggleProps[propName] = propValue;
        }
      });

      return (
        // The frame is what carries the look. The toggle itself is drawn by
        // the legacy dropdown, so it is reached through the one attribute this
        // component sets on it rather than through a class name owned by
        // someone else's CSS module.
        <DropdownFrame>
          <Dropdown {...dropdownProps} btnSize={btnSize}>
            <Dropdown.Toggle
              aria-haspopup="menu"
              {...toggleProps}
              componentClass="a"
            >
              {toggle}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {children}
            </Dropdown.Menu>
          </Dropdown>
        </DropdownFrame>
      );
    }
}

export default DropdownButton;
