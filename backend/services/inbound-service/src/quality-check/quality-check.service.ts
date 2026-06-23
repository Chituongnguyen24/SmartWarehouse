import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QualityCheck } from './quality-check.entity';

@Injectable()
export class QualityCheckService {
  constructor(
    @InjectRepository(QualityCheck)
    private qcRepository: Repository<QualityCheck>,
  ) {}

  async create(dto: Partial<QualityCheck>): Promise<QualityCheck> {
    // Determine overall result
    const passed = dto.tempAcceptable !== false
      && dto.visualCheckPassed !== false
      && dto.packagingIntact !== false
      && dto.expiryValid !== false;

    const result = passed ? 'PASSED' : 'FAILED';

    return this.qcRepository.save(this.qcRepository.create({
      ...dto,
      result,
    }));
  }

  async findByOrder(orderId: string): Promise<QualityCheck[]> {
    return this.qcRepository.find({
      where: { inboundOrderId: orderId },
      order: { checkedAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<QualityCheck> {
    const qc = await this.qcRepository.findOneBy({ id });
    if (!qc) throw new NotFoundException(`QualityCheck ${id} not found`);
    return qc;
  }
}
