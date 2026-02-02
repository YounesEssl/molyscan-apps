import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProductsService } from './products.service';
import { SearchProductDto } from './dto/search-product.dto';

@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Find product by barcode and return Molydal match' })
  findByBarcode(@Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(barcode);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search competitor products' })
  search(@Query() dto: SearchProductDto) {
    return this.productsService.search(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product details' })
  findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }
}
