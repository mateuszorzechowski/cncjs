import React, { PureComponent } from 'react';
import { withRouter } from 'react-router-dom';
import Rail from 'app/components/Rail';
import i18n from 'app/lib/i18n';

/**
 * Where you can go, and where you are.
 *
 * The mockup draws six destinations; this application has two, and the rail
 * does not invent the other four — the tabs on the drawing are illustrative
 * and nobody has asked for that navigation.
 *
 * Plain anchors rather than router `Link`s. The application runs on a hash
 * router, so a hash href is already a client-side navigation: the router hears
 * `hashchange` and nothing reloads. That keeps the rail out of the router's
 * component API, which matters because this markup is a shared component and
 * the router is not.
 */
class Sidebar extends PureComponent {
    static propTypes = {
      ...withRouter.propTypes
    };

    render() {
      const { pathname = '' } = this.props.location;

      return (
        <Rail aria-label="Main navigation">
          <Rail.Item
            href="#/workspace"
            current={pathname.indexOf('/workspace') === 0}
          >
            {i18n._('Workspace')}
          </Rail.Item>
          <Rail.Item
            href="#/settings"
            current={pathname.indexOf('/settings') === 0}
          >
            {i18n._('Settings')}
          </Rail.Item>
        </Rail>
      );
    }
}

export default withRouter(Sidebar);
