"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = exports.Product = exports.StorageType = void 0;
const common_1 = require("@nestjs/common");
var StorageType;
(function (StorageType) {
    StorageType["COLD"] = "COLD";
    StorageType["FROZEN"] = "FROZEN";
    StorageType["DRY"] = "DRY";
})(StorageType || (exports.StorageType = StorageType = {}));
class Product {
}
exports.Product = Product;
const mockProducts = [
    {
        id: '11111111-1111-1111-1111-111111111111',
        sku: 'MILK-DALAT-1L',
        name: 'Dalat Milk Fresh Milk 1L',
        category: 'Dairy',
        storageType: StorageType.COLD,
        minTemp: 0,
        maxTemp: 4,
        maxHumidity: 80,
        unit: 'box',
    },
    {
        id: '22222222-2222-2222-2222-222222222222',
        sku: 'BEEF-STEAK-US',
        name: 'US Beef Ribeye Steak 500g',
        category: 'Meat & Seafood',
        storageType: StorageType.FROZEN,
        minTemp: -25,
        maxTemp: -18,
        maxHumidity: 65,
        unit: 'pack',
    },
    {
        id: '33333333-3333-3333-3333-333333333333',
        sku: 'NOODLE-HAOHAO',
        name: 'Hao Hao Sour & Spicy Shrimp Noodles',
        category: 'Dry Goods',
        storageType: StorageType.DRY,
        minTemp: 15,
        maxTemp: 35,
        maxHumidity: 70,
        unit: 'box',
    },
    {
        id: '44444444-4444-4444-4444-444444444444',
        sku: 'TOMATO-DALAT',
        name: 'Dalat Organic Tomatoes 1kg',
        category: 'Produce',
        storageType: StorageType.COLD,
        minTemp: 4,
        maxTemp: 10,
        maxHumidity: 90,
        unit: 'pack',
    },
];
let ProductService = class ProductService {
    async findOneBySku(sku) {
        return mockProducts.find(p => p.sku === sku) || null;
    }
    async findOne(id) {
        return mockProducts.find(p => p.id === id) || null;
    }
};
exports.ProductService = ProductService;
exports.ProductService = ProductService = __decorate([
    (0, common_1.Injectable)()
], ProductService);
//# sourceMappingURL=product.service.js.map