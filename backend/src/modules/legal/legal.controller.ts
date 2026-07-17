import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { LegalQueryDto } from './dto/legal-query.dto';
import { LegalService } from './legal.service';

/** API tra cứu văn bản pháp luật (công khai) */
@ApiTags('legal')
@Controller('legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Public()
  @Get('documents')
  @ApiOperation({ summary: 'Tra cứu văn bản pháp luật (search, lọc, phân trang)' })
  findAll(@Query() query: LegalQueryDto) {
    return this.legalService.findAll(query);
  }

  @Public()
  @Get('documents/:id')
  @ApiOperation({ summary: 'Chi tiết một văn bản pháp luật' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.legalService.findOne(id);
  }
}
