import { proxyActivities, defineSignal, setHandler, condition }
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
        await condition(() => isApproved);
    }

    const paymentResult = await processPayment(order);
    const inventoryResult = await reserveInventory(order);
    const deliveryResult = await deliverOrder(order);
    console.log('Done.');
    return `Order fulfilled: ${paymentResult}, ${inventoryResult}, ${deliveryResult}`;
}
