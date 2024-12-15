import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/init')
  async intReport() {
    this.appService.initReport();
    return { msg: 'ok' };
  }

  @Get('/summary')
  async summary(@Query('name') name: string) {
    console.log('summary==>', name);
    this.appService.summary(name);
    return { msg: 'ok' };
  }

  @Get('/upload')
  async upload() {
    this.appService.extractPdfImages();
    return { msg: 'ok' };
  }

  @Get('/coze')
  async report() {
    this.appService.importCoze();
    return { msg: 'ok' };
  }

  @Put('/user/update-vip')
  async updateUser(
    @Body('email') email: string,
    @Query('isVip') isVip: number,
    @Query('days') days = 0,
  ) {
    if (!email) {
      return { msg: 'email is empty' };
    }
    if (isVip !== 1 && isVip !== 0) {
      return { msg: 'vip is not 1 or 0' };
    }
    await this.appService.updateUser(email, isVip, days);
    return { msg: 'ok' };
  }
}
