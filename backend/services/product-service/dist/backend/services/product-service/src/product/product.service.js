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
let ProductService = class ProductService {
    constructor(productRepository) {
        this.productRepository = productRepository;
    }
    async onModuleInit() {
        const seedProducts = [
            {
                sku: 'MILK-DALAT-1L',
                name: 'Dalat Milk Fresh Milk 1L',
                category: 'Dairy',
                storageType: product_entity_1.StorageType.COLD,
                minTemp: 0,
                maxTemp: 4,
                maxHumidity: 80,
                unit: 'box',
            },
            {
                sku: 'BEEF-STEAK-US',
                name: 'US Beef Ribeye Steak 500g',
                category: 'Meat & Seafood',
                storageType: product_entity_1.StorageType.FROZEN,
                minTemp: -25,
                maxTemp: -18,
                maxHumidity: 65,
                unit: 'pack',
            },
            {
                sku: 'NOODLE-HAOHAO',
                name: 'Hao Hao Sour & Spicy Shrimp Noodles',
                category: 'Dry Goods',
                storageType: product_entity_1.StorageType.DRY,
                minTemp: 15,
                maxTemp: 35,
                maxHumidity: 70,
                unit: 'box',
            },
            {
                sku: 'TOMATO-DALAT',
                name: 'Dalat Organic Tomatoes 1kg',
                category: 'Produce',
                storageType: product_entity_1.StorageType.COLD,
                minTemp: 4,
                maxTemp: 10,
                maxHumidity: 90,
                unit: 'pack',
            },
        ];
        for (const item of seedProducts) {
            const exists = await this.productRepository.findOneBy({ sku: item.sku });
            if (!exists) {
                const prod = this.productRepository.create(item);
                await this.productRepository.save(prod);
                console.log(`Seeded product SKU: ${item.sku}`);
            }
        }
    }
    async findAll() {
        return this.productRepository.find();
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