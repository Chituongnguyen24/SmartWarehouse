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
exports.ShelfService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const shelf_entity_1 = require("./shelf.entity");
const zone_service_1 = require("../zone/zone.service");
let ShelfService = class ShelfService {
    constructor(shelfRepository, zoneService) {
        this.shelfRepository = shelfRepository;
        this.zoneService = zoneService;
    }
    async onModuleInit() {
        const zones = await this.zoneService.findAll();
        const shelfSeeds = {
            COLD: [
                { code: 'CL-A', name: 'Kệ A - Kho lạnh', maxSlots: 20, floor: 1 },
                { code: 'CL-B', name: 'Kệ B - Kho lạnh', maxSlots: 20, floor: 1 },
                { code: 'CL-C', name: 'Kệ C - Kho lạnh', maxSlots: 20, floor: 2 },
            ],
            FROZEN: [
                { code: 'FR-A', name: 'Kệ A - Kho đông', maxSlots: 16, floor: 1 },
                { code: 'FR-B', name: 'Kệ B - Kho đông', maxSlots: 16, floor: 1 },
            ],
            DRY: [
                { code: 'DR-A', name: 'Kệ A - Kho khô', maxSlots: 30, floor: 1 },
                { code: 'DR-B', name: 'Kệ B - Kho khô', maxSlots: 30, floor: 1 },
                { code: 'DR-C', name: 'Kệ C - Kho khô', maxSlots: 20, floor: 2 },
            ],
        };
        for (const zone of zones) {
            const zoneType = zone.code.includes('_') ? zone.code.split('_')[1] : zone.code;
            const seeds = shelfSeeds[zoneType];
            if (!seeds)
                continue;
            const prefix = zone.code.includes('_') ? zone.code.split('_')[0] : '';
            for (const seed of seeds) {
                const uniqueShelfCode = prefix ? `${prefix}_${seed.code}` : seed.code;
                const exists = await this.shelfRepository.findOneBy({ code: uniqueShelfCode });
                if (!exists) {
                    await this.shelfRepository.save(this.shelfRepository.create({
                        ...seed,
                        code: uniqueShelfCode,
                        zoneId: zone.id,
                    }));
                    console.log(`[SHELF SERVICE] Seeded shelf: ${uniqueShelfCode} in zone ${zone.code}`);
                }
            }
        }
    }
    async findAll() {
        return this.shelfRepository.find({ relations: ['zone', 'slots'] });
    }
    async findByZone(zoneId) {
        return this.shelfRepository.find({ where: { zoneId }, relations: ['slots'] });
    }
    async findOne(id) {
        const shelf = await this.shelfRepository.findOne({ where: { id }, relations: ['zone', 'slots'] });
        if (!shelf)
            throw new common_1.NotFoundException(`Shelf with ID ${id} not found`);
        return shelf;
    }
    async create(dto) {
        return this.shelfRepository.save(this.shelfRepository.create(dto));
    }
    async update(id, dto) {
        await this.shelfRepository.update(id, dto);
        return this.findOne(id);
    }
};
exports.ShelfService = ShelfService;
exports.ShelfService = ShelfService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(shelf_entity_1.Shelf)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        zone_service_1.ZoneService])
], ShelfService);
//# sourceMappingURL=shelf.service.js.map