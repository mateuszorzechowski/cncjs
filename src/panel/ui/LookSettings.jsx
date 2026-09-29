import { useEffect, useState } from 'react';
import LookChoice from './LookChoice';
import SettingRow from './SettingRow';
import Stepper from './Stepper';
import { DENSITY, NUM_FONT, TEXT_SCALE } from './look';
import { t } from '../i18n';

/**
 * Density, text size and number face, under the theme: this device's, like it.
 *
 * The faces keep their own names — they are names, like a port's — but each
 * still goes through a key, so the rule that every displayed value has one
 * holds without an exception to explain. Each chip is set in the face it
 * names, and a reading in the chosen face stands under them, so the choice
 * is seen before and after it is made (review note, 2026-09-29: *"podgląd
 * cyfr, teraz nie wiem co wybieram"*).
 */

// A chip's name in its own face: the attribute the token sheet switches `--num` on.
const inFace = (id, name) => <span data-num={id} className="font-num">{name}</span>;

const TextScaleChoice = () => {
  const [scale, setScale] = useState(TEXT_SCALE.read);
  useEffect(() => TEXT_SCALE.watch(setScale), []);
  return (
    <Stepper
      value={scale}
      onChange={TEXT_SCALE.set}
      fine={TEXT_SCALE.step}
      coarse={TEXT_SCALE.step * 2}
      min={TEXT_SCALE.min}
      max={TEXT_SCALE.max}
      label={t('textSize.label')}
      unit={t('textSize.unit')}
    />
  );
};

const LookSettings = () => (
  <>
    <SettingRow title={t('density.label')} note={t('density.note')}>
      <LookChoice
        look={DENSITY}
        label={t('density.label')}
        labels={{ comfortable: t('density.comfortable'), compact: t('density.compact') }}
      />
    </SettingRow>
    <SettingRow title={t('textSize.label')} note={t('textSize.note')}>
      <div className="w-full @lg/setting:max-w-[340px]">
        <TextScaleChoice />
      </div>
    </SettingRow>
    <SettingRow title={t('numFont.label')} note={t('numFont.note')}>
      <LookChoice
        look={NUM_FONT}
        label={t('numFont.label')}
        labels={{
          azeret: inFace('azeret', t('numFont.azeret')),
          jetbrains: inFace('jetbrains', t('numFont.jetbrains')),
          plex: inFace('plex', t('numFont.plex')),
          segment: inFace('segment', t('numFont.segment')),
        }}
      />
      <span className="whitespace-nowrap font-num text-[length:var(--numSample)] leading-tight tabular-nums text-ink">{t('numFont.sample')}</span>
    </SettingRow>
  </>
);

export default LookSettings;
