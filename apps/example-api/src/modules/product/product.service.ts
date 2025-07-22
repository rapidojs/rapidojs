import { Injectable } from '@rapidojs/core';
import { UserService } from '../user/user.service.js';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  createdAt: Date;
  createdBy: number; // User ID
}

@Injectable()
export class ProductService {
  constructor(private readonly userService: UserService) {}
  private products: Product[] = [
    {
      id: 1,
      name: 'Laptop Pro',
      description: 'High-performance laptop for professionals',
      price: 1299.99,
      category: 'Electronics',
      inStock: true,
      createdAt: new Date('2024-01-01'),
      createdBy: 1,
    },
    {
      id: 2,
      name: 'Wireless Headphones',
      description: 'Premium noise-canceling headphones',
      price: 299.99,
      category: 'Electronics',
      inStock: true,
      createdAt: new Date('2024-01-02'),
      createdBy: 2,
    },
    {
      id: 3,
      name: 'Coffee Maker',
      description: 'Automatic coffee brewing machine',
      price: 89.99,
      category: 'Home & Kitchen',
      inStock: false,
      createdAt: new Date('2024-01-03'),
      createdBy: 1,
    },
  ];

  findAll(): Product[] {
    return this.products;
  }

  async findById(id: number): Promise<any> {
    const product = this.products.find(product => product.id === id);
    if (!product) {
      return undefined;
    }

    // Cross-module call to UserService
    const user = this.userService.findById(product.createdBy);

    return {
      ...product,
      createdBy: user || { id: product.createdBy, name: 'Unknown User' },
    };
  }

  findByCategory(category: string): Product[] {
    return this.products.filter(product => 
      product.category.toLowerCase().includes(category.toLowerCase())
    );
  }

  findInStock(): Product[] {
    return this.products.filter(product => product.inStock);
  }

  create(productData: Omit<Product, 'id' | 'createdAt'>): Product {
    const newProduct: Product = {
      id: Math.max(...this.products.map(p => p.id), 0) + 1,
      ...productData,
      createdAt: new Date(),
    };
    this.products.push(newProduct);
    return newProduct;
  }

  update(id: number, productData: Partial<Omit<Product, 'id' | 'createdAt' | 'createdBy'>>): Product | null {
    const productIndex = this.products.findIndex(product => product.id === id);
    if (productIndex === -1) {
      return null;
    }

    this.products[productIndex] = {
      ...this.products[productIndex],
      ...productData,
    };

    return this.products[productIndex];
  }

  delete(id: number): boolean {
    const productIndex = this.products.findIndex(product => product.id === id);
    if (productIndex === -1) {
      return false;
    }

    this.products.splice(productIndex, 1);
    return true;
  }
}
