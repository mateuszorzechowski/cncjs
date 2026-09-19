import React from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Mounts a component on a React root of its own, outside the page's tree, and
 * resolves once it has asked to close.
 *
 * Each call owns its root because that is what React 18 gives you to unmount
 * with: `unmountComponentAtNode` took the container, `root.unmount()` takes
 * nothing and has to be the same object `createRoot` returned. Keeping it in
 * the closure is the whole change.
 */
export default (Component, node = null) => new Promise((resolve, reject) => {
  let defaultNode = null;

  if (!node) {
    defaultNode = document.createElement('div');
    defaultNode.setAttribute('data-portal', '');
    document && document.body && document.body.appendChild(defaultNode);
  }

  const root = createRoot(node || defaultNode);

  root.render(
    <Component
      onClose={() => {
        // Still deferred a tick. React 18 warns if a root is unmounted while
        // it is rendering, and this runs from inside an event handler of the
        // component being unmounted.
        setTimeout(() => {
          root.unmount();

          if (defaultNode) {
            document && document.body && document.body.removeChild(defaultNode);
            defaultNode = null;
          }

          resolve();
        }, 0);
      }}
    />
  );
});
