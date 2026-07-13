import { Zone } from '../zone/zone.entity';
export declare class Warehouse {
    id: string;
    code: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    isActive: boolean;
    zones: Zone[];
    createdAt: Date;
    updatedAt: Date;
}
