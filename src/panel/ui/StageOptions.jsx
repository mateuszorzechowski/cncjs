import { useState } from 'react';
import Button from './Button';
import Icon from './Icon';
import IconBar from './IconBar';
import Sheet from './Sheet';
import { useIsPhone, useIsWide } from './shell';
import { t } from '../i18n';

/**
 * The 3D view's options: the views, the frame, the layers.
 *
 * On a PC the column of glyphs on the drawing (`IconBar`), where a pointer
 * hovers and the tooltip names each one. Without a pointer 28px squares are
 * small under a finger (Mateusz, 2026-09-29: *"opcje na podglądzie 3D nie są
 * dostosowane do telefonu i tabletu"*), and he settled it per format: *"na
 * telefonie arkusz, na tablecie większe przyciski"*. So a tablet keeps the
 * column at 44px, and a phone — where that column would eat the drawing —
 * gets one button on the drawing that opens a sheet with the same options,
 * each with its name.
 *
 * `groups` is the one list both draw: `{ label, items }`, an item carrying
 * its label, whether it is lit (`pressed`, absent for an action) and
 * `disabled`. `closes` marks the groups whose choice ends the errand — a view
 * or the frame, which you want to see — while the layers stay open to switch
 * several.
 */
const StageOptions = ({ groups }) => {
  const phone = useIsPhone();
  const wide = useIsWide();
  const [open, setOpen] = useState(false);

  if (!phone) {
    return <IconBar className="absolute right-2 top-2" groups={groups} large={!wide} />;
  }

  return (
    <>
      <Button tone="outline" onClick={() => setOpen(true)} className="absolute right-2 top-2 h-chiph gap-2 px-4">
        {t('stage.options')}
        <Icon name="chevron" className="size-4" weight={2} />
      </Button>
      {open ? (
        <Sheet title={t('stage.options')} onClose={() => setOpen(false)}>
          {groups.map((group) => (
            <section key={group.label} className="flex flex-col gap-2" aria-label={group.label}>
              <h3 className="m-0 text-cap font-semibold uppercase tracking-[0.1em] text-mut">{group.label}</h3>
              <div className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <Button
                    key={item.id}
                    tone={item.pressed ? 'primary' : 'outline'}
                    aria-pressed={item.pressed}
                    disabled={item.disabled}
                    onClick={() => {
                      item.onSelect();
                      if (group.closes) {
                        setOpen(false);
                      }
                    }}
                    className="h-ctl gap-2"
                  >
                    <Icon name={item.icon} className="size-4" />
                    {item.label}
                  </Button>
                ))}
              </div>
              {/* Why some are dark, once each: two layers without a program say the same thing. */}
              {[...new Set(group.items.filter((item) => item.disabled && item.note).map((item) => item.note))].map((note) => (
                <p key={note} className="m-0 text-note text-mut">{note}</p>
              ))}
            </section>
          ))}
        </Sheet>
      ) : null}
    </>
  );
};

export default StageOptions;
