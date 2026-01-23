// Mock Prisma client for MVP - bypasses Prisma 7 runtime config issues
// In production, integrate proper DB driver or use @prisma/adapter-better-sqlite3

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  images: string;
  stock: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  createdAt: Date;
  updatedAt: Date;
  product?: Product;
}

interface Order {
  id: string;
  userId: string;
  status: string;
  total: number;
  shippingAddress: string;
  createdAt: Date;
  updatedAt: Date;
  items?: OrderItem[];
}

interface Payment {
  id: string;
  orderId: string;
  stripePaymentIntentId: string;
  stripeChargeId?: string;
  amount: number;
  status: string;
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: Date;
  lastWebhookEvent?: string;
  lastWebhookTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}


// In-memory storage
const mockProducts: Map<string, Product> = new Map([
  ['prod1', {
    id: 'prod1',
    name: 'Wireless Headphones',
    price: 79.99,
    description: 'Premium wireless headphones with noise cancellation',
    images: JSON.stringify(['https://via.placeholder.com/300?text=Headphones']),
    stock: 15,
    status: 'active',
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
  }],
  ['prod2', {
    id: 'prod2',
    name: 'USB-C Cable',
    price: 19.99,
    description: 'Fast charging USB-C cable 2 meters',
    images: JSON.stringify(['https://via.placeholder.com/300?text=Cable']),
    stock: 50,
    status: 'active',
    createdAt: new Date('2026-01-14'),
    updatedAt: new Date('2026-01-14'),
  }],
  ['prod3', {
    id: 'prod3',
    name: 'Phone Case',
    price: 24.99,
    description: 'Durable protective phone case',
    images: JSON.stringify(['https://via.placeholder.com/300?text=PhoneCase']),
    stock: 0,
    status: 'inactive',
    createdAt: new Date('2026-01-13'),
    updatedAt: new Date('2026-01-13'),
  }],
]);

const mockOrders: Map<string, Order> = new Map();
const mockOrderItems: Map<string, OrderItem> = new Map();
const mockPayments: Map<string, Payment> = new Map();

function filterProducts(where?: any): Product[] {
  if (!where) return Array.from(mockProducts.values());
  
  return Array.from(mockProducts.values()).filter(product => {
    // Filter by status
    if (where.status && product.status !== where.status) return false;
    
    // Filter by search (name or description contains)
    if (where.OR) {
      const matches = where.OR.some((condition: any) => {
        if (condition.name?.contains) {
          return product.name.toLowerCase().includes(condition.name.contains.toLowerCase());
        }
        if (condition.description?.contains) {
          return product.description.toLowerCase().includes(condition.description.contains.toLowerCase());
        }
        return false;
      });
      if (!matches) return false;
    }
    
    return true;
  });
}

