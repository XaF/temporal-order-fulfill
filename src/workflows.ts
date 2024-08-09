import {
  proxyActivities
}
  from '@temporalio/workflow';

import type * as activities from './activities';
import type { Order } from './interfaces/order';

const { processPayment, reserveInventory, deliverOrder } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 seconds',
  retry: {
    nonRetryableErrorTypes: ['CreditCardExpiredException'],
    maximumInterval: '15 seconds'
   }
});

export async function OrderFulfillWorkflow(order: Order): Promise<string> {
  const paymentResult = await processPayment(order);
  const inventoryResult = await reserveInventory(order);
  const deliveryResult = await deliverOrder(order);
  console.log('Done.')
  return `Order fulfilled ${paymentResult} ${inventoryResult} ${deliveryResult}`;
}

