import { UserService } from './user.service';
export declare class UserController {
    private userService;
    constructor(userService: UserService);
    findAll(): Promise<import("./user.entity").User[]>;
    create(body: any): Promise<import("./user.entity").User>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
