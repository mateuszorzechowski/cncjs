#!/usr/bin/env node

/**
 * Puts something under the simulator's probe, or holds its pin.
 *
 *   node probe-scene.js <tcpPort> z <x> <y> <top> [plate=10] [tool=6]
 *   node probe-scene.js <tcpPort> corner <name> <x> <y> <top> [thickness=10] [wallX=10] [wallY=10] [tool=6]
 *   node probe-scene.js <tcpPort> surface
 *   node probe-scene.js <tcpPort> pin on|off|tap
 *
 * Machine coordinates, mm. `z`: a plate `plate` thick on the work whose top
 * is `top`, centred on x y. `corner`: the L plate on corner `name`
 * (front-left, front-right, back-left, back-right) of a work whose corner is
 * at x y, top `top` — its top on the work, its walls hanging over the edges.
 * `surface`: the warped surface again. `tap`: the pin closed for half a
 * second, the clip touched to the plate. Defaults are the wizard's.
 */

const net = require('net');

const CORNERS = {
    'front-left': { x: 1, y: 1 },
    'front-right': { x: -1, y: 1 },
    'back-left': { x: 1, y: -1 },
    'back-right': { x: -1, y: -1 },
};

// Work is this much in from its corner and this deep; the plate this long.
const WORK = 100;
const DEPTH = 30;
const PLATE = 40;
const HANG = 20;

const span = (c, s, from, to) => [Math.min(c + s * from, c + s * to), Math.max(c + s * from, c + s * to)];

const scenes = {
    z: (x, y, top, plate = 10, tool = 6) => ({
        toolDiameter: tool,
        boxes: [
            { x: [x - WORK, x + WORK], y: [y - WORK, y + WORK], z: [top - DEPTH, top] },
            { x: [x - PLATE / 2, x + PLATE / 2], y: [y - PLATE / 2, y + PLATE / 2], z: [top, top + plate] },
        ],
    }),
    corner: (name, cx, cy, top, thickness = 10, wallX = 10, wallY = 10, tool = 6) => {
        const { x: sx, y: sy } = CORNERS[name] || {};
        if (!sx) {
            throw new Error(`corner is one of ${Object.keys(CORNERS).join(', ')}`);
        }
        const slabX = span(cx, sx, -wallX, PLATE);
        const slabY = span(cy, sy, -wallY, PLATE);
        return {
            toolDiameter: tool,
            boxes: [
                { x: span(cx, sx, 0, WORK), y: span(cy, sy, 0, WORK), z: [top - DEPTH, top] },
                { x: slabX, y: slabY, z: [top, top + thickness] },
                { x: span(cx, sx, -wallX, 0), y: slabY, z: [top - HANG, top] },
                { x: slabX, y: span(cy, sy, -wallY, 0), z: [top - HANG, top] },
            ],
        };
    },
};

const lines = (what, args) => {
    if (what === 'pin') {
        return args[0] === 'tap' ? ['#pin on', 500, '#pin off'] : [`#pin ${args[0]}`];
    }
    if (what === 'surface') {
        return ['#scene'];
    }
    const [first, ...rest] = what === 'corner' ? [args[0], ...args.slice(1).map(Number)] : args.map(Number);
    return [`#scene ${JSON.stringify(scenes[what](first, ...rest))}`];
};

if (require.main === module) {
    const [port, what, ...args] = process.argv.slice(2);
    if (!port || !['z', 'corner', 'surface', 'pin'].includes(what)) {
        console.error('usage: see the top of probe-scene.js');
        process.exit(1);
    }
    const queue = lines(what, args);
    const socket = net.connect(Number(port), 'localhost');
    const next = () => {
        const item = queue.shift();
        if (item === undefined) {
            socket.end();
        } else if (typeof item === 'number') {
            setTimeout(next, item);
        } else {
            socket.write(`${item}\n`);
        }
    };
    socket.on('data', (data) => {
        const text = data.toString();
        if (/^(ok|error)/m.test(text)) {
            process.stdout.write(text);
            next();
        }
    });
    socket.on('connect', next);
    socket.on('error', (err) => {
        console.error(err.message);
        process.exit(1);
    });
}

module.exports = { scenes, CORNERS };
