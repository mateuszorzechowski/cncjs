// The panel's design system, as one module: the presentational components of
// src/panel/ui by name, plus the providers they read context from. Built by
// design-sync (see .design-sync/NOTES.md) into window.CncPanel for
// claude.ai/design. Components bound to a live machine are not here.

export { default as Button } from '../src/panel/ui/Button';
export { default as Card } from '../src/panel/ui/Card';
export { default as ConfirmSheet } from '../src/panel/ui/ConfirmSheet';
export { default as DateTimeField } from '../src/panel/ui/DateTimeField';
export { default as DroStack } from '../src/panel/ui/DroStack';
export { default as DroStrip } from '../src/panel/ui/DroStrip';
export { default as FadeScroller } from '../src/panel/ui/FadeScroller';
export { default as HelpButton } from '../src/panel/ui/HelpButton';
export { default as Icon } from '../src/panel/ui/Icon';
export { default as IconBar } from '../src/panel/ui/IconBar';
export { default as Meter } from '../src/panel/ui/Meter';
export { default as NavRail } from '../src/panel/ui/NavRail';
export { default as NavTabs } from '../src/panel/ui/NavTabs';
export { default as Notice } from '../src/panel/ui/Notice';
export { default as SegmentedChoice } from '../src/panel/ui/SegmentedChoice';
export { default as SettingGroup } from '../src/panel/ui/SettingGroup';
export { default as SettingRow } from '../src/panel/ui/SettingRow';
export { default as SettingSummary } from '../src/panel/ui/SettingSummary';
export { default as Sheet } from '../src/panel/ui/Sheet';
export { default as StateChip } from '../src/panel/ui/StateChip';
export { default as StatTile } from '../src/panel/ui/StatTile';
export { default as Stepper } from '../src/panel/ui/Stepper';
export { default as StepRow } from '../src/panel/ui/StepRow';
export { default as TextField } from '../src/panel/ui/TextField';
export { default as ToggleChips } from '../src/panel/ui/ToggleChips';
export { default as WcsBadge } from '../src/panel/ui/WcsBadge';

// ---------------------------------------------------------------------------
// PanelRoot: the panel's shell, as App.jsx sets it up around every screen —
// the measured container the components' `@3xl/shell:` queries read, the
// shell's width and node (sheets portal into it), the units rule the
// figures are formatted with, and the language. Everything this design
// system renders goes inside one.

import { useState } from 'react';
import i18next from 'i18next';
import { ShellNodeProvider, ShellWidthProvider, useMeasuredShell } from '../src/panel/ui/shell';
import { UnitsProvider } from '../src/panel/ui/units';

// The server's millimetre rule (src/server/services/units.js, UNITS.mm) — what
// every figure is formatted with. Inches: factor 1/25.4, digits 4 / 2 / 1.
const MM = { name: 'mm', factor: 1, digits: { position: 3, size: 1, feed: 0 } };

export const PanelRoot = ({ language = 'pl', units = MM, className = '', children }) => {
  useState(() => i18next.changeLanguage(language));
  const shell = useMeasuredShell();
  return (
    <div ref={shell.ref} className={`@container/shell flex min-h-full flex-col bg-bg text-ink ${className}`}>
      <ShellWidthProvider value={shell.width}>
        <ShellNodeProvider value={shell.node}>
          <UnitsProvider value={units}>
            {shell.node ? children : null}
          </UnitsProvider>
        </ShellNodeProvider>
      </ShellWidthProvider>
    </div>
  );
};

// ---------------------------------------------------------------------------
// DeviceFrame: a PanelRoot laid out at a device's real width — phone 360,
// tablet 1024, PC 1920 — so the shell's container queries answer as they do
// on that device, then scaled down to fit a card. For showing one component
// on each device side by side; a design builds its screen in a plain
// PanelRoot at the size it is.

import { useEffect, useRef } from 'react';

const DEVICES = {
  phone: { width: 360, scale: 1 },
  tablet: { width: 1024, scale: 0.6 },
  pc: { width: 1920, scale: 0.4 },
};

export const DeviceFrame = ({ device = 'tablet', height, language, units, children }) => {
  const { width, scale } = DEVICES[device] ?? DEVICES.tablet;
  const inner = useRef(null);
  const [tall, setTall] = useState(height ?? 0);
  useEffect(() => {
    if (height || !inner.current) {
      return undefined;
    }
    const observer = new ResizeObserver(([entry]) => setTall(entry.contentRect.height));
    observer.observe(inner.current);
    return () => observer.disconnect();
  }, [height]);
  return (
    <div style={{ width: width * scale, height: tall * scale, overflow: 'hidden', flex: 'none' }}>
      <div ref={inner} style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <PanelRoot language={language} units={units} className="h-full">{children}</PanelRoot>
      </div>
    </div>
  );
};
