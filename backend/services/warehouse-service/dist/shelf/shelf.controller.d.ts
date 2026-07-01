import { ShelfService } from './shelf.service';
export declare class ShelfController {
    private shelfService;
    constructor(shelfService: ShelfService);
    findAll(): Promise<import("./shelf.entity").Shelf[]>;
    findByZone(zoneId: string): Promise<import("./shelf.entity").Shelf[]>;
    findOne(id: string): Promise<import("./shelf.entity").Shelf>;
    create(body: any): Promise<import("./shelf.entity").Shelf>;
    update(id: string, body: any): Promise<import("./shelf.entity").Shelf>;
}
