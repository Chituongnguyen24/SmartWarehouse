import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProductService } from './product.service';
import { S3StorageService } from '../storage/s3-storage.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductController {
  constructor(
    private productService: ProductService,
    private s3StorageService: S3StorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  findAll(
    @Query('keyword') keyword?: string,
    @Query('category') category?: string,
    @Query('isFlashSale') isFlashSale?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 20;
    return this.productService.findAll(keyword, category, isFlashSale, pageNum, limitNum);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get list of unique product categories' })
  getCategories() {
    return this.productService.getCategories();
  }

  @Get('next-sku')
  @ApiOperation({ summary: 'Get next auto-generated SKU (Format: CT-MMYYxxxx)' })
  async getNextSku() {
    const sku = await this.productService.generateNextSku();
    return { sku };
  }

  @Get('sku/:sku')
  @ApiOperation({ summary: 'Get product by SKU' })
  findBySku(@Param('sku') sku: string) {
    return this.productService.findOneBySku(sku);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Post('upload-image')
  @Roles(UserRole.ADMIN, UserRole.SALES_STAFF)
  @ApiOperation({ summary: 'Tải ảnh sản phẩm lên Amazon S3' })
  uploadImage(@Body() body: { imageBase64: string; sku?: string; mimeType?: string }) {
    return this.s3StorageService.uploadProductImage(
      body.imageBase64,
      body.sku || 'PRODUCT',
      body.mimeType || 'image/jpeg',
    );
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SALES_STAFF)
  @ApiOperation({ summary: 'Create new product SKU' })
  create(@Body() body: any) {
    return this.productService.create(body);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.SALES_STAFF, UserRole.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Update product properties' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.productService.update(id, body);
  }

  @Post('batch-flash-sale')
  @Roles(UserRole.ADMIN, UserRole.SALES_STAFF, UserRole.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Batch activate or update flash sale for multiple products' })
  batchFlashSale(@Body() body: { items: Array<{ productId: string; price: number; originalPrice: number; discountPercent: number; isFlashSale: boolean }> }) {
    return this.productService.batchUpdateFlashSale(body.items || []);
  }

  @Post('sync-stock')
  @ApiOperation({ summary: 'Sync product stock from inventory lots' })
  syncStock(@Body() body: { sku?: string; productId?: string; stock?: number; isExpired?: boolean }) {
    return this.productService.syncStock(body.sku || body.productId || '', body.stock, body.isExpired);
  }

  @Post('sync-all-stock')
  @ApiOperation({ summary: 'Sync all products stock from inventory lots' })
  syncAllStock() {
    return this.productService.syncAllStock();
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SALES_STAFF)
  @ApiOperation({ summary: 'Delete product SKU (Admin & Saler)' })
  delete(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}
