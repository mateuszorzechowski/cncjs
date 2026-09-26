import { useEffect, useState } from 'react';
import Button from '../ui/Button';
import Notice from '../ui/Notice';
import SegmentedChoice from '../ui/SegmentedChoice';
import StepRow from '../ui/StepRow';
import { PLATFORMS, platformOf } from '../machine/platform';
import { trustState } from '../machine/trust';
import { installSteps } from '../machine/installSteps';
import { AUTHORITY_URL, fetchAuthority } from '../machine/authority';
import { canInstall, isInstalled, promptInstall, watchInstall } from '../machine/install';
import { applyUpdate, isUpdateReady, watchUpdate } from '../machine/update';
import { t } from '../i18n';

/**
 * Putting the panel on the home screen, and what stands in the way.
 *
 * A pendant that lives in a browser tab is a pendant somebody loses behind
 * fifteen other tabs while the spindle is running. Installed it is an
 * application: its own icon, full screen, no address bar.
 *
 * The browser decides whether that is allowed and says nothing useful when it
 * is not — the menu item reads "cannot install this application" with no
 * reason given, and the actual cause is three taps away behind a struck-out
 * padlock. This screen is the panel answering the question itself.
 */

/**
 * A fact about the certificate: what it is called, and what it says.
 *
 * The value is the one selectable thing in the panel. `base.css` turns
 * selection off everywhere, because holding a jog key was raising the copy
 * bubble over the pad — but a fingerprint exists to be compared against
 * another fingerprint, and the honest way to do that is to copy it rather
 * than read forty hex pairs off a phone. The callout comes back with it,
 * since on iOS that is what puts Copy on the screen.
 */
const Fact = ({ label, children }) => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <span className="text-cap font-semibold uppercase tracking-[0.08em] text-mut">{label}</span>
    <span className="min-w-0 select-text break-all font-num text-note text-ink [-webkit-touch-callout:default]">
      {children}
    </span>
  </div>
);

// Written out, so every key is a literal the resources test can find.
const HOW = {
  android: 'app.certHow.android',
  ios: 'app.certHow.ios',
  windows: 'app.certHow.windows',
  macos: 'app.certHow.macos',
  linux: 'app.certHow.linux',
};

// What step 2 says, by where it stands.
const INSTALL_NOTES = {
  blocked: 'app.step2Blocked',
  waiting: 'app.notYet',
  ready: 'app.ready',
  done: 'app.step2Done',
};

// How step 2 looks, by where it stands: waiting and ready are both to do.
const STEP_FACE = {
  blocked: 'blocked',
  waiting: 'todo',
  ready: 'todo',
  done: 'done',
};

// The panel's own version, from the build (`webpack.config.panel.js`).
const VERSION = process.env.BUILD_VERSION;

const PLATFORM_NAMES = {
  android: 'platform.android',
  ios: 'platform.ios',
  windows: 'platform.windows',
  macos: 'platform.macos',
  linux: 'platform.linux',
};

