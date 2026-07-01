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
exports.StorageSlotService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const storage_slot_entity_1 = require("./storage-slot.entity");
const shelf_service_1 = require("../shelf/shelf.service");
const zone_service_1 = require("../zone/zone.service");
let StorageSlotService = class StorageSlotService {
    constructor(slotRepository, shelfService, zoneService) {
        this.slotRepository = slotRepository;
        this.shelfService = shelfService;
        this.zoneService = zoneService;
    }
    async onModuleInit() {
        const shelves = await this.shelfService.findAll();
        for (const shelf of shelves) {
            const existingCount = await this.slotRepository.countBy({ shelfId: shelf.id });
            if (existingCount > 0)
                continue;
            for (let i = 1; i <= shelf.maxSlots; i++) {
                const slotCode = `${shelf.code}-${String(i).padStart(2, '0')}`;
                const row = Math.ceil(i / 5);
                const position = ((i - 1) % 5) + 1;
                await this.slotRepository.save(this.slotRepository.create({
                    code: slotCode,
                    shelfId: shelf.id,
                    status: 'EMPTY',
                    maxWeightKg: shelf.zone?.type === 'FROZEN' ? 300 : 500,
                    row,
                    position,
                    isPriority: position <= 2,
                }));
            }
            console.log(`Seeded ${shelf.maxSlots} slots for shelf ${shelf.code}`);
        }
    }
    async findAll(zoneCode) {
        if (zoneCode) {
            const zone = await this.zoneService.findByCode(zoneCode);
            const shelves = await this.shelfService.findByZone(zone.id);
            const shelfIds = shelves.map((s) => s.id);
            if (shelfIds.length === 0)
                return [];
            return this.slotRepository.createQueryBuilder('slot')
                .leftJoinAndSelect('slot.shelf', 'shelf')
                .where('slot.shelf_id IN (:...shelfIds)', { shelfIds })
                .orderBy('slot.code', 'ASC')
                .getMany();
        }
        return this.slotRepository.find({ relations: ['shelf'], order: { code: 'ASC' } });
    }
    async findOne(id) {
        const slot = await this.slotRepository.findOne({ where: { id }, relations: ['shelf'] });
        if (!slot)
            throw new common_1.NotFoundException(`StorageSlot with ID ${id} not found`);
        return slot;
    }
    async findEmpty(zoneCode) {
        const qb = this.slotRepository.createQueryBuilder('slot')
            .leftJoinAndSelect('slot.shelf', 'shelf')
            .leftJoinAndSelect('shelf.zone', 'zone')
            .where('slot.status = :status', { status: 'EMPTY' });
        if (zoneCode) {
            qb.andWhere('zone.code = :zoneCode', { zoneCode });
        }
        return qb.orderBy('slot.isPriority', 'DESC').addOrderBy('slot.code', 'ASC').getMany();
    }
    async assignLot(slotId, dto) {
        const slot = await this.findOne(slotId);
        if (slot.status !== 'EMPTY') {
            throw new common_1.BadRequestException(`Slot ${slot.code} is not empty (current status: ${slot.status})`);
        }
        slot.status = 'OCCUPIED';
        slot.lotId = dto.lotId;
        slot.lotCode = dto.lotCode;
        slot.productSku = dto.productSku;
        slot.currentWeightKg = dto.weightKg || 0;
        const updated = await this.slotRepository.save(slot);
        const shelf = await this.shelfService.findOne(slot.shelfId);
        shelf.currentSlotsUsed += 1;
        await this.shelfService.update(shelf.id, { currentSlotsUsed: shelf.currentSlotsUsed });
        return updated;
    }
    async releaseLot(slotId) {
        const slot = await this.findOne(slotId);
        if (slot.status === 'EMPTY') {
            throw new common_1.BadRequestException(`Slot ${slot.code} is already empty`);
        }
        const previousLot = slot.lotCode;
        slot.status = 'EMPTY';
        slot.lotId = null;
        slot.lotCode = null;
        slot.productSku = null;
        slot.currentWeightKg = 0;
        const updated = await this.slotRepository.save(slot);
        const shelf = await this.shelfService.findOne(slot.shelfId);
        shelf.currentSlotsUsed = Math.max(0, shelf.currentSlotsUsed - 1);
        await this.shelfService.update(shelf.id, { currentSlotsUsed: shelf.currentSlotsUsed });
        console.log(`Released lot ${previousLot} from slot ${slot.code}`);
        return updated;
    }
    async setMaintenance(slotId) {
        const slot = await this.findOne(slotId);
        slot.status = 'MAINTENANCE';
        return this.slotRepository.save(slot);
    }
    async suggestSlot(zoneCode, isPriority = false) {
        const qb = this.slotRepository.createQueryBuilder('slot')
            .leftJoinAndSelect('slot.shelf', 'shelf')
            .leftJoinAndSelect('shelf.zone', 'zone')
            .where('slot.status = :status', { status: 'EMPTY' })
            .andWhere('zone.code = :zoneCode', { zoneCode });
        if (isPriority) {
            qb.andWhere('slot.isPriority = true');
        }
        qb.orderBy('slot.isPriority', 'DESC').addOrderBy('slot.code', 'ASC').take(1);
        return qb.getOne();
    }
    async getSlotMap(zoneCode) {
        const zone = await this.zoneService.findByCode(zoneCode);
        const shelves = await this.shelfService.findByZone(zone.id);
        const map = [];
        for (const shelf of shelves) {
            const slots = await this.slotRepository.find({
                where: { shelfId: shelf.id },
                order: { row: 'ASC', position: 'ASC' },
            });
            map.push({
                shelfCode: shelf.code,
                shelfName: shelf.name,
                floor: shelf.floor,
                maxSlots: shelf.maxSlots,
                usedSlots: shelf.currentSlotsUsed,
                slots: slots.map((s) => ({
                    id: s.id,
                    code: s.code,
                    status: s.status,
                    lotCode: s.lotCode,
                    productSku: s.productSku,
                    row: s.row,
                    position: s.position,
                    isPriority: s.isPriority,
                })),
            });
        }
        return {
            zone: { id: zone.id, code: zone.code, name: zone.name, type: zone.type },
            shelves: map,
            summary: {
                totalSlots: map.reduce((sum, s) => sum + s.maxSlots, 0),
                usedSlots: map.reduce((sum, s) => sum + s.usedSlots, 0),
                emptySlots: map.reduce((sum, s) => sum + (s.maxSlots - s.usedSlots), 0),
            },
        };
    }
};
exports.StorageSlotService = StorageSlotService;
exports.StorageSlotService = StorageSlotService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(storage_slot_entity_1.StorageSlot)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        shelf_service_1.ShelfService,
        zone_service_1.ZoneService])
], StorageSlotService);
//# sourceMappingURL=storage-slot.service.js.map