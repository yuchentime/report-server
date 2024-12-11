import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/summary')
  async summary() {
    this.appService.summary();
    return { msg: 'ok' };
  }

  @Get('/img')
  async img() {
    this.appService.extractPdfImages();
    return { msg: 'ok' };
  }

  @Post('/init')
  async intReport() {
    await this.appService.initReport();
    return { msg: 'ok' };
  }

}
