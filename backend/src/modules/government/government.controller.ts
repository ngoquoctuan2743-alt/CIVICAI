import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { AgencyQueryDto } from './dto/agency-query.dto';
import { GovernmentService } from './government.service';

/** API tra cứu cơ quan nhà nước (công khai) */
@ApiTags('government')
@Controller('government')
export class GovernmentController {
  constructor(private readonly governmentService: GovernmentService) {}

  @Public()
  @Get('agencies')
  @ApiOperation({ summary: 'Tra cứu cơ quan nhà nước (search, lọc cấp, phân trang)' })
  findAll(@Query() query: AgencyQueryDto) {
    return this.governmentService.findAll(query);
  }

  @Public()
  @Get('agencies/:id')
  @ApiOperation({ summary: 'Chi tiết một cơ quan' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.governmentService.findOne(id);
  }
}
