import { Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe } from '@rapidojs/core';
import { ProductService } from './product.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ProductQueryDto } from './dto/product-query.dto.js';

@Controller('/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  getAllProducts(@Query() query: ProductQueryDto) {
    let products = this.productService.findAll();

    // Apply filters based on query parameters
    if (query.category) {
      products = this.productService.findByCategory(query.category);
    }

    if (query.inStock !== undefined) {
      products = products.filter(product => product.inStock === query.inStock);
    }

    return {
      success: true,
      data: products,
      message: 'Products retrieved successfully',
      filters: query,
    };
  }

  @Get('/in-stock')
  getInStockProducts() {
    return {
      success: true,
      data: this.productService.findInStock(),
      message: 'In-stock products retrieved successfully',
    };
  }

  @Get('/:id')
  async getProductById(@Param('id', ParseIntPipe) id: number) {
    const product = await this.productService.findById(id);
    
    if (!product) {
      return {
        success: false,
        error: 'Product not found',
        statusCode: 404,
      };
    }

    return {
      success: true,
      data: product,
      message: 'Product retrieved successfully',
    };
  }

  @Post()
  createProduct(@Body() createProductDto: CreateProductDto) {
    const newProduct = this.productService.create(createProductDto);
    
    return {
      success: true,
      data: newProduct,
      message: 'Product created successfully',
    };
  }

  @Put('/:id')
  updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: Partial<CreateProductDto>
  ) {
    const updatedProduct = this.productService.update(id, updateProductDto);
    
    if (!updatedProduct) {
      return {
        success: false,
        error: 'Product not found',
        statusCode: 404,
      };
    }

    return {
      success: true,
      data: updatedProduct,
      message: 'Product updated successfully',
    };
  }

  @Delete('/:id')
  deleteProduct(@Param('id', ParseIntPipe) id: number) {
    const deleted = this.productService.delete(id);
    
    if (!deleted) {
      return {
        success: false,
        error: 'Product not found',
        statusCode: 404,
      };
    }

    return {
      success: true,
      message: 'Product deleted successfully',
    };
  }
}
