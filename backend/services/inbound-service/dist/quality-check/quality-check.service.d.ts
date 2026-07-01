import { Repository } from 'typeorm';
import { QualityCheck } from './quality-check.entity';
export declare class QualityCheckService {
    private qcRepository;
    constructor(qcRepository: Repository<QualityCheck>);
    create(dto: Partial<QualityCheck>): Promise<QualityCheck>;
    findByOrder(orderId: string): Promise<QualityCheck[]>;
    findOne(id: string): Promise<QualityCheck>;
}
