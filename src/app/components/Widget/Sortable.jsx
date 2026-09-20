import React from 'react';
import Anchor from '../Anchor';
import { Sortable as Root } from './styles';

/**
 * The grip a panel is dragged by, kept separate from its name.
 *
 * Hidden from assistive technology, and deliberately. It is a mouse-only
 * affordance — the reordering is done by `react-sortablejs`, which has no
 * keyboard path — so announcing it would offer a control that cannot be
 * operated. Hiding it here rather than in each widget also keeps the panel's
 * heading reading as its title: the grip lives *inside* the title, and a Font
 * Awesome glyph is generated content that the accessible name picks up. One
 * widget had already forgotten the `aria-hidden` on its own icon, and its
 * panel was announcing the glyph.
 */
const Sortable = ({ children, className, ...rest }) => (
  <Root className={className} aria-hidden="true">
    <Anchor {...rest} tabIndex={-1}>
      {children}
    </Anchor>
  </Root>
);

export default Sortable;
