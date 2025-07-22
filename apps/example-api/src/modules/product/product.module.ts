import { Module } from '@rapidojs/core';
import { ProductController } from './product.controller.js';
import { ProductService } from './product.service.js';
import { UserModule } from '../user/user.module.js';

@Module({
  imports: [UserModule],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
