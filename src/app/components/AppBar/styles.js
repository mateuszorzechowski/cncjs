import { styled } from '@mui/material/styles';

/**
 * The strip across the top of the application.
 *
 * White, not dark. The panel is an instrument and the bar is part of the
 * instrument's face: a dark band across the top belongs to a website with a
 * navigation menu, and it spends the strongest contrast on the thing that
 * matters least.
 *
 * Fixed height, because the one control it has to carry — the stop — is sized
 * to be hit without looking, and everything else on the bar is laid out in the
 * room that leaves.
 */
export const Root = styled('nav')(({ theme }) => ({
  display: 'flex',
  alignItems: 'stretch',
  gap: theme.spacing(1.5),
  height: theme.tokens.size.bar,
  paddingLeft: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderBottom: `${theme.tokens.border.hairline} solid ${theme.tokens.color.border}`,
}));

/** Anything that sits in the bar and is not pushed to one end. */
export const Group = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  minWidth: 0,
}));

/** The same, held against the right-hand edge. */
export const End = styled(Group)({
  marginLeft: 'auto',
  gap: 0,
});

/** A quiet line of text in the bar: a version, a file name, a note. */
export const Note = styled('div')(({ theme }) => ({
  ...theme.typography.readout,
  fontWeight: theme.typography.fontWeightRegular,
  fontSize: theme.typography.caption.fontSize,
  color: theme.palette.text.secondary,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}));
