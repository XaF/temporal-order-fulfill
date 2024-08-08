import fs from 'fs/promises';
import path from 'path';
import { Connection, Client } from '@temporalio/client';
import { runWorkflows, getDefaultOrders } from './starter';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { Order, OrderItem } from './interfaces/order';

/**
 * Schedule a Workflow connecting with mTLS, configuration is provided via environment variables.
 * Note that serverNameOverride and serverRootCACertificate are optional.
 *
 * If using Temporal Cloud, omit the serverRootCACertificate so that Node.js defaults to using
 * Mozilla's publicly trusted list of CAs when verifying the server certificate.
 */
async function run({
  address,
  namespace,
  clientCertPath,
  clientKeyPath,
  serverNameOverride,
  serverRootCACertificatePath,
  taskQueue,
}: Env, numOrders?: number, invalidPercentage?: number) {
  let tls: TLSConfig | undefined = undefined;
  if (serverNameOverride || serverRootCACertificatePath || clientCertPath || clientKeyPath) {
    // Note that the serverRootCACertificate is NOT needed if connecting to Temporal Cloud because
    // the server certificate is issued by a publicly trusted CA.
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

  const connection = await Connection.connect({
    address,
    tls,
  });
  const client = new Client({ connection, namespace });

  // Generate orders
  const orders = numOrders && invalidPercentage !== undefined
    ? generateOrders(numOrders, invalidPercentage)
    : getDefaultOrders();

  await runWorkflows(client, taskQueue, orders);
  console.log('All workflows started');
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateOrders(count: number, invalidPercentage: number): Order[] {
  const stockDatabasePath = path.resolve(__dirname, '../data/stock_database.json');
  const stockData = require(stockDatabasePath);
  const orders: Order[] = [];
  const numInvalidOrders = Math.floor((invalidPercentage / 100) * count);

  for (let i = 0; i < count; i++) {
    const numItems = getRandomInt(1, 3);
    const items: OrderItem[] = [];

    for (let j = 0; j < numItems; j++) {
      const itemIndex = getRandomInt(0, stockData.length - 1);
      const item = stockData[itemIndex];
      items.push({
        itemName: item.itemName,
        itemPrice: item.itemPrice,
        quantity: getRandomInt(1, 3),
      });
    }

    const order: Order = {
      items: items,
      payment: {
        creditCard: {
          number: "1234 5678 1234 5678",
          expiration: "12/25"
        }
      }
    };

    if (i < numInvalidOrders) {
      makeOrderInvalid(order);
    }

    orders.push(order);
  }

  return orders;
}

function makeOrderInvalid(order: Order): void {
  // Append @@@ to one of the item names to make them invalid
  if (order.items.length > 0) {
    order.items[0].itemName += "@@@";
  }
}

const argv = yargs(hideBin(process.argv)).options({
  numOrders: { type: 'number', alias: 'n' },
  invalidPercentage: { type: 'number', alias: 'i' }
}).argv as { numOrders?: number, invalidPercentage?: number };

run(getEnv(), argv.numOrders, argv.invalidPercentage).then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);

// Helpers for configuring the mTLS client and worker samples

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new ReferenceError(`${name} environment variable is not defined`);
  }
  return value;
}

export interface Env {
  address: string;
  namespace: string;
  clientCertPath?: string;
  clientKeyPath?: string;
  serverNameOverride?: string; // not needed if connecting to Temporal Cloud
  serverRootCACertificatePath?: string; // not needed if connecting to Temporal Cloud
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
