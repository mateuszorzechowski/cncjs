import os from 'os';
import path from 'path';

const maxAge = 0;

export default {
  route: '/', // with trailing slash
  assets: {
    // The panel, at the site root. The old application is no longer served
    // (Mateusz, 2026-10-08); its sources stay in `src/app` for reference.
    panel: {
      routes: [
        '/'
      ],
      path: path.resolve(__dirname, '..', '..', 'panel'),
      maxAge: maxAge
    }
  },
  backend: {
    enable: true,
    host: 'localhost',
    port: 80,
    route: 'api/'
  },
  cluster: {
    // note. node-inspector cannot debug child (forked) process
    enable: false,
    maxWorkers: os.cpus().length || 1
  },
  winston: {
    // https://github.com/winstonjs/winston#logging-levels
    level: 'debug'
  }
};
