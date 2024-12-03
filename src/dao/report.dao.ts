import { Injectable } from '@nestjs/common';
import { Report } from '../dto/Report';
import { table_report } from 'src/common/constant';

@Injectable()
export class ReportDao {

  async insert(report: Report) {
    const data = await this.queryByName(report.name);
    if (data) {
      return;
    }
    const sql = `INSERT INTO ${table_report} (name, pages, published_date) VALUES ('${report.name}', ${report.pages}, ${report.published_date})`;
    console.log(sql);
    this.executeSave(sql);
  }

  async update(report: Report) {
    const sql = `UPDATE ${table_report} SET name = '${report.name}', download_url = '${report.download_url}', example_image_url = '${report.example_image_url}', summary = '${report.summary}', ext = '${report.ext}' WHERE id = ${report.id}`;
    await this.executeSave(sql);
  }

  async queryByName(name: string) {
    const sql = `SELECT * FROM ${table_report} WHERE name = '${name}'`;
    console.log(sql);
    const data = await this.executeQuery(sql);
    // 响应格式: {"totalCount": 2, "results":[]}
    if (!data || data.results.length === 0) {
      return null;
    }
    return data.results[0];
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
    if (!data || data.results.length === 0) {
      return null;
    }
    return data.results[0];
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
