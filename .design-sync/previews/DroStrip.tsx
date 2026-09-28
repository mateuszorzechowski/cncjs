import { DroStrip, Card, WcsBadge, DeviceFrame } from 'cncjs';

export const OnJog = () => (
  // Telefon / tablet / PC: three columns in one line everywhere; the work figure grows with the strip's own width: 19px, 26px from a 24rem strip, `--val` from a 48rem strip.
  // The position as a check rather than the subject: three axes across one
  // line, as the Jog screen has it above the toolpath. Work reading large,
  // machine reading small under it; no unit. Given the width of a wide Jog
  // screen, the figures step up.
  <div className="w-full">
    <Card label="Pozycja" aside={<WcsBadge wcs="G54" />} bodyClassName="gap-0">
      <DroStrip position={{ x: 112.4, y: 48.25, z: 5 }} machinePosition={{ x: -287.6, y: -251.75, z: -35 }} />
    </Card>
  </div>
);

export const AtWorkZero = () => (
  // At the part's zero: the work reading is 0.000, the machine's is not.
  <div className="w-side">
    <Card label="Pozycja" aside={<WcsBadge wcs="G55" />} bodyClassName="gap-0">
      <DroStrip position={{ x: 0, y: 0, z: 0 }} machinePosition={{ x: -400, y: -300, z: -40 }} />
    </Card>
  </div>
);

export const Narrow = () => (
  // Narrow, as on a phone: the figures step down so the widest coordinate the
  // panel can show still fits its column.
  <div className="w-[360px]">
    <Card label="Pozycja" aside={<WcsBadge wcs="G54" />} bodyClassName="gap-0">
      <DroStrip position={{ x: -1234.567, y: 250.5, z: -12.35 }} machinePosition={{ x: -1634.567, y: -49.5, z: -52.35 }} />
    </Card>
  </div>
);

export const Phone = () => (
  // Telefon (360): the strip is ~320px, under 24rem: X, Y, Z columns with
  // dividers, the work figure at 19px (`text-read`), the machine figure under it.
  <DeviceFrame device="phone">
    <div className="flex gap-gap">
      <div className="hidden w-jcard shrink-0 @3xl/shell:flex">
        <Card label="Jog" className="w-full">
          <p className="m-0 text-note text-mut">Klawiatura jogu</p>
        </Card>
      </div>
      <Card label="Pozycja" aside={<WcsBadge wcs="G54" />} className="min-w-0 flex-1" bodyClassName="gap-0">
        <DroStrip position={{ x: -1234.567, y: 250.5, z: -12.35 }} machinePosition={{ x: -1634.567, y: -49.5, z: -52.35 }} />
      </Card>
    </div>
  </DeviceFrame>
);

export const Tablet = () => (
  // Tablet (1024): beside the jog card the strip is ~600px, past `@sm` (24rem)
  // and short of `@3xl` (48rem), so the work figures step up to 26px (`text-readWide`).
  <DeviceFrame device="tablet">
    <div className="flex gap-gap">
      <div className="hidden w-jcard shrink-0 @3xl/shell:flex">
        <Card label="Jog" className="w-full">
          <p className="m-0 text-note text-mut">Klawiatura jogu</p>
        </Card>
      </div>
      <Card label="Pozycja" aside={<WcsBadge wcs="G54" />} className="min-w-0 flex-1" bodyClassName="gap-0">
        <DroStrip position={{ x: -1234.567, y: 250.5, z: -12.35 }} machinePosition={{ x: -1634.567, y: -49.5, z: -52.35 }} />
      </Card>
    </div>
  </DeviceFrame>
);

export const PC = () => (
  // PC (1920): the same layout, the strip ~1500px, past `@3xl`, so the work
  // figures go to `--val`, the machine-reading token; columns simply wider.
  <DeviceFrame device="pc">
    <div className="flex gap-gap">
      <div className="hidden w-jcard shrink-0 @3xl/shell:flex">
        <Card label="Jog" className="w-full">
          <p className="m-0 text-note text-mut">Klawiatura jogu</p>
        </Card>
      </div>
      <Card label="Pozycja" aside={<WcsBadge wcs="G54" />} className="min-w-0 flex-1" bodyClassName="gap-0">
        <DroStrip position={{ x: -1234.567, y: 250.5, z: -12.35 }} machinePosition={{ x: -1634.567, y: -49.5, z: -52.35 }} />
      </Card>
    </div>
  </DeviceFrame>
);
