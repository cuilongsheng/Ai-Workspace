import { Controller, Get } from '@nestjs/common';
import { EmbeddingsService } from './embeddings.service';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller('embeddings')
@ApiExcludeController()
export class EmbeddingsController {
  constructor(private readonly embeddingsService: EmbeddingsService) {}

  @Get('test')
  async test() {
    const result =
      await this.embeddingsService.embed('计算机专业最低录取分数是多少？');

    return {
      model: result.model,
      dimensions: result.dimensions,
      vectorLength: result.vector.length,
      preview: result.vector.slice(0, 5),
    };
  }
}
