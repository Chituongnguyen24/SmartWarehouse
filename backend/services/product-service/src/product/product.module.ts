import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { S3StorageService } from '../storage/s3-storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  providers: [ProductService, S3StorageService],
  controllers: [ProductController],
  exports: [ProductService, S3StorageService],
})
export class ProductModule {}
