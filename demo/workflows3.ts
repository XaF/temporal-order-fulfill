import {
  proxyActivities, defineSignal, setHandler, condition, sleep, ApplicationFailure
}
  from '@temporalio/workflow';

import type * as activities from '../src/activities';
import type { Order } from '../src/interfaces/order';

const { requireApproval, processPayment, reserveInventory, deliverOrder } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 seconds',
  retry: { nonRetryableErrorTypes: ['CreditCardExpiredException'] }
});

export const approveOrder = defineSignal('approveOrder');

export async function OrderFulfillWorkflow(order: Order): Promise<string> {
  let isApproved = false;
  setHandler(approveOrder, () => { isApproved = true; });

  if (await requireApproval(order)) {
    const approvalOrTimeout = Promise.race([
      condition(() => isApproved),
      sleep(30000).then(() => { throw new ApplicationFailure('Approval timed out'); })
    ]);

    await approvalOrTimeout;
  }

  const paymentResult = await processPayment(order);
  const inventoryResult = await reserveInventory(order);
  const deliveryResult = await deliverOrder(order);
  console.log('Done.');
  return `Order fulfilled: ${paymentResult}, ${inventoryResult}, ${deliveryResult}`;
}