# Grbl Simulator

A Grbl v1.1 CNC controller simulator with TCP socket server for testing CNC software without physical hardware.

## Quick Start

```bash
# Start server (default port: 3000)
node grbl-server.js

# Or specify a port
node grbl-server.js 8080

# Connect with telnet
telnet localhost 3000
```

## Usage with CNCjs

```bash
# Automatically finds an available port and creates virtual serial port
./start-with-cncjs.sh

# Connect cncjs to virtual serial port
cncjs -p /tmp/ttyGRBL
```

Or add to `~/.cncrc`:
```json
{
  "ports": [{ "path": "/tmp/ttyGRBL", "manufacturer": "Grbl Simulator" }]
}
```

On Windows there is no pty: install [com0com](https://sourceforge.net/projects/com0com/)
(the signed build), name a pair `COM20` / `COM21` with "use Ports class" on,
and bridge one end:

```bash
node grbl-server.js 5000
node serial-bridge.js 5000 COM21
# cncjs opens COM20
```

## Probing

`G38.2`–`G38.5` touch a scene: boxes in machine coordinates, grown by the
tool's radius in X and Y. With no scene, a warped surface at about Z -3.
The probe pin (`Pn:P`) is lit while the tool touches the scene, or while it
is held by hand. Replies come after the motion, as Grbl 1.1h gave them:
`[PRB:…:1]` `ok` on a touch; `ALARM:5` `[PRB:…:0]` `ok` for a `G38.2` that
touches nothing; `ALARM:4` `ok` for a pin already closed.

```bash
# the L plate on the front-left corner of a work at X-150 Y-90, top Z-60
node probe-scene.js 5000 corner front-left -150 -90 -60 10 10 10 6
# a 10 mm Z plate on a work whose top is Z-60, centred on X-100 Y-50
node probe-scene.js 5000 z -100 -50 -60 10 6
# the clip touched to the plate, for the wizard's wire test
node probe-scene.js 5000 pin tap
# back to the warped surface
node probe-scene.js 5000 surface
```

These send the simulator's own control lines, which any connection may:
`#pin on|off`, `#scene {"boxes": [...], "toolDiameter": d}`, `#scene`.

## Features

- **Grbl v1.1 Protocol** - Real-time commands (`?`, `!`, `~`, `Ctrl-X`), system commands (`$$`, `$#`, `$G`, `$H`, `$X`, `$J`)
- **G-code Support** - G0/G1 linear, G2/G3 arcs, G10/G92 offsets, G20/G21 units, G90/G91 modes, G53 machine moves, G38.2-G38.5 probing
- **Position Tracking** - Real-time interpolation during motion
- **State Machine** - Idle, Run, Hold, Jog, Alarm, Door, Check, Home, Sleep
- **Coordinate Systems** - MPos, WPos, G54-G59 offsets
- **40+ Settings** - Configurable via `$x=value`

## Commands

| Command | Description |
|---------|-------------|
| `?` | Status report |
| `!` | Feed hold |
| `~` | Cycle resume |
| `Ctrl-X` | Soft reset |
| `$$` | View settings |
| `$#` | View parameters |
| `$G` | Parser state |
| `$H` | Homing cycle |
| `$X` | Kill alarm |
| `$J=X10 F500` | Jog command |


## References

- [Grbl GitHub Repository](https://github.com/gnea/grbl)
- [Grbl v1.1 Wiki](https://github.com/gnea/grbl/wiki)

## License

MIT
