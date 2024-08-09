import fs from 'fs/promises';
import path from 'path';
import { Connection, Client } from '@temporalio/client';
import { runWorkflows } from './starter';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { Order, OrderItem } from './interfaces/order';
import { TLSConfig } from '@temporalio/client';

/**
 * Schedule a Workflow connecting with mTLS, configuration is provided via environment variables.
 * Note that serverNameOverride and serverRootCACertificate are optional.
 *
 * If using Temporal Cloud, omit the serverRootCACertificate so that Node.js defaults to using
 * Mozilla's publicly trusted list of CAs when verifying the server certificate.
 */
async function run(
  {
    address,
    namespace,
    clientCertPath,
    clientKeyPath,
    serverNameOverride,
    serverRootCACertificatePath,
    taskQueue,
  }: Env,
  numOrders?: number,
  invalidPercentage?: number,
  expensivePercentage?: number,
  expiredCardPercentage?: number,
) {
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
  const orders = generateOrders(
    numOrders || 1,
    invalidPercentage || 0,
    expensivePercentage || 0,
    expiredCardPercentage || 0,
  );

  await runWorkflows(client, taskQueue, orders);
  console.log('All workflows started');
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateOrders(
  count: number,
  invalidPercentage: number,
  expensivePercentage: number,
  expiredCardPercentage: number,
): Order[] {
  const stockDatabasePath = path.resolve(__dirname, '../data/stock_database.json');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const stockData = require(stockDatabasePath);
  const orders: Order[] = [];
  const numInvalidOrders = Math.floor((invalidPercentage / 100) * count);
  const numExpensiveOrders = Math.floor((expensivePercentage / 100) * count);
  const numExpiredCardOrders = Math.floor((expiredCardPercentage / 100) * count);

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
      items,
      payment: {
        creditCard: {
          number: "1234 5678 1234 5678",
          expiration: "12/25"
        }
      }
    };

    orders.push(order);
  }

  makeOrdersInvalid(pickRandomItems(orders, invalidPercentage));
  makeOrdersExpensive(pickRandomItems(orders, expensivePercentage));
  makeOrdersExpiredCard(pickRandomItems(orders, expiredCardPercentage));

  return orders;
}

const pickRandomItems = <T> (arr: T[], percentage: number): T[] => {
  const shuffled = Array.from(arr).sort(() => 0.5 - Math.random());
  const n = Math.floor((percentage / 100) * arr.length);
  return shuffled.slice(0, n);
}

function makeOrdersInvalid(orders: Order[]): void {
  orders.forEach(function (order: Order) {
    // Append @@@ to one of the item names to make the order invalid
    if (order.items.length > 0) {
      order.items[0].itemName += "@@@";
    }
  });
}

function makeOrdersExpensive(orders: Order[]): void {
  orders.forEach(function (order: Order) {
    let orderTotal = order.items.reduce((sum, item) => sum + item.itemPrice * item.quantity, 0);
    while (orderTotal <= 10000) {
      // Add a random number between 1 and 3 of each items
      order.items.forEach(function (item: OrderItem) {
        item.quantity += getRandomInt(1, 3);
      });
      // Compute the new price
      orderTotal = order.items.reduce((sum, item) => sum + item.itemPrice * item.quantity, 0);
    }
  });
}

function makeOrdersExpiredCard(orders: Order[]): void {
  orders.forEach(function (order: Order) {
    order.payment.creditCard.expiration = '12/23';
  });
}

const argv = yargs(hideBin(process.argv)).options({
  numOrders: { type: 'number', alias: 'n' },
  invalidPercentage: { type: 'number', alias: 'i' },
  expensivePercentage: { type: 'number', alias: 'e' },
  expiredCardPercentage: { type: 'number', alias: 'E' },
}).argv as {
  numOrders?: number,
  invalidPercentage?: number,
  expensivePercentage?: number,
  expiredCardPercentage?: number,
};

run(
  getEnv(),
  argv.numOrders,
  argv.invalidPercentage,
  argv.expensivePercentage,
  argv.expiredCardPercentage,
).then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);

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
