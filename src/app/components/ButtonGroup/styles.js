import { styled } from '@mui/material/styles';

/**
 * Controls that do one job between them, drawn as one object.
 *
 * The mockup sets these solid and separates them with a single hairline rather
 * than with space: the gap is the group's own background showing through a
 * 1px flex gap. Space between them would say they are unrelated, and on a
 * panel where every other control is separated by space that reads wrong.
 *
 * By default each child is as wide as its own label. `equal` divides the width
 * evenly instead, which is right when the labels are the same shape — five
 * override steps — and wrong when they are not: "Cycle Start" and "Sleep" given
 * an equal share means the first one is clipped and the second is padding.
 */
export const Root = styled('div', {
  shouldForwardProp: (prop) => prop !== 'equal',
})(({ theme, equal }) => ({
  display: 'flex',
  gap: theme.tokens.border.hairline,
  backgroundColor: theme.tokens.color.border,
  border: `${theme.tokens.border.hairline} solid ${theme.tokens.color.border}`,
  '& > *': {
    flex: equal ? 1 : '1 0 auto',
    minWidth: 0,
  },
}));
