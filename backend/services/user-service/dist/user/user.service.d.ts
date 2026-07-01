import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './user.entity';
export declare class UserService implements OnModuleInit {
    private userRepository;
    constructor(userRepository: Repository<User>);
    onModuleInit(): Promise<void>;
    findOneByEmail(email: string): Promise<User | null>;
    findOneById(id: string): Promise<User | null>;
    create(userDto: Partial<User>): Promise<User>;
    findAll(): Promise<User[]>;
    remove(id: string): Promise<void>;
}
