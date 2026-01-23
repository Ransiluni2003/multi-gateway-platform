export type Product = {
  id: string;
  title: string;
  price: number;
  currency?: string;
  description?: string;
  image?: string;
};

export const products: Product[] = [
  {
    id: "prod_1",
    title: "Blue T-Shirt",
    price: 1999,
    currency: "USD",
    description: "Comfortable cotton t-shirt",
    image: "/images/blue-shirt.jpg",
  },
  {
    id: "prod_2",
    title: "Running Shoes",
    price: 7999,
    currency: "USD",
    description: "Lightweight running shoes",
    image: "/images/shoes.jpg",
  },
  {
    id: "prod_3",
    title: "Coffee Mug",
    price: 1299,
    currency: "USD",
    description: "12oz ceramic mug",
    image: "/images/mug.jpg",
  },
];

export default products;
