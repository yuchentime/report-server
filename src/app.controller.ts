import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get("/summary")
  async summary() {
    return await this.appService.summary();
  }

  @Get("/img")
  async img() {
    await this.appService.extractPdfImages();
    return { msg: "ok" };
  }
}
