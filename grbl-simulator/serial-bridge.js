#!/usr/bin/env node

/**
 * Serial Port Bridge for Grbl Simulator
 * Creates a virtual serial port and bridges it to the TCP socket
 * This allows cncjs and other serial-based software to connect to the simulator
 */

const net = require('net');
const { spawn } = require('child_process');

class SerialBridge {
    constructor(tcpPort = 8888, serialPath = '/tmp/ttyGRBL') {
        this.tcpPort = tcpPort;
        this.serialPath = serialPath;
        this.socatProcess = null;
        this.bridgeActive = false;
    }

    async start() {
        console.log('Grbl Simulator - Serial Bridge');

        // Windows has no pty: the virtual port is one end of a com0com pair
        // (e.g. COM20 <-> COM21); the bridge opens this end, cncjs the other.
        if (/^COM\d+$/i.test(this.serialPath)) {
            this.bridgeComPort();
            return;
        }

        // Check if socat is installed
        try {
            await this.checkSocat();
        } catch (err) {
            console.error('Error: socat is not installed');
            console.error('Install with: sudo apt-get install socat');
            process.exit(1);
        }

        // Create virtual serial port with socat
        console.log(`Creating virtual serial device at "${this.serialPath}"`);
        console.log(`Bridging to TCP port ${this.tcpPort}`);

        this.socatProcess = spawn('socat', [
            `-d`, `-d`,
            `pty,raw,echo=0,link=${this.serialPath}`,
            `tcp:localhost:${this.tcpPort}`
        ], {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        this.socatProcess.stdout.on('data', (data) => {
            const msg = data.toString();
            if (msg.includes('starting data transfer')) {
                this.bridgeActive = true;
                console.log(`Connected virtual serial path "${this.serialPath}" to localhost:${this.tcpPort}`);
            }
        });

        this.socatProcess.stderr.on('data', (data) => {
            const msg = data.toString();
            // socat sends logs to stderr
            if (process.env.DEBUG) {
                console.log('[socat]', msg.trim());
            }
        });

        this.socatProcess.on('error', (err) => {
            console.error('socat error:', err.message);
            process.exit(1);
        });

        this.socatProcess.on('exit', (code) => {
            if (code !== 0 && code !== null) {
                console.error(`socat exited with code ${code}`);
            }
            process.exit(code || 0);
        });

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n\nShutting down serial bridge...');
            this.stop();
        });

        process.on('SIGTERM', () => {
            this.stop();
        });
    }

    bridgeComPort() {
        const { SerialPort } = require('serialport');
        const port = new SerialPort({ path: this.serialPath, baudRate: 115200 });
        const socket = net.connect(this.tcpPort, 'localhost');

        port.on('open', () => console.log(`Connected "${this.serialPath}" to localhost:${this.tcpPort}`));
        port.on('data', (data) => socket.write(data));
        socket.on('data', (data) => port.write(data));

        const fail = (what) => (err) => {
            console.error(`${what}: ${err ? err.message : 'closed'}`);
            process.exit(1);
        };
        port.on('error', fail(this.serialPath));
        port.on('close', fail(this.serialPath));
        socket.on('error', fail(`localhost:${this.tcpPort}`));
        socket.on('close', fail(`localhost:${this.tcpPort}`));
    }

    checkSocat() {
        return new Promise((resolve, reject) => {
            const proc = spawn('which', ['socat']);
            proc.on('exit', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error('socat not found'));
                }
            });
        });
    }

    stop() {
        if (this.socatProcess) {
            this.socatProcess.kill();
        }
        process.exit(0);
    }
}

if (require.main === module) {
    const tcpPort = parseInt(process.argv[2]) || 8888;
    const serialPath = process.argv[3] || '/tmp/ttyGRBL';

    const bridge = new SerialBridge(tcpPort, serialPath);
    bridge.start().catch((err) => {
        console.error('Failed to start bridge:', err.message);
        process.exit(1);
    });
}

module.exports = SerialBridge;
