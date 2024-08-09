import { promises as fs } from 'fs';
import path from 'path';
import { OrderItem } from './interfaces/order';

const stockDatabasePath = path.resolve(__dirname, '../data/stock_database.json');

interface StockItem {
  itemName: string;
  itemPrice: number;
  stock: number;
}

async function itemNamesBugFix(): Promise<boolean> {
  const itemNamesBugFixStatusFile = 'item-names-bug-fix';

  try {
    // If the file exists, only consider the bug fix if the contents is
    // one of 1, true or yes
    const itemNamesBugFixStatus = await fs.readFile(itemNamesBugFixStatusFile);
    switch (itemNamesBugFixStatus.toString().trim().toLowerCase()) {
      case '1':
      case 'true':
      case 'yes':
        return true;
      default:
        break;
    }
  } catch (error) {
    // Ignore errors in opening the file
  }

  return false;
}

async function reserveInventory(orderItems: OrderItem[]): Promise<void> {
  const stockData = await fs.readFile(stockDatabasePath, 'utf-8');
  const stockDatabase: StockItem[] = JSON.parse(stockData);

  for (const orderItem of orderItems) {
    let itemName = orderItem.itemName;

    // SIMULATE BUG FIX FOR INVALID DATA BUG
    if (await itemNamesBugFix()) {
      // Removes @@@ from the end of the item name if present
      if (itemName.endsWith('@@@')) {
        itemName = itemName.slice(0, -3);
        console.log(`BUG FIX: Removed @@@ from item name: ${itemName}`);
      }
    }

    const stockItem = stockDatabase.find(item => item.itemName === itemName);

    if (!stockItem) {
      throw new Error(`Couldn't find item in stock database: ${orderItem.itemName}`);
    }

    console.log(`Reserving inventory for item: ${orderItem.itemName}`);
  }
  // simulating the reservation with print statements
}

export { reserveInventory };
