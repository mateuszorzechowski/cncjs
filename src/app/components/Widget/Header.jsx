import PropTypes from 'prop-types';
import React from 'react';
import { Header as Root } from './styles';

const Header = ({ fixed = false, ...props }) => (
  <Root fixed={fixed} {...props} />
);

Header.propTypes = {
  fixed: PropTypes.bool
};

export default Header;
