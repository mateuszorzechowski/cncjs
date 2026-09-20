import PropTypes from 'prop-types';
import React, { useRef } from 'react';
import { TitleIdContext } from './TitleIdContext';
import { Root } from './styles';

// Enough to tell one panel's title from another's within a page. Not stable
// across loads, and does not need to be: nothing links to it.
let counter = 0;

/**
 * A panel in the workspace.
 *
 * `role="region"` is stated rather than left to the element, so the workspace
 * reads as a set of named panels to anything navigating by landmark — and the
 * name comes from the panel's own title rather than from each widget
 * remembering to supply one. Seventeen widgets each spelling out their own
 * `aria-label` was seventeen chances to forget, and one of them had.
 *
 * A widget that has no title still says its name the old way, which is what
 * the visualizer does: it is a canvas with a toolbar and nothing to point at.
 */
const Widget = ({ borderless = false, fullscreen = false, ...props }) => {
  const titleId = useRef(null);
  if (titleId.current === null) {
    counter += 1;
    titleId.current = `widget-title-${counter}`;
  }

  // `aria-labelledby` outranks `aria-label`, so it is offered only when there
  // is no explicit name to outrank.
  const labelledBy = props['aria-label'] ? undefined : titleId.current;

  return (
    <TitleIdContext.Provider value={titleId.current}>
      <Root
        role="region"
        aria-labelledby={labelledBy}
        borderless={borderless}
        fullscreen={fullscreen}
        {...props}
      />
    </TitleIdContext.Provider>
  );
};

Widget.propTypes = {
  borderless: PropTypes.bool,
  fullscreen: PropTypes.bool
};

export default Widget;
