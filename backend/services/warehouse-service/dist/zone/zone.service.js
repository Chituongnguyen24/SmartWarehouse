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
exports.ZoneService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const zone_entity_1 = require("./zone.entity");
let ZoneService = class ZoneService {
    constructor(zoneRepository) {
        this.zoneRepository = zoneRepository;
    }
    async onModuleInit() {
        const defaultZones = [
            {
                code: 'COLD',
                name: 'Kho lạnh',
                type: 'COLD',
                description: 'Rau củ, sữa, thực phẩm tươi sống cần duy trì nhiệt độ thấp (0-4°C)',
                minTemp: 0,
                maxTemp: 4,
                minHumidity: 60,
                maxHumidity: 80,
                maxCapacity: 1200,
                currentOccupancy: 864,
            },
            {
                code: 'FROZEN',
                name: 'Kho đông lạnh',
                type: 'FROZEN',
                description: 'Thịt, cá, hải sản đông lạnh và các sản phẩm yêu cầu nhiệt độ âm (-22 đến -16°C)',
                minTemp: -22,
                maxTemp: -16,
                minHumidity: 40,
                maxHumidity: 65,
                maxCapacity: 800,
                currentOccupancy: 712,
            },
            {
                code: 'DRY',
                name: 'Kho khô',
                type: 'DRY',
                description: 'Đồ hộp, mì gói, nước uống, gia vị và các mặt hàng không yêu cầu điều kiện bảo quản đặc biệt (18-28°C)',
                minTemp: 18,
                maxTemp: 28,
                minHumidity: 30,
                maxHumidity: 60,
                maxCapacity: 2400,
                currentOccupancy: 1320,
            },
        ];
        for (const zoneData of defaultZones) {
            const exists = await this.zoneRepository.findOneBy({ code: zoneData.code });
            if (!exists) {
                await this.zoneRepository.save(this.zoneRepository.create(zoneData));
                console.log(`Seeded zone: ${zoneData.name} (${zoneData.code})`);
            }
        }
    }
    async findAll() {
        return this.zoneRepository.find({ relations: ['shelves'] });
    }
    async findOne(id) {
        const zone = await this.zoneRepository.findOne({ where: { id }, relations: ['shelves'] });
        if (!zone)
            throw new common_1.NotFoundException(`Zone with ID ${id} not found`);
        return zone;
    }
    async findByCode(code) {
        const zone = await this.zoneRepository.findOne({ where: { code }, relations: ['shelves'] });
        if (!zone)
            throw new common_1.NotFoundException(`Zone with code ${code} not found`);
        return zone;
    }
    async create(dto) {
        return this.zoneRepository.save(this.zoneRepository.create(dto));
    }
    async update(id, dto) {
        await this.zoneRepository.update(id, dto);
        return this.findOne(id);
    }
    async updateOccupancy(id, delta) {
        const zone = await this.findOne(id);
        zone.currentOccupancy = Math.max(0, zone.currentOccupancy + delta);
        return this.zoneRepository.save(zone);
    }
    async getCapacitySummary() {
        const zones = await this.findAll();
        return zones.map((z) => ({
            id: z.id,
            code: z.code,
            name: z.name,
            type: z.type,
            maxCapacity: z.maxCapacity,
            currentOccupancy: z.currentOccupancy,
            usagePercent: Math.round((z.currentOccupancy / z.maxCapacity) * 100),
            availableSlots: z.maxCapacity - z.currentOccupancy,
            tempRange: `${z.minTemp}°C ~ ${z.maxTemp}°C`,
            humidityRange: `${z.minHumidity}% ~ ${z.maxHumidity}%`,
        }));
    }
};
exports.ZoneService = ZoneService;
exports.ZoneService = ZoneService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(zone_entity_1.Zone)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ZoneService);
//# sourceMappingURL=zone.service.js.map