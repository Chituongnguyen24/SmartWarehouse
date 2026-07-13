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
exports.WarehouseService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const warehouse_entity_1 = require("./warehouse.entity");
let WarehouseService = class WarehouseService {
    constructor(warehouseRepository) {
        this.warehouseRepository = warehouseRepository;
    }
    async onModuleInit() {
        const defaultWarehouses = [
            {
                code: 'WH-001',
                name: 'Kho Hàng Quận 12 (HCM North)',
                address: '12 Tô Ký, Tân Chánh Hiệp, Quận 12, TP. Hồ Chí Minh',
                latitude: 10.8671,
                longitude: 106.6713,
                isActive: true,
            },
            {
                code: 'WH-002',
                name: 'Kho Hàng Thủ Đức (HCM East)',
                address: '1 Võ Văn Ngân, Linh Chiểu, Thủ Đức, TP. Hồ Chí Minh',
                latitude: 10.8494,
                longitude: 106.7725,
                isActive: true,
            },
            {
                code: 'WH-003',
                name: 'Kho Hàng Bình Chánh (HCM West)',
                address: 'Tỉnh lộ 10, Tân Tạo, Bình Chánh, TP. Hồ Chí Minh',
                latitude: 10.6868,
                longitude: 106.5932,
                isActive: true,
            },
            {
                code: 'WH-004',
                name: 'Kho Hàng Quận 7 (HCM South)',
                address: '1025 Nguyễn Văn Linh, Tân Phong, Quận 7, TP. Hồ Chí Minh',
                latitude: 10.7324,
                longitude: 106.7214,
                isActive: true,
            },
        ];
        for (const wh of defaultWarehouses) {
            const exists = await this.warehouseRepository.findOneBy({ code: wh.code });
            if (!exists) {
                await this.warehouseRepository.save(this.warehouseRepository.create(wh));
                console.log(`[WAREHOUSE SERVICE] Seeded warehouse: ${wh.name} (${wh.code})`);
            }
        }
    }
    async findAll() {
        return this.warehouseRepository.find({ relations: ['zones'] });
    }
    async findOne(id) {
        const wh = await this.warehouseRepository.findOne({ where: { id }, relations: ['zones'] });
        if (!wh)
            throw new common_1.NotFoundException(`Warehouse with ID ${id} not found`);
        return wh;
    }
    async findByCode(code) {
        const wh = await this.warehouseRepository.findOne({ where: { code }, relations: ['zones'] });
        if (!wh)
            throw new common_1.NotFoundException(`Warehouse with code ${code} not found`);
        return wh;
    }
    async create(dto) {
        return this.warehouseRepository.save(this.warehouseRepository.create(dto));
    }
    async update(id, dto) {
        await this.warehouseRepository.update(id, dto);
        return this.findOne(id);
    }
    async remove(id) {
        const wh = await this.findOne(id);
        await this.warehouseRepository.remove(wh);
    }
};
exports.WarehouseService = WarehouseService;
exports.WarehouseService = WarehouseService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(warehouse_entity_1.Warehouse)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], WarehouseService);
//# sourceMappingURL=warehouse.service.js.map