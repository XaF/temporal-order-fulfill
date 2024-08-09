import fs from 'fs/promises';
import * as activity from '@temporalio/activity';
import { Order } from './interfaces/order';
import { reserveInventory as reserveInventoryAPI } from './api';

export async function requireApproval(order: Order): Promise<boolean> {
  console.log(`Checking order requires approval (over $10k)`);

  // Simulate approval logic
  const orderTotal = order.items.reduce((sum, item) => sum + item.itemPrice * item.quantity, 0);
  if (orderTotal > 10000) {
    console.log('Order requires approval (total: '+orderTotal+')');
    return true;
  }

  console.log('Order does not require approval (total: '+orderTotal+')');
  return false;
}

export async function processPayment(order: Order): Promise<string> {
  console.log("Processing payment...");

  // Simulate payment processing logic
  if (order.payment.creditCard.expiration === "12/23") {
    throw new CreditCardExpiredException("Payment failed: Credit card expired");
  }

  return `Payment processed for ${order.items.length} items.`;
}

async function inventoryServiceAvailable(): Promise<boolean> {
  const inventoryServiceStatusFile = 'inventory-service-available';

  try {
    // If the file exists, only consider the service unavailable if the file
    // contains '0' or 'false'
    const inventoryServiceStatus = await fs.readFile(inventoryServiceStatusFile);
    switch (inventoryServiceStatus.toString().trim().toLowerCase()) {
      case '0':
      case 'false':
      case 'no':
        return false;
      default:
        break;
    }
  } catch (error) {
    // Ignore errors in opening the file
  }

  return true;
}

export async function reserveInventory(order: Order): Promise<string> {  
  // Simulate inventory service downtime
  // The activity will sleep then throw an error
  // to simulate API call timeout while the service
  // is unavailable
  if (!await inventoryServiceAvailable()) {
    console.log(`Simulating inventory service timeout`);
    await new Promise((resolve) => setTimeout(resolve, 10000));
    throw new Error("Inventory service down");
  }

  console.log("Reserving inventory...");
  
  await reserveInventoryAPI(order.items);

  // Simulate inventory reservation logic
  return `Inventory reserved for ${order.items.length} items.`;
}

export async function deliverOrder(order: Order): Promise<string> {
  console.log("Delivering order...");
  // Simulate order delivery logic
  return `Order delivered for ${order.items.length} items.`;
}


export class CreditCardExpiredException extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = CreditCardExpiredException.name;
  }
}