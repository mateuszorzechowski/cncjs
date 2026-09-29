import { useEffect, useRef } from 'react';

/**
 * A list of lines to pick from, for the MDI line: the suggestions while a
 * word is typed, and on a phone this device's last commands (review notes,
 * 2026-09-29). Rows a finger's height where there is no pointer (`touch`),
 * the chosen one lit and kept in view as the arrows move it.
 *
 * `options` are `{ label, detail? }`; `onPick(index)` takes one. Pressing a
 * row does not take the focus from the line being typed.
 */
const LineChoices = ({ options, selected = null, onPick, touch = false, label }) => {
  const chosen = useRef(null);

  useEffect(() => {
    chosen.current?.scrollIntoView?.({ block: 'nearest' });
  }, [selected]);

  return (
    <ul className="m-0 list-none p-0" role="listbox" aria-label={label}>
      {options.map((option, index) => {
        const on = index === selected;
        return (
          <li
            key={option.label}
            ref={on ? chosen : undefined}
            role="option"
            aria-selected={on}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(index)}
            className={[
              'flex cursor-pointer gap-3 px-3',
              touch ? 'min-h-11 items-center' : 'items-baseline py-1.5',
              on ? 'bg-acc text-white' : 'text-ink hover:bg-accS',
            ].join(' ')}
          >
            <span className="shrink-0 font-num text-base">{option.label}</span>
            {option.detail ? <span className={`min-w-0 truncate text-note ${on ? '' : 'text-mut'}`}>{option.detail}</span> : null}
          </li>
        );
      })}
    </ul>
  );
};

export default LineChoices;
