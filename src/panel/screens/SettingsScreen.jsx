import { useCallback, useEffect, useRef, useState } from 'react';
import Card from '../ui/Card';
import FadeScroller from '../ui/FadeScroller';
import JournalLevelChoice from '../ui/JournalLevelChoice';
import LanguageChoice from '../ui/LanguageChoice';
import SegmentedChoice from '../ui/SegmentedChoice';
import SettingRow from '../ui/SettingRow';
import ThemeChoice from '../ui/ThemeChoice';
import JogSettings from '../ui/JogSettings';
import KeepAwakeChoice, { keepAwakeNote } from '../ui/KeepAwakeChoice';
import { useKeepAwakeStatus } from '../ui/keepAwake';
import { useSwipe } from '../ui/swipe';
import { RestoreUnitsChoice, UnitsChoice } from '../ui/UnitsChoice';
import ConnectScreen from './ConnectScreen';
import ControllerSettings from '../ui/ControllerSettings';
import AppScreen from './AppScreen';
import { t } from '../i18n';

/**
 * Everything that is set once and then left alone.
 *
 * Which machine the panel is talking to was the first of those, and it had
 * this screen to itself for a day. The second is the panel as a *thing on a
 * phone* — installed or not, trusted or not — which is settings by the same
 * test: decided once, and then never thought about again.
 *
 * **Tabs rather than two cards stacked.** They have nothing to do with each
 * other, and on a 390px screen a second card below the first is a card nobody
 * scrolls to. `SegmentedChoice` is the panel's own control for a choice among
 * a few fixed things, and a pair of sections is exactly that.
 *
 * **Four tabs, one level** — variant 2b of the settings drawing of
 * 2026-09-25. The application tab had become regular settings, one-off chores
 * and maintenance in one list; split by how often a thing is touched and by
 * what has to come before what:
 * - connection: which machine;
 * - controller: Grbl's own settings, `$0`-`$132`, after the settings
 *   design of 2026-09-26 — with its view switch in this row;
 * - appearance: what this device's screen looks like;
 * - preferences: how the panel works — the rows marked for the server are
 *   the same on every device;
 * - install: the certificate, the installation, and reloading the panel.
 */

/*
 * Each tab's key written out, not built from its id.
 *
 * `t(`settings.${id}`)` would be shorter and would be a key nothing can grep
 * for — the resources test looks for quoted dotted literals, so both would
 * read as keys nobody asks for and a misspelling would reach an operator.
 * Same reason the rail writes `nav.jog` out instead of assembling it.
 */
const LABELS = {
  connection: 'settings.connection',
  controller: 'settings.controller',
  appearance: 'settings.appearance',
  preferences: 'settings.preferences',
  install: 'settings.install',
};

const TABS = Object.keys(LABELS);

/*
 * The tab last open, for as long as the page lives: changing the language
 * builds the screens again (`App`), and the row that changed it should still
 * be on screen afterwards rather than the first tab.
 */
let lastTab = 'connection';

// The controller tab's view — described or Grbl's `$$` — the same way.
let lastRaw = false;

const VIEWS = { described: 'machine.view.described', raw: 'machine.view.raw' };

