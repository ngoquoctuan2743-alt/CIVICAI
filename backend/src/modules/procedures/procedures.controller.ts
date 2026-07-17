import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ProcedureQueryDto } from './dto/procedure-query.dto';
import { ProceduresService } from './procedures.service';

/** API tra cứu thủ tục hành chính (công khai) */
@ApiTags('procedures')
@Controller('procedures')
export class ProceduresController {
  constructor(private readonly proceduresService: ProceduresService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Tra cứu thủ tục hành chính (search, lọc cơ quan, phân trang)' })
  findAll(@Query() query: ProcedureQueryDto) {
    return this.proceduresService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết thủ tục: cơ quan, giấy tờ, các bước, thời gian' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.proceduresService.findOne(id);
  }
}
