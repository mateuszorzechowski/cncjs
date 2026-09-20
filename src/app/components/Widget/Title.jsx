import React, { useContext } from 'react';
import { TitleIdContext } from './TitleIdContext';
import { Title as Root } from './styles';

/**
 * The panel's name.
 *
 * A real heading, which it was not before: the workspace is seventeen panels
 * deep and a heading each is what makes it navigable by anything that is not
 * a mouse. It also carries the id its panel points at, which is how the panel
 * gets its accessible name without each widget supplying one.
 */
const Title = (props) => {
  const id = useContext(TitleIdContext);

  return <Root id={id} {...props} />;
};

export default Title;
