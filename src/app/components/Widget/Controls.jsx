import React from 'react';
import { Controls as Root } from './styles';

const Controls = (props) => (
  <Root role="toolbar" aria-label="Widget controls" {...props} />
);

export default Controls;
