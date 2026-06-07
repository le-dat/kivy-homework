import { Controller, Get } from '@nestjs/common';
import { ProductService } from './product.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PublicProductDto } from './dto/product-response.dto';

@ApiTags('Public Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'Get all live marketplace products' })
  @ApiResponse({
    status: 200,
    description: 'Array of publicly visible products from verified sellers',
    type: [PublicProductDto],
  })
  async getProducts() {
    return this.productService.findLiveProducts();
  }
}
