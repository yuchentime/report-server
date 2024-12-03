import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get("/summary")
  async summary() {
    this.appService.summary();
    return { msg: "ok" };
  }

  @Get("/img")
  async img() {
    this.appService.extractPdfImages();
    return { msg: "ok" };
  }

  @Post("/insert")
  async insertReport(@Body("name") name: string, @Body("pageCount") pageCount: number, @Body("publishedDate") publishedDate: number) {
    await this.appService.insertReport(name, pageCount, publishedDate);
    return { msg: "ok" };
  }
}
