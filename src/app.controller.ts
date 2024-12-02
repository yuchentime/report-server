import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import * as pdfUtil from './common/pdfUtil';
import * as path from 'path';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("/summary")
  async summary() {
     return await this.appService.summary();
  }

  @Get("/img")
  async img() {
    await pdfUtil.convertPdfPageToImage(path.join(process.env.LOCAL_FIELS_PATH, "Enhanced Retrieval-Augmented Reasoning with Open-Source Large Language Models.pdf"), 1, path.join(process.env.LOCAL_FIELS_PATH, "img.png"));
  }
}
