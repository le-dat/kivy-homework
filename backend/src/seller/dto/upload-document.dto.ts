import { ApiProperty } from '@nestjs/swagger';

/**
 * Used only for Swagger documentation of the multipart/form-data body.
 * The actual file is handled by FileInterceptor — not this class.
 */
export class UploadDocumentDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description:
      'Business verification document (PDF, PNG, JPG, JPEG — max 2MB)',
  })
  file: any;
}
