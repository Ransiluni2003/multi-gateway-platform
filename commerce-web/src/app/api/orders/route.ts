import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getRequestId, withRequestId, logRequest, logResponse, logError } from '@/lib/request-logger';

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
  couponCode?: string;
  discountAmount?: number;
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logRequest(request);

  try {
    const body: CreateOrderInput = await request.json();
    const { email, firstName, lastName, address, city, state, zipCode, country, items, couponCode, discountAmount } = body;

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
    const finalTotal = total - (discountAmount || 0);
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
        subtotal: total,
        total: finalTotal,
        discountAmount: discountAmount || 0,
        couponCode: couponCode || null,
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

    // Increment coupon redemption count if used
    if (couponCode) {
      await prisma.coupon.update({
        where: { code: couponCode.toUpperCase() },
        data: { redemptionCount: { increment: 1 } },
      });
    }

    logger.info('Order created successfully', {
      requestId,
      orderId: order.id,
      email: order.email,
      total: order.total,
      itemCount: order.items.length,
      couponCode: couponCode || null,
    });

    logResponse(request, requestId, 200, startTime);

    return withRequestId(
      NextResponse.json({
        success: true,
        orderId: order.id,
        total: order.total,
        itemCount: order.items.length,
      }),
      requestId
    );
  } catch (error) {
    logError(request, requestId, error, 'Order creation error');
    return withRequestId(
      NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to create order' },
        { status: 500 }
      ),
      requestId
    );
  }
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logRequest(request);

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
        return withRequestId(
          NextResponse.json(
            { error: 'Order not found' },
            { status: 404 }
          ),
          requestId
        );
      }

      logResponse(request, requestId, 200, startTime);
      return withRequestId(
        NextResponse.json({ success: true, order }),
        requestId
      );
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

    logger.info('Orders retrieved successfully', {
      requestId,
      count: orders.length,
      email: email || 'all',
    });

    logResponse(request, requestId, 200, startTime);

    return withRequestId(
      NextResponse.json({ 
        success: true, 
        orders,
        count: orders.length 
      }),
      requestId
    );
  } catch (error) {
    logError(request, requestId, error, 'Order retrieval error');
    return withRequestId(
      NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to retrieve orders' },
        { status: 500 }
      ),
      requestId
    );
  }
}
