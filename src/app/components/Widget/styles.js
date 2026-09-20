import { styled } from '@mui/material/styles';
import Anchor from '../Anchor';
import { Header as TileHeader, Root as TileRoot, Title as TileTitle } from '../Tile/styles';

/**
 * The workspace panel, drawn as the tile it already is.
 *
 * The look is not redefined here: `Root`, `Header` and `Title` extend the ones
 * `Tile` already owns, so the panel a widget sits in and the panel a screen
 * sits in cannot drift apart. What is added is the part only the workspace
 * needs — a drag handle, a row of controls, and a full-screen mode — because
 * a tile on a screen has none of those.
 *
 * The two components stay separate for one reason: `Tile` takes its title as a
 * prop, and a widget composes its header out of children because it puts
 * controls in there. They converge when widgets stop being widgets.
 */
export const Root = styled(TileRoot, {
  shouldForwardProp: (prop) => !['borderless', 'fullscreen'].includes(prop),
})(({ theme, borderless, fullscreen }) => ({
  display: 'flex',
  flexDirection: 'column',
  marginBottom: theme.spacing(1.25),
  ...(borderless ? { border: 0 } : null),
  ...(fullscreen
    ? {
      // Clear of the bar and the rail. The panel has to know how much of the
      // screen is already spoken for, and it reads that from the same tokens
      // those two are sized by.
      position: 'fixed',
      top: theme.tokens.size.bar,
      left: theme.tokens.size.rail,
      right: 0,
      bottom: 0,
      margin: 0,
      zIndex: 1000,
    }
    : null),
}));

/**
 * A row, not a block with something floated into the corner.
 *
 * The controls used to be positioned absolutely against a relative header,
 * which is why the title had to be told its own line height to stay centred
 * against them. A flex row centres both by saying so.
 */
export const Header = styled(TileHeader, {
  shouldForwardProp: (prop) => prop !== 'fixed',
})(({ theme, fixed }) => ({
  gap: 0,
  padding: theme.spacing(0, 0, 0, 1.25),
  minHeight: 32,
  ...(fixed ? { cursor: 'default' } : null),
}));

export const Title = styled(TileTitle)({
  flex: 1,
  minWidth: 0,
  // A panel whose name is longer than its column keeps the name it started
  // with rather than pushing its own controls off the edge.
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const Sortable = styled('div')(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  marginRight: theme.spacing(1),
  color: theme.palette.text.secondary,
  cursor: 'move',
  '& > a': {
    cursor: 'move',
    color: 'inherit',
  },
}));

export const Controls = styled('div')({
  display: 'flex',
  alignSelf: 'stretch',
  marginLeft: 'auto',
});

/**
 * One control in the header strip.
 *
 * Square, full height, separated from its neighbour by a hairline rather than
 * by space — the same grammar as `ButtonGroup`, because that is what this row
 * is. Disabled goes quiet rather than translucent: a greyed control on a
 * technical panel has to still be readable as *which* control it is.
 */
export const ControlButton = styled(Anchor, {
  shouldForwardProp: (prop) => prop !== 'inverted',
})(({ theme, disabled, inverted }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 32,
  alignSelf: 'stretch',
  padding: 0,
  margin: 0,
  fontSize: theme.tokens.fontSize.control,
  textAlign: 'center',
  textDecoration: 'none',
  color: theme.palette.text.secondary,
  borderLeft: `${theme.tokens.border.hairline} solid ${theme.tokens.color.borderSubtle}`,
  cursor: 'pointer',
  '&:hover': {
    color: theme.palette.primary.main,
    backgroundColor: theme.palette.background.paper,
  },
  '&:focus-visible': {
    outline: `${theme.tokens.focus.ringWidth} solid ${theme.tokens.color.focusRing}`,
    outlineOffset: `-${theme.tokens.focus.ringWidth}`,
  },
  ...(disabled
    ? {
      color: theme.tokens.color.inactive,
      cursor: 'not-allowed',
      '&:hover': { color: theme.tokens.color.inactive, backgroundColor: 'transparent' },
    }
    : null),
  ...(inverted
    ? {
      color: theme.tokens.color.onAccent,
      backgroundColor: theme.palette.primary.main,
      '&:hover': { backgroundColor: theme.palette.primary.dark, color: theme.tokens.color.onAccent },
    }
    : null),
}));

/**
 * The dropdown toggles are drawn by the legacy dropdown, so they are reached
 * through the attribute that marks a popup trigger rather than through a class
 * name that belongs to somebody else's CSS module.
 *
 * The value is not matched, only the presence: `DropdownButton` asks for
 * `aria-haspopup="menu"` and the legacy toggle rewrites it to `"true"` on the
 * way out. A selector spelling the value out matched nothing at all, which
 * left the toggle on its own floated styles and pushed it clean outside the
 * panel's right border.
 *
 * `float: none` on the children for the same reason: the group used to be
 * floated into a corner of a positioned header, and this one is a flex row.
 */
export const DropdownFrame = styled('div')(({ theme }) => ({
  display: 'flex',
  alignSelf: 'stretch',
  '& > *': {
    display: 'flex',
    float: 'none',
  },
  '& [aria-haspopup]': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
    alignSelf: 'stretch',
    fontSize: theme.tokens.fontSize.control,
    textDecoration: 'none',
    color: theme.palette.text.secondary,
    borderLeft: `${theme.tokens.border.hairline} solid ${theme.tokens.color.borderSubtle}`,
    cursor: 'pointer',
  },
  '& [aria-haspopup]:hover': {
    color: theme.palette.primary.main,
  },
}));

export const Content = styled('div')({
  // The widgets bring their own padding: several of them are a canvas, a
  // terminal or a table that has to reach the edge.
  flex: 1,
  minHeight: 0,
  position: 'relative',
});

export const Footer = styled('div')(({ theme }) => ({
  borderTop: `${theme.tokens.border.hairline} solid ${theme.tokens.color.borderSubtle}`,
}));
