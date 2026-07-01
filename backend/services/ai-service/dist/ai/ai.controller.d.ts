import { AiService } from './ai.service';
export declare class AiController {
    private aiService;
    constructor(aiService: AiService);
    predictSpoilage(body: any): Promise<any[]>;
    getForecast(sku: string): Promise<any>;
}
