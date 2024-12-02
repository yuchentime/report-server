import { Injectable } from '@nestjs/common';
import { Report } from '../dto/Report';
import { table_report } from 'src/common/constant';

@Injectable()
export class ReportDao {
  async save(report: Report) {
    // 将Report转写成一条insert语句
    // 执行insert语句
    let sql = "";
    if (report.id) {
      sql = `UPDATE ${table_report} SET name = '${report.name}', download_url = '${report.download_url}', summary = '${report.summary}', description = '${report.description}', ext_json = '${report.ext_json}' WHERE id = ${report.id}`;
    } else {
      sql = `INSERT INTO ${table_report} (name, download_url, summary , description, ext_json) VALUES ('${report.name}', '${report.download_url}', '${report.summary}', '${report.description}', '${report.ext_json}')`;
    }
    console.log('insertSql: ', sql);
    await this.executeSave(sql);
  }

  async query(report: Report) {
    let querySql = `SELECT * FROM ${table_report}`;
    if (report) {
      querySql += ` WHERE 1=1`;
      if (report.id) {
        querySql += ` AND id = ${report.id}`;
      }
      if (report.name) {
        querySql += ` AND name = '${report.name}'`;
      }
    }
    const data = await this.executeQuery(querySql);
    return data;
  }

  async executeSave(sql: string) {
    try {
        const response = await fetch(process.env.CLOUDFLARE_DATABASE_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain',
              Authorization: `Bearer ${process.env.CLOUDFLARE_SECRET_TOKEN}`,
            },
            body: sql,
          });
          if (response.ok) {
            console.log('Data saved successfully');
          } else {
            console.error('Error saving data:', response.statusText);
          }
    } catch (error) {
      console.error('Error saving data:', error?.message);
    }
  }

  async executeQuery(sql: string) {
    const queryUrl = `${process.env.CLOUDFLARE_DATABASE_URL}?query=${encodeURIComponent(sql)}`;
    const response = await fetch(queryUrl, {
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_SECRET_TOKEN}`,
      },
    });
    const data = await response.json();
    return data;
  }
}
