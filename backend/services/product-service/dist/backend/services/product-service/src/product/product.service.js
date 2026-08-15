"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const product_entity_1 = require("./product.entity");
const product_seed_data_1 = require("./product.seed-data");
let ProductService = class ProductService {
    constructor(productRepository) {
        this.productRepository = productRepository;
    }
    async onModuleInit() {
        try {
            await this.productRepository.createQueryBuilder()
                .delete()
                .where("category IN (:...cats)", { cats: ['Dairy', 'Meat & Seafood', 'Dry Goods', 'Produce'] })
                .execute();
        }
        catch (e) {
            console.log('No legacy categories to delete');
        }
        for (const item of product_seed_data_1.LARGE_SEED_PRODUCTS) {
            const exists = await this.productRepository.findOneBy({ sku: item.sku });
            if (exists) {
                await this.productRepository.save({ ...exists, ...item });
            }
            else {
                const prod = this.productRepository.create(item);
                await this.productRepository.save(prod);
                console.log(`Seeded product SKU: ${item.sku}`);
            }
        }
    }
    async findAll(keyword, category, isFlashSale, page = 1, limit = 20) {
        const queryBuilder = this.productRepository.createQueryBuilder('product');
        if (keyword) {
            queryBuilder.andWhere('product.name ILIKE :keyword', { keyword: `%${keyword}%` });
        }
        if (category) {
            queryBuilder.andWhere('product.category = :category', { category });
        }
        if (isFlashSale !== undefined) {
            queryBuilder.andWhere('product.isFlashSale = :isFlashSale', { isFlashSale });
        }
        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);
        queryBuilder.orderBy('product.soldCount', 'DESC');
        const [items, total] = await queryBuilder.getManyAndCount();
        return {
            items,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / limit)
        };
    }
    async findOne(id) {
        return this.productRepository.findOneBy({ id });
    }
    async findOneBySku(sku) {
        return this.productRepository.findOneBy({ sku });
    }
    async create(prod) {
        const newProd = this.productRepository.create(prod);
        return this.productRepository.save(newProd);
    }
    async update(id, prod) {
        await this.productRepository.update(id, prod);
        return this.findOne(id);
    }
    async remove(id) {
        await this.productRepository.delete(id);
    }
};
exports.ProductService = ProductService;
exports.ProductService = ProductService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ProductService);
//# sourceMappingURL=product.service.js.map