export const prisma = {
  product: {
    findMany: async (options?: any) => {
      let results = filterProducts(options?.where);
      
      // Handle ordering
      if (options?.orderBy) {
        const [field, direction] = Object.entries(options.orderBy)[0] as [string, string];
        results.sort((a, b) => {
          const aVal = (a as any)[field];
          const bVal = (b as any)[field];
          if (direction === 'desc') return new Date(bVal).getTime() - new Date(aVal).getTime();
          return new Date(aVal).getTime() - new Date(bVal).getTime();
        });
      }
      
      return results;
    },
    
    findUnique: async (options: any) => {
      const id = options?.where?.id;
      return mockProducts.get(id) || null;
    },
    
    create: async (options: any) => {
      const { data } = options;
      const id = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const product: Product = {
        id,
        name: data.name,
        price: data.price,
        description: data.description || '',
        images: data.images || '[]',
        stock: data.stock || 0,
        status: data.status || 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockProducts.set(id, product);
      return product;
    },
    
    update: async (options: any) => {
      const { where, data } = options;
      const id = where?.id;
      const product = mockProducts.get(id);
      if (!product) throw new Error(`Product ${id} not found`);
      
      const updated: Product = {
        ...product,
        ...data,
        updatedAt: new Date(),
      };
      mockProducts.set(id, updated);
      return updated;
    },
    
    delete: async (options: any) => {
      const { where } = options;
      const id = where?.id;
      const product = mockProducts.get(id);
      if (product) mockProducts.delete(id);
      return product || null;
    },
    
    count: async () => mockProducts.size,
  },

  order: {
    findMany: async (options?: any) => {
      let results = Array.from(mockOrders.values());
      
      // Handle where clause
      if (options?.where) {
        if (options.where.userId) {
          results = results.filter(o => o.userId === options.where.userId);
        }
      }
      
      // Include items with product details
      if (options?.include?.items) {
        results = results.map(order => ({
          ...order,
          items: Array.from(mockOrderItems.values())
            .filter(item => item.orderId === order.id)
            .map(item => ({
              ...item,
              product: mockProducts.get(item.productId) || undefined,
            })),
        }));
      }
      
      return results;
    },

    findUnique: async (options: any) => {
      const id = options?.where?.id;
      const order = mockOrders.get(id);
      if (!order) return null;
      
      // Include items with product details if requested
      if (options?.include?.items) {
        return {
          ...order,
          items: Array.from(mockOrderItems.values())
            .filter(item => item.orderId === order.id)
            .map(item => ({
              ...item,
              product: mockProducts.get(item.productId) || undefined,
            })),
        };
      }
      
      return order;
    },

    create: async (options: any) => {
      const { data } = options;
      const id = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const order: Order = {
        id,
        userId: data.userId || 'guest',
        status: data.status || 'pending',
        total: data.total || 0,
        shippingAddress: data.shippingAddress || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockOrders.set(id, order);
      
      // Create order items if provided
      const items: OrderItem[] = [];
      if (data.items && Array.isArray(data.items.create)) {
        for (const itemData of data.items.create) {
          const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const item: OrderItem = {
            id: itemId,
            orderId: id,
            productId: itemData.productId,
            quantity: itemData.quantity,
            price: itemData.price,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockOrderItems.set(itemId, item);
          items.push(item);
        }
      }
      
      return { ...order, items };
    },

    update: async (options: any) => {
      const { where, data } = options;
      const id = where?.id;
      const order = mockOrders.get(id);
      if (!order) throw new Error(`Order ${id} not found`);
      
      const updated: Order = {
        ...order,
        ...data,
        updatedAt: new Date(),
      };
      mockOrders.set(id, updated);
      return updated;
    },

    delete: async (options: any) => {
      const { where } = options;
      const id = where?.id;
      const order = mockOrders.get(id);
      if (order) mockOrders.delete(id);
      return order || null;
    },

    count: async () => mockOrders.size,
  },

  orderItem: {
    findMany: async (options?: any) => {
      let results = Array.from(mockOrderItems.values());
      
      if (options?.where?.orderId) {
        results = results.filter(i => i.orderId === options.where.orderId);
      }
      
      return results;
    },

    findUnique: async (options: any) => {
      const id = options?.where?.id;
      return mockOrderItems.get(id) || null;
    },

    create: async (options: any) => {
      const { data } = options;
      const id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const item: OrderItem = {
        id,
        orderId: data.orderId,
        productId: data.productId,
        quantity: data.quantity,
        price: data.price,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockOrderItems.set(id, item);
      return item;
    },

    count: async () => mockOrderItems.size,
  },

  payment: {
    findMany: async (options?: any) => {
      let results = Array.from(mockPayments.values());
      
      if (options?.where?.orderId) {
        results = results.filter(p => p.orderId === options.where.orderId);
      }
      
      return results;
    },

    findUnique: async (options: any) => {
      const id = options?.where?.id;
      return mockPayments.get(id) || null;
    },

    create: async (options: any) => {
      const { data } = options;
      const id = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const payment: Payment = {
        id,
        orderId: data.orderId,
        stripePaymentIntentId: data.stripePaymentIntentId || '',
        amount: data.amount || 0,
        status: data.status || 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockPayments.set(id, payment);
      return payment;
    },

    update: async (options: any) => {
      const { where, data } = options;
      const id = where?.id;
      const payment = mockPayments.get(id);
      if (!payment) throw new Error(`Payment ${id} not found`);
      
      const updated: Payment = {
        ...payment,
        ...data,
        updatedAt: new Date(),
      };
      mockPayments.set(id, updated);
      return updated;
    },

    count: async () => mockPayments.size,
  },

  $disconnect: async () => {
    // No-op for mock
  },
} as any;
