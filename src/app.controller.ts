import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("/execute")
  async execute() {
     return await this.appService.scanFiles();
  }
}
