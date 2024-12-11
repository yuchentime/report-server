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
    await this.executeSave(sql);
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

  async executeSave(sql: string) {
    try {
      const response = await fetch(process.env.CLOUDFLARE_DATABASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.CLOUDFLARE_SECRET_TOKEN}`,
        },
        body: JSON.stringify({ sql }),
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
    let response;
    try {
      response = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_SECRET_TOKEN}`,
        },
      });
    } catch (error) {
      console.error('查询异常: ', sql);
      return {
        totalCount: 0,
        results: [],
      };
    }
    if (!response.ok) {
      console.error('查询异常: ', sql);
      return {
        totalCount: 0,
        results: [],
      };
    }
    return await response.json();
  }
}
