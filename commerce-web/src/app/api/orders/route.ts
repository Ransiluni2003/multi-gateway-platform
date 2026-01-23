import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface CreateOrderInput {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderInput = await request.json();
    const { email, firstName, lastName, address, city, state, zipCode, country, items } = body;

    // Validate required fields
    if (!email || !firstName || !lastName || !address || !city || !state || !zipCode || !country || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch products and calculate total
    let total = 0;
    const orderItems: Array<{
      productId: string;
      quantity: number;
      price: number;
    }> = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.productId}` },
          { status: 404 }
        );
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}` },
          { status: 400 }
        );
      }

      const itemTotal = product.price * item.quantity;
      total += itemTotal;

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
      });
    }

    // Create order with items
    const order = await prisma.order.create({
      data: {
        email,
        firstName,
        lastName,
        address,
        city,
        state,
        zipCode,
        country,
        total,
        status: 'pending',
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      total: order.total,
      itemCount: order.items.length,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create order' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('id');
    const email = searchParams.get('email');

    // Get single order by ID
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          payment: true,
        },
      });

      if (!order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, order });
    }

    // Get all orders (optionally filtered by email)
    const where = email ? { email } : {};
    
    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payment: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ 
      success: true, 
      orders,
      count: orders.length 
    });
  } catch (error) {
    console.error('Order retrieval error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve orders' },
      { status: 500 }
    );
  }
}
