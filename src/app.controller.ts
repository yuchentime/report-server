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
    await pdfUtil.convertPDFPagesToImages(path.join(process.env.DOWNLOAD_FIELS_PATH, "【安永】智启新质生产力之二：生成式人工智能（AIGC）在医药零售的潜在应用【发现报告 fxbaogao.com】.pdf")
    , 2, 2, process.env.DOWNLOAD_FIELS_PATH);
  }
}
