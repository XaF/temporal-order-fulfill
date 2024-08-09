import fs from 'fs/promises';

import { Worker, NativeConnection } from '@temporalio/worker';
import { TLSConfig } from '@temporalio/client';
import * as activities from './activities';

/**
 * Run a Worker with an mTLS connection, configuration is provided via environment variables.
 * Note that serverNameOverride and serverRootCACertificate are optional.
 */
async function run({
  address,
  namespace,
  clientCertPath,
  clientKeyPath,
  serverNameOverride,
  serverRootCACertificatePath,
  taskQueue,
}: Env) {
  let tls: TLSConfig | undefined = undefined;
  if (serverNameOverride || serverRootCACertificatePath || clientCertPath || clientKeyPath) {
    let serverRootCACertificate: Buffer | undefined = undefined;
    if (serverRootCACertificatePath) {
      serverRootCACertificate = await fs.readFile(serverRootCACertificatePath);
    }

    if (!clientCertPath || !clientKeyPath) {
      throw new Error('clientCertPath and clientKeyPath must be provided to use mTLS');
    }

    tls = {
      serverNameOverride,
      serverRootCACertificate,
      clientCertPair: {
        crt: await fs.readFile(clientCertPath),
        key: await fs.readFile(clientKeyPath),
      },
    };
  }

  const connection = await NativeConnection.connect({
    address,
    tls,
  });

  const worker = await Worker.create({
    connection,
    namespace,
    workflowsPath: require.resolve('./workflows'),
    activities,
    taskQueue,
  });
  console.log('Worker connection successfully established');

  await worker.run();
  await connection.close();
}

run(getEnv()).catch((err) => {
  console.error(err);
  process.exit(1);
});

export interface Env {
  address: string;
  namespace: string;
  clientCertPath?: string;
  clientKeyPath?: string;
  serverNameOverride?: string;
  serverRootCACertificatePath?: string;
  taskQueue: string;
}

export function getEnv(): Env {
  return {
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    clientCertPath: process.env.TEMPORAL_CLIENT_CERT_PATH,
    clientKeyPath: process.env.TEMPORAL_CLIENT_KEY_PATH,
    serverNameOverride: process.env.TEMPORAL_SERVER_NAME_OVERRIDE,
    serverRootCACertificatePath: process.env.TEMPORAL_SERVER_ROOT_CA_CERT_PATH,
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'sample-order-fulfill',
  };
}
