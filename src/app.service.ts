import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ZhipuAI } from 'zhipuai-sdk-nodejs-v4';
import { gist_system_prompt } from './common/constant';
import * as pdfUtil from './common/pdfUtil';
import * as R2Util from './common/R2Util';
import { ReportDao } from './dao/report.dao';

@Injectable()
export class AppService {
  constructor(private readonly reportDao: ReportDao) { }

  async insertReport(name: string, pageCount: number, publishedDate: number) {
    await this.reportDao.insert({
      name: this.replaceName(name),
      summary: '',
      download_url: '',
      pages: pageCount,
      published_date: publishedDate,
      ext: '{}',
    });
  }

  async summary() {
    const directory = process.env.LOCAL_PDF_PATH;
    const fileFullPaths = await this.scanDirectory(directory);
    console.log('==> ', fileFullPaths);
    // 每10个fileFullPaths为一批处理，每批间隔5秒
    for (let i = 0; i < fileFullPaths.length; i += 10) {
      const batch = fileFullPaths.slice(i, i + 10);
      console.log('batch: ', batch);
      Promise.allSettled(
        batch.map(async (fileFullPath) => {
          this.writeSummary(fileFullPath);
        }),
      ).then((reports) => {
        console.log('reports: ', reports);
        return reports;
      });
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
    console.log('pdf摘要完毕');
  }

  async extractPdfImages() {
    const directory = process.env.LOCAL_PDF_PATH;
    const fileFullPaths = await this.scanDirectory(directory);
    console.log('==> ', fileFullPaths);

    for (let i = 0; i < fileFullPaths.length; i += 10) {
      const batch = fileFullPaths.slice(i, i + 10);
      console.log('batch: ', batch);
      Promise.allSettled(
        batch.map(async (fileFullPath) => {
          this.writePdfImages(fileFullPath);
        }),
      ).then((reports) => {
        console.log('reports: ', reports);
        return reports;
      });
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
    console.log('pdf图片提取完毕');
  }

  async writeSummary(fileFullPath: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      // 读取文件二进制内容
      const data = fs.readFileSync(fileFullPath);
      console.log('提取到文件二进制内容');
      const fileName = this.replaceName(path.basename(fileFullPath));

      // 判断文件名是否已落库
      const reportInDb = await this.reportDao.queryByName(fileName);
      console.log('查询结果: ', reportInDb);
      if (!reportInDb) {
        console.log('文件未落库');
        reject('文件未落库');
      }

      console.log('提取到文件名: ', fileName);
      const extractedContent = await this.extractContent(data, fileName + ".pdf");
      if (!extractedContent) {
        console.log('没有提取到文件摘要');
        reject('没有提取到文件摘要');
      }
      console.log('提取到文件摘要');

      const summary = await this.extractSummary(extractedContent);
      if (summary) {
        console.log('提取到文件gist, 准备保存落库');
        reportInDb.name = fileName;
        reportInDb.summary = summary.replace(/\n/g, '').replace(/```html/g, '').replace(/```/g, '');
        await this.reportDao.update(reportInDb);

        resolve(reportInDb);
      }
    });
  }

  async writePdfImages(fileFullPath: string) {
    return new Promise(async (resolve, reject) => {
      const fileName = this.replaceName(path.basename(fileFullPath));
      console.log('提取到文件名: ', fileName);
      // 判断文件名是否已落库
      const reportInDb = await this.reportDao.queryByName(fileName);
      console.log('查询结果: ', reportInDb);
      if (!reportInDb) {
        console.log('文件未落库');
        reject('文件未落库');
      }
      const imageNamePrefix = String(10000 + Number(reportInDb.id));
      // todo 提取PDF指定页面图片，保存到R2，获取图片URL
      const imagePaths = await pdfUtil.convertPDFPagesToImages(fileFullPath, [2, 3, 4], process.env.LOCAL_IMAGE_PATH, imageNamePrefix);

      const r2ImageUrls: string[] = [];
      for (const imagePath of imagePaths) {
        let imageName = path.basename(imagePath);
        imageName = imageName.replace('.png', '').replace(".", "") + '.png';

        await R2Util.uploadToR2(imagePath, imageName);
        fs.unlinkSync(imagePath);
        r2ImageUrls.push(process.env.R2_IMAGE_BASE_URL + "/" + imageName);
      }

      reportInDb.download_url = r2ImageUrls.join(',');
      await this.reportDao.update(reportInDb);

      resolve(reportInDb);
    });
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

  async extractContent(file: Buffer, fileName: string): Promise<string> {
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
  async extractSummary(summary: string): Promise<string> {
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

  replaceName(fileName: string): string {
    return fileName.replace('【发现报告 fxbaogao.com】', '').replace('.pdf', '');
  }

}
