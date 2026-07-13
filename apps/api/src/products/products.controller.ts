import { Controller, Get, Param, Query, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
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

  @Get('pim/by-name/:name/documents')
  @ApiOperation({ summary: 'List PIM documents for an active Molydal product' })
  pimDocuments(@Param('name') name: string) {
    return this.productsService.findPimDocumentsByName(name);
  }

  @Get('pim/documents/:documentId/content')
  @ApiOperation({ summary: 'Securely proxy a PIM PDF for in-app viewing' })
  async pimDocumentContent(@Param('documentId') documentId: string, @Res() response: Response) {
    const file = await this.productsService.downloadPimDocument(documentId);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    response.setHeader('Cache-Control', 'private, max-age=3600');
    response.send(file.buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product details' })
  findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }
}
