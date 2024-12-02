import { Injectable } from '@nestjs/common';
import { ZhipuAI } from 'zhipuai-sdk-nodejs-v4';
import * as path from 'path';
import * as fs from 'fs';
import { gist_system_prompt } from './common/constant';
import { ReportDao } from './dao/report.dao';
import { Report } from './dto/Report';

@Injectable()
export class AppService {
  constructor(private readonly reportDao: ReportDao) {}

  async scanFiles() {
    const directory = process.env.LOCAL_FIELS_PATH;
    const fileFullPaths = await this.scanDirectory(directory);
    console.log('==> ', fileFullPaths);
    for (const fileFullPath of fileFullPaths) {
      // 读取文件二进制内容
      const data = fs.readFileSync(fileFullPath);
      console.log('提取到文件二进制内容');
      const fileName = path.basename(fileFullPath);

      // todo 判断文件名是否已落库
      const fileInfoData = await this.reportDao.executeQuery(`select * from file_info where name = '${fileName}'`);
      console.log('查询结果: ', fileInfoData);
      if (fileInfoData) {
        console.log('文件已落库, 跳过');
        continue;
      }

      console.log('提取到文件名: ', fileName);
      const summary = await this.extractSummary(data, fileName);
      if (!summary) {
        console.log('没有提取到文件摘要');
        continue;
      }
      console.log('提取到文件摘要');
      const gist = await this.extractGists(summary);
      if (gist) {
        console.log('提取到文件gist, 准备保存落库');
        const report = new Report();
        report.name = fileName;
        report.download_url = path.join(
          process.env.DOWNLOAD_FIELS_PATH,
          fileName,
        );
        report.summary = "";
        report.description = gist;
        await this.reportDao.save(report);
        // todo 保存到向量空间

      }
    }
  }

  async scanDirectory(directory: string): Promise<string[]> {
    const files: string[] = [];
    const entries = fs.readdirSync(directory, {
      withFileTypes: true,
    });
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await this.scanDirectory(fullPath);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }
    return files;
  }

  async extractSummary(file: Buffer, fileName: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', new Blob([file]), fileName);
    formData.append('purpose', 'file-extract');
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.ZHIPUAI_API_KEY}`,
      },
      body: formData,
    });
    const data = await response.json();
    const fileId = data?.id;
    if (!fileId) {
      console.error('Failed to upload file');
      throw new Error('Failed to upload file');
    }
    const extractionApi = `https://open.bigmodel.cn/api/paas/v4/files/${fileId}/content`;
    const summaryRes: any = await fetch(extractionApi, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.ZHIPUAI_API_KEY}`,
      },
    });
    const summary = await summaryRes.json();
    const deleteFileApi = `https://open.bigmodel.cn/api/paas/v4/files/${fileId}`;
    const deleteRes: any = await fetch(deleteFileApi, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${process.env.ZHIPUAI_API_KEY}`,
      },
    });
    console.log('删除文件响应状态码: ', deleteRes.status);
    return summary?.content;
  }

  /**
   * 提取报告的核心内容
   * @param summary
   * @returns
   */
  async extractGists(summary: string): Promise<string> {
    const ai = new ZhipuAI({});
    const data: any = await ai.createCompletions({
      model: 'glm-4-long',
      messages: [
        {
          role: 'system',
          content: gist_system_prompt,
        },
        { role: 'user', content: `请帮我总结归纳如下内容: ${summary}` },
      ],
      stream: false,
    });
    return data?.choices[0].message.content;
  }

  /**
   * 保存到向量数据库
   */
  async saveVector() {

  }

  /**
   * 从pdf中提取前3页并转换成图片保存
   */
  async extractImages() {
    // 提取前3页

    // 压缩图片

  }
}