const AppScreen = () => {
  /*
   * How to install the certificate depends on where it is going, so the
   * instructions are for the platform the panel is open on — and when that
   * cannot be told, a choice rather than a guess (see `machine/platform`).
   */
  const detected = platformOf(window.navigator);
  const [picked, setPicked] = useState(null);
  const platform = picked || detected;

  /*
   * Re-read rather than held: `machine/install` owns the state, because the
   * event it depends on fires before any screen exists. This only subscribes
   * so the buttons change when it does.
   */
  const [, bump] = useState(0);
  useEffect(() => watchInstall(() => bump((n) => n + 1)), []);

  useEffect(() => watchUpdate(() => bump((n) => n + 1)), []);

  const [authority, setAuthority] = useState(null);
  useEffect(() => {
    let live = true;
    fetchAuthority().then((found) => {
      if (live) {
        setAuthority(found);
      }
    });
    return () => {
      live = false;
    };
  }, []);

  const trust = trustState({
    protocol: window.location.protocol,
    secure: window.isSecureContext,
  });

  const installed = isInstalled();
  const ready = canInstall();
  const steps = installSteps({ trust, installed, ready });

  /*
   * Two steps and a footer, from the settings design's Install tab (variant
   * 2b): the certificate, then the application — a sequence, because a
   * browser installs only a secure page — and under them the version this
   * device is running with the button that fetches a newer one.
   */
  return (
    <>
      {/*
        * Step 1, shown whether or not anything is wrong with it.
        *
        * It used to appear only while the device distrusted the server, which
        * got it backwards twice over: on a panel served over plain HTTP — the
        * development case, and the first place anybody looks — it was not
        * there at all, and the moment it started working it vanished, so
        * there was no way to check *which* authority a phone had ended up
        * with. Done, it says so, and keeps what it knows.
        */}
      <StepRow
        number={1}
        title={t('app.step1Title')}
        note={steps.cert === 'done' ? t('app.step1Done') : t(trust.key)}
        state={steps.cert}
      >
        {/*
          * The warning goes first, and it is not a formality. Installing a
          * certificate authority is normally the worst thing a web page can
          * talk somebody into; this one is name-constrained — see
          * scripts/make-certs.sh — so it can only vouch for `.lan` and
          * private addresses, and the warning says that rather than one
          * everybody learns to tap through.
          */}
        <Notice>
          <span>{t('app.certWarning')}</span>
        </Notice>
        {/*
          * The instructions for this device's system, chosen for it where it
          * can be told (`machine/platform`) and changeable — the file may be
          * going to another device than the one reading this.
          */}
        <SegmentedChoice
          joined
          fitWide
          label={t('app.certPlatform')}
          options={PLATFORMS}
          value={platform}
          onChange={setPicked}
          format={(id) => t(PLATFORM_NAMES[id])}
        />
        {platform ? <p className="m-0 text-note text-ink">{t(HOW[platform])}</p> : null}
        {/*
          * "Download", not "install". Tapping this saves a file; installing
          * it is a separate trip into the device's own settings.
          */}
        <Button href={AUTHORITY_URL} className="h-ctl w-full @3xl/shell:w-auto @3xl/shell:self-start">
          {t('app.certDownload')}
        </Button>
        {authority ? (
          <>
            <Fact label={t('app.certName')}>{authority.name}</Fact>
            {authority.validTo ? (
              <Fact label={t('app.certValidTo')}>{authority.validTo.toLocaleDateString()}</Fact>
            ) : null}
            {/*
              * Long, and deliberately not shortened. Half a fingerprint
              * compared against half a fingerprint is a habit that reads as
              * checking without being it.
              */}
            <Fact label={t('app.certFingerprint')}>{authority.fingerprint}</Fact>
            <p className="m-0 text-note text-mut">{t('app.certLife')}</p>
          </>
        ) : null}
      </StepRow>

      {/*
        * Step 2, dark until step 1 is done: over an untrusted connection the
        * browser will not install, and a live button that does nothing is
        * worse than a dark one that says why.
        */}
      <StepRow
        number={2}
        title={t('app.step2Title')}
        note={t(INSTALL_NOTES[steps.install])}
        state={STEP_FACE[steps.install]}
      >
        <Button
          tone="primary"
          disabled={steps.install !== 'ready'}
          onClick={promptInstall}
          className="h-ctl w-full @3xl/shell:w-auto @3xl/shell:self-start"
        >
          {t(installed ? 'app.installed' : 'app.install')}
        </Button>
      </StepRow>

      {/*
        * The footer: which panel this is, and a reload. Pull-to-refresh is
        * off across the panel (the same drag scrolls and opens the menu), so
        * the reload is offered here, deliberately. Safe at any time: the port
        * and the job belong to the server, and the page re-attaches to both.
        */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-num text-note text-ink">{t('app.version', { version: VERSION })}</span>
          <span className="text-note text-mut">{t(isUpdateReady() ? 'app.updateReady' : 'app.refreshWhy')}</span>
        </div>
        <Button
          tone={isUpdateReady() ? 'primary' : 'outline'}
          onClick={applyUpdate}
          className="h-ctl w-full @3xl/shell:w-auto"
        >
          {t('app.refresh')}
        </Button>
      </footer>
    </>
  );
};

export default AppScreen;
