import { styled } from '@mui/material/styles';

/**
 * The fixed rail down the left-hand side.
 *
 * White with a hairline edge, like the bar: the furniture of this application
 * is drawn in rules, not in blocks of colour. Its width is a token because
 * everything else is laid out in the space it leaves.
 */
export const Root = styled('nav')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  width: theme.tokens.size.rail,
  backgroundColor: theme.palette.background.paper,
  borderRight: `${theme.tokens.border.hairline} solid ${theme.tokens.color.border}`,
}));

/**
 * One destination.
 *
 * A tall cell with an uppercase tracked label rather than an icon alone: the
 * mockup names them, and a rail of unlabelled glyphs is a rail nobody reads
 * twice. The current one takes the accent as a fill, which is the one place
 * the accent is used as a background outside a primary button.
 */
export const Item = styled('a', {
  shouldForwardProp: (prop) => prop !== 'current',
})(({ theme, current }) => ({
  ...theme.typography.overline,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(0.75),
  height: 74,
  textDecoration: 'none',
  color: current ? theme.tokens.color.onAccent : theme.palette.text.primary,
  backgroundColor: current ? theme.palette.primary.main : 'transparent',
  borderBottom: `${theme.tokens.border.hairline} solid ${theme.tokens.color.borderSubtle}`,
  cursor: 'pointer',
  '&:hover': {
    color: current ? theme.tokens.color.onAccent : theme.palette.primary.main,
    backgroundColor: current ? theme.palette.primary.main : theme.tokens.color.panelHeader,
    textDecoration: 'none',
  },
  '&:focus-visible': {
    outline: `${theme.tokens.focus.ringWidth} solid ${theme.tokens.color.focusRing}`,
    outlineOffset: `-${theme.tokens.focus.ringWidth}`,
  },
}));
