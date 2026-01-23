import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all products or single product by ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    if (id) {
      const product = await prisma.product.findUnique({
        where: { id },
      });
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      // Parse images JSON string back to array
      const productWithImages = {
        ...product,
        images: product.images ? JSON.parse(product.images) : [],
      };
      return NextResponse.json(productWithImages);
    }

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Parse images for all products
    const productsWithImages = products.map((p: any) => ({
      ...p,
      images: p.images ? JSON.parse(p.images) : [],
    }));

    return NextResponse.json({ products: productsWithImages });
  } catch (error) {
    console.error('GET /api/products error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST create new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, price, description, images, stock, status } = body;

    if (!name || !price) {
      return NextResponse.json(
        { error: 'Name and price are required' },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        price: parseFloat(price),
        description: description || '',
        images: JSON.stringify(images || []),
        stock: parseInt(stock) || 0,
        status: status || 'active',
      },
    });

    return NextResponse.json({
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/products error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

// PUT update product
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, price, description, images, stock, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(price && { price: parseFloat(price) }),
        ...(description !== undefined && { description }),
        ...(images && { images: JSON.stringify(images) }),
        ...(stock !== undefined && { stock: parseInt(stock) }),
        ...(status && { status }),
      },
    });

    return NextResponse.json({
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
    });
  } catch (error) {
    console.error('PUT /api/products error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE product
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/products error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
