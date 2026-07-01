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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./user.entity");
const bcrypt = require("bcrypt");
let UserService = class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async onModuleInit() {
        const emailList = [
            { email: 'admin@sfwms.vn', name: 'Nguyễn Chi Tường', role: user_entity_1.UserRole.ADMIN },
            { email: 'manager@sfwms.vn', name: 'Trần Văn Bình', role: user_entity_1.UserRole.WAREHOUSE_MANAGER },
            { email: 'staff@sfwms.vn', name: 'Lê Thị Hoa', role: user_entity_1.UserRole.WAREHOUSE_STAFF },
            { email: 'sales@sfwms.vn', name: 'Phạm Minh Đức', role: user_entity_1.UserRole.SALES_STAFF },
            { email: 'driver@sfwms.vn', name: 'Võ Thanh Tùng', role: user_entity_1.UserRole.DRIVER },
        ];
        for (const item of emailList) {
            const exists = await this.userRepository.findOneBy({ email: item.email });
            if (!exists) {
                const passwordHash = await bcrypt.hash('password123', 10);
                const newUser = this.userRepository.create({
                    email: item.email,
                    name: item.name,
                    passwordHash,
                    role: item.role,
                });
                await this.userRepository.save(newUser);
                console.log(`Seeded user: ${item.email} with password: password123`);
            }
        }
    }
    async findOneByEmail(email) {
        return this.userRepository.findOneBy({ email });
    }
    async findOneById(id) {
        return this.userRepository.findOneBy({ id });
    }
    async create(userDto) {
        const passwordHash = await bcrypt.hash(userDto.passwordHash || 'password123', 10);
        const user = this.userRepository.create({
            ...userDto,
            passwordHash,
        });
        return this.userRepository.save(user);
    }
    async findAll() {
        return this.userRepository.find({
            select: ['id', 'name', 'email', 'role', 'createdAt'],
        });
    }
    async remove(id) {
        await this.userRepository.delete(id);
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UserService);
//# sourceMappingURL=user.service.js.map