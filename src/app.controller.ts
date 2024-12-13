import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/init')
  async intReport() {
    await this.appService.initReport();
    return { msg: 'ok' };
  }

  @Get('/summary')
  async summary(@Query('name') name: string) {
    console.log('summary==>', name);
    this.appService.summary(name);
    return { msg: 'ok' };
  }

  @Get('/img')
  async img() {
    this.appService.extractPdfImages();
    return { msg: 'ok' };
  }

  @Get('/coze')
  async report() {
    this.appService.importCoze();
    return { msg: 'ok' };
  }
}
