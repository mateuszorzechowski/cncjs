import React from 'react';
import { End, Group, Note, Root } from './styles';

/**
 * The application's top bar.
 *
 * Arranges what it is given and decides nothing about what that is. `AppBar.End`
 * is the right-hand end, which is where the stop lives — on a machine panel
 * the most dangerous control gets the most predictable place.
 */
const AppBar = ({ children, ...props }) => (
  <Root {...props}>
    {children}
  </Root>
);

AppBar.Group = Group;
AppBar.End = End;
AppBar.Note = Note;

export default AppBar;
