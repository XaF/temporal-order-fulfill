export interface OrderItem {
    itemName: string;
    itemPrice: number;
    quantity: number;
}

export interface Order {
    items: OrderItem[];
    payment: Payment;
}

interface Payment {
    creditCard: CreditCard;
}

interface CreditCard {
  number: string;
  expiration: string;
}