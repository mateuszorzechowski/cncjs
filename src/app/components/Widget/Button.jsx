import PropTypes from 'prop-types';
import React from 'react';
import Anchor from '../Anchor';
import { ControlButton } from './styles';

// `ControlButton` is the anchor itself rather than an `<a>` wearing `as`:
// emitting `as` as a prop leaks it onto the DOM node, and React logs a warning
// for every control in every panel — seventeen of them, on every page load.

/**
 * One control in a panel's header strip.
 *
 * Built on `Anchor` rather than on the application's `Button`, because these
 * are chrome: they are 32px square, they sit in a row of hairlines, and a
 * panel full of primary buttons in its own header would shout over whatever
 * the panel is for.
 */
const Button = ({ inverted = false, ...props }) => (
  <ControlButton inverted={inverted} {...props} />
);

Button.propTypes = {
  ...Anchor.propTypes,
  inverted: PropTypes.bool
};

export default Button;