const SettingsScreen = ({ machine }) => {
  const [tab, setTab] = useState(() => lastTab);
  const [raw, setRaw] = useState(() => lastRaw);
  const view = raw ? 'raw' : 'described';
  const keepAwake = useKeepAwakeStatus();
  /*
   * A finger swiped across the tab's content turns to the tab beside it
   * (Mateusz, 2026-09-26: *"przełączenia między ekranami opcji powinno
   * wspierać przesuwanie palcem"*). Clamped at both ends, not round.
   */
  const pages = useRef(null);
  const turn = useCallback((by) => setTab((now) => {
    const next = TABS.indexOf(now) + by;
    return next >= 0 && next < TABS.length ? TABS[next] : now;
  }), []);
  useSwipe(pages, turn);
  useEffect(() => {
    lastTab = tab;
    lastRaw = raw;
  }, [tab, raw]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <div className="flex flex-col gap-2 @3xl/shell:flex-row @3xl/shell:items-center @3xl/shell:justify-between">
        <SegmentedChoice
          joined
          fitWide
          label={t('nav.settings')}
          options={TABS}
          value={tab}
          onChange={setTab}
          format={(id) => t(LABELS[id])}
        />
        {tab === 'controller' ? (
          <div className="flex items-center gap-3">
            <span className="hidden text-cap font-semibold uppercase tracking-[0.1em] text-mut @3xl/shell:inline">{t('machine.view.label')}</span>
            <div className="flex-1">
              <SegmentedChoice
                joined
                fitWide
                label={t('machine.view.label')}
                options={Object.keys(VIEWS)}
                value={view}
                onChange={(id) => setRaw(id === 'raw')}
                format={(id) => t(VIEWS[id])}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/*
        * The screen scrolls, not the card.
        *
        * It was the other way round and it read badly on a phone: a section
        * with its own scrollbar inside a frame that does not move, so the
        * warning and the certificate below it were a second, hidden document
        * -- *"czy da sie zrobic zeby sekcja sie nie skorlowala byla
        * rozwnieta"* (2026-09-23). Expanded, the card is simply as tall as it
        * needs to be and the whole thing travels past the menu.
        *
        * The fade that says how much is left is `FadeScroller`, which began
        * here and now belongs to every scroller in the panel.
        *
        * The card reaches the bottom of the screen on every tab, and its rows
        * stay at the top — *"to powinno byc na cala wysokosc, ale karta,
        * kontent moze zostac jak jest"* (2026-09-25). Fitted to its content,
        * a tab with two rows was a small box floating in an empty screen. The
        * buttons no longer ride down with it, which is what the drawing's
        * point 10 was really about.
        *
        * No padding of its own below that. There was a `pb-5` here for a few
        * minutes, on a misreading -- *"tutaj nie musi byc dodatkowgo
        * paddingu, moze zle sie wyrazilem, staly wokolo calej sekcji"*. The
        * section already has one, the same on all four sides, and a second
        * one under it only made the bottom different from the rest.
        */}
      <div ref={pages} className="flex min-h-0 flex-1 flex-col">
      {/*
        * The controller's settings scroll inside their card: the group tabs,
        * the description and the save bar stay where they are and only the
        * settings move — *"scroll ma byc na cala wysokosc kardy ale
        * scrolowac maja sie tylko ustawienia w srodku"* (2026-09-26).
        */}
      {tab === 'controller' ? <ControllerSettings machine={machine} raw={raw} /> : (
      <FadeScroller>
        <div className="flex min-h-full flex-col">
          {tab === 'connection' ? <ConnectScreen machine={machine} /> : null}
          {tab === 'appearance' ? (
            <Card className="flex-1">
              <SettingRow title={t('theme.label')} scope="device">
                <ThemeChoice />
              </SettingRow>
              <SettingRow title={t('keepAwake.label')} note={keepAwakeNote(keepAwake)} scope="device" noteBelow>
                <KeepAwakeChoice status={keepAwake} />
              </SettingRow>
            </Card>
          ) : null}
          {tab === 'preferences' ? (
            <Card className="flex-1">
              <SettingRow title={t('language.label')} scope="device">
                <LanguageChoice />
              </SettingRow>
              <SettingRow title={t('units.choice.label')} note={t('units.choice.note')} scope="server">
                <UnitsChoice units={machine.units} />
              </SettingRow>
              {/*
                * Right under the units, because it is about them: which units
                * the machine is put back into is the choice above.
                */}
              <SettingRow
                title={t('units.restore.label')}
                note={t('units.restore.note', { modal: machine.units?.modal ?? 'G21' })}
                scope="server"
              >
                <RestoreUnitsChoice units={machine.units} />
              </SettingRow>
              {/* The jog card's steps and rates, in the units above. */}
              <JogSettings />
              <SettingRow title={t('journal.keep.label')} note={t('journal.keep.note')} scope="server">
                <JournalLevelChoice />
              </SettingRow>
            </Card>
          ) : null}
          {tab === 'install' ? (
            <Card className="flex-1">
              <AppScreen />
            </Card>
          ) : null}
        </div>
      </FadeScroller>
      )}
      </div>
    </div>
  );
};

export default SettingsScreen;
