// SPDX-License-Identifier: MIT

import * as _cluster from 'node:cluster';
import * as os from 'os';
import { Injectable } from '@nestjs/common';
const cluster = _cluster as unknown as _cluster.Cluster;
const numCPUs = os.cpus().length - 4;

@Injectable()
export class AppClusterService {
  // eslint-disable-next-line @typescript-eslint/ban-types
  static clusterize(callback: Function): void {
    if (cluster.isMaster) {
      console.log(`Master server started on ${process.pid}`);
      for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Restarting`);
        cluster.fork();
      });
    } else {
      console.log(`Cluster server started on ${process.pid}`);
      callback();
    }
  }
}
