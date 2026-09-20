import React from 'react';
import { Item, Root } from './styles';

/**
 * The application's navigation rail.
 *
 * It holds destinations and nothing else. What those destinations are is not
 * its business — the mockup draws six and the application has two, and this
 * component is indifferent to which.
 */
const Rail = ({ children, ...props }) => (
  <Root {...props}>
    {children}
  </Root>
);

/**
 * One destination in the rail.
 *
 * `current` both colours it and says so out loud. Marking the current
 * destination with colour alone leaves anyone not looking at it unable to tell
 * where they are, which is what this rail did before.
 */
Rail.Item = ({ current, children, ...props }) => (
  <Item current={current} aria-current={current ? 'page' : undefined} {...props}>
    {children}
  </Item>
);

export default Rail;
