import { createContext } from 'react';

/**
 * The id a panel expects its title to carry, so the panel can point at it.
 *
 * A context rather than a prop because the title is a child several levels
 * down — a widget composes its own header — and threading an id through that
 * is exactly the kind of bookkeeping a widget would get wrong.
 */
export const TitleIdContext = createContext(null);

export default TitleIdContext;
