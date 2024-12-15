import { Injectable } from '@nestjs/common';
import { Report } from '../dto/Report';
import { table_report } from 'src/common/constant';
import { executeQuery, executeSave } from '../common/sqlApi';

@Injectable()
export class ReportDao {
  async save(report: Report) {
    const data = await this.queryByName(report.name);
    let sql: string;
    if (data) {
      sql = `UPDATE ${table_report} SET pages = ${report.pages}, published_date = ${report.published_date} WHERE name = '${report.name}'`;
    } else {
      sql = `INSERT INTO ${table_report} (name, pages, published_date) VALUES ('${report.name}', ${report.pages}, ${report.published_date})`;
    }
    console.log(sql);
    await executeSave(sql);
  }

  async update(report: Report) {
    const sql = `UPDATE ${table_report} SET name = '${report.name}', download_url = '${report.download_url}', example_image_url = '${report.example_image_url}', summary = '${report.summary}', ext = '${report.ext}' WHERE id = ${report.id}`;
    await executeSave(sql);
  }

  async queryByName(name: string) {
    const sql = `SELECT * FROM ${table_report} WHERE name = '${name}'`;
    console.log(sql);
    const data = await executeQuery(sql);
    // console.log('data: ', data);
    // 响应格式: {"totalCount": 2, "results":[]}
    if (!data || data.results.length === 0) {
      return null;
    }
    return data.results[0];
  }
}
