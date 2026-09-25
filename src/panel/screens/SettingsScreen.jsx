import { useState } from 'react';
import Card from '../ui/Card';
import FadeScroller from '../ui/FadeScroller';
import JournalLevelChoice from '../ui/JournalLevelChoice';
import SegmentedChoice from '../ui/SegmentedChoice';
import SettingRow from '../ui/SettingRow';
import ThemeChoice from '../ui/ThemeChoice';
import { RestoreUnitsChoice, UnitsChoice } from '../ui/UnitsChoice';
import ConnectScreen from './ConnectScreen';
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
  appearance: 'settings.appearance',
  preferences: 'settings.preferences',
  install: 'settings.install',
};

const TABS = Object.keys(LABELS);

const SettingsScreen = ({ machine }) => {
  const [tab, setTab] = useState('connection');

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <SegmentedChoice
        joined
        fitWide
        label={t('nav.settings')}
        options={TABS}
        value={tab}
        onChange={setTab}
        format={(id) => t(LABELS[id])}
      />

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
        * The card is as tall as what is in it, on every tab. The connection
        * tab used to stretch to the bottom of the screen to push its buttons
        * there, and left ~180px of empty card above them (drawing, point 10).
        *
        * No padding of its own below that. There was a `pb-5` here for a few
        * minutes, on a misreading -- *"tutaj nie musi byc dodatkowgo
        * paddingu, moze zle sie wyrazilem, staly wokolo calej sekcji"*. The
        * section already has one, the same on all four sides, and a second
        * one under it only made the bottom different from the rest.
        */}
      <FadeScroller>
        {tab === 'connection' ? <ConnectScreen machine={machine} /> : null}
        {tab === 'appearance' ? (
          <Card>
            <SettingRow title={t('theme.label')} scope="device">
              <ThemeChoice />
            </SettingRow>
          </Card>
        ) : null}
        {tab === 'preferences' ? (
          <Card>
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
            <SettingRow title={t('journal.keep.label')} note={t('journal.keep.note')} scope="server">
              <JournalLevelChoice />
            </SettingRow>
          </Card>
        ) : null}
        {tab === 'install' ? (
          <Card>
            <AppScreen />
          </Card>
        ) : null}
      </FadeScroller>
    </div>
  );
};

export default SettingsScreen;
