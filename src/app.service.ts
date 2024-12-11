import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ZhipuAI } from 'zhipuai-sdk-nodejs-v4';
import { gist_system_prompt } from './common/constant';
import * as pdfUtil from './common/pdfUtil';
import * as R2Util from './common/R2Util';
import * as stringUtil from './common/stringUtil';
import { ReportDao } from './dao/report.dao';
import * as csvParser from 'csv-parser';
import * as iconv from 'iconv-lite';
import * as process from 'node:process';

@Injectable()
export class AppService {
  constructor(private readonly reportDao: ReportDao) {}

  async insert(name: string, pages: string, publish_date: string) {
    if (!name || !publish_date || !pages) {
      return;
    }
    const pageCount = Number(pages.replace('页', ''));
    let price = 2;
    if (pageCount > 60) {
      price = 3;
    } else if (pageCount > 100) {
      price = 5;
    }
    const publishedDate = Number(publish_date.replace(/\//g, ''));
    this.reportDao.insert({
      name: this.replaceName(name),
      summary: '',
      download_url: '',
      example_image_url: '',
      pages: Number(pages),
      published_date: Number(publishedDate),
      ext: JSON.stringify({ price }),
    });
  }

  async initReport() {
    // 1. 从.env中获取目录路径
    const directoryPath = process.env.CSV_DIRECTORY_PATH;

    if (!directoryPath) {
      console.error('CSV directory path is not specified in the .env file.');
      return;
    }

    try {
      // 2. 读取指定目录中的所有csv文件
      const files = fs
        .readdirSync(directoryPath)
        .filter((file) => file.endsWith('.csv'));

      for (const file of files) {
        const filePath = path.join(directoryPath, file);

        // 3. 读取并遍历每个csv文件
        const records = await this.readCsvFile(filePath);

        for (const record of records) {
          // console.log('record: ', record)
          // 4. 按表头取得每一个字段并打印
          const { name, publish_date, pages } = record;
          if (!name || !publish_date || !pages) {
            continue;
          }
          const pageCount = Number(pages.replace('页', ''));
          let price = 2;
          if (pageCount > 60) {
            price = 3;
          } else if (pageCount > 100) {
            price = 5;
          }
          const publishedDate = Number(publish_date.replace(/\//g, ''));
          this.reportDao.insert({
            name: this.replaceName(name),
            summary: '',
            download_url: '',
            example_image_url: '',
            pages: pageCount,
            published_date: publishedDate,
            ext: `{'price': ${price}}`,
          });
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    } catch (err) {
      console.error('Error reading CSV files:', err);
    }

    console.log('报告数据初始化完毕');
  }

  private readCsvFile(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];

      // 读取csv文件并解析
      fs.createReadStream(filePath)
        .pipe(iconv.decodeStream('gbk'))
        .pipe(csvParser())
        .on('data', (row) => {
          results.push(row);
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  async summary(name: string) {
    const directory = process.env.LOCAL_PDF_PATH;
    const fileFullPaths = await this.scanPdfDirectory(directory);
    // 每10个fileFullPaths为一批处理，每批间隔5秒
    for (let i = 0; i < fileFullPaths.length; i += 1) {
      // console.log('==> ', path.basename(fileFullPaths[i]).trim());
      if (name && name !== path.basename(fileFullPaths[i]).trim()) {
        continue;
      }
      await this.writeSummary(fileFullPaths[i]);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    console.log('pdf摘要完毕');
  }

  async extractPdfImages() {
    const directory = process.env.LOCAL_PDF_PATH;
    const fileFullPaths = await this.scanPdfDirectory(directory);
    console.log('==> ', fileFullPaths);
    for (let i = 0; i < fileFullPaths.length; i += 1) {
      try {
        await this.writePdfImages(fileFullPaths[i]);
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (e) {
        console.error('上传pdf错误: ', fileFullPaths[i]);
      }
    }
    console.log('pdf图片提取完毕');
  }

  async writeSummary(fileFullPath: string) {
    // 读取文件二进制内容
    const data = fs.readFileSync(fileFullPath);
    console.log('提取到文件二进制内容');
    const fileName = this.replaceName(path.basename(fileFullPath));

    // 判断文件名是否已落库
    const reportInDb = await this.reportDao.queryByName(fileName);
    console.log('查询结果: ', reportInDb);
    if (!reportInDb) {
      console.log('文件未落库');
    }

    try {
      console.log('提取到文件名: ', fileName);
      const extractedContent = await this.extractContent(
        data,
        fileName + '.pdf',
      );
      if (!extractedContent) {
        console.log('没有提取到文件摘要');
      }
      console.log('提取到文件摘要');

      const summary = await this.extractSummary(extractedContent);
      if (summary) {
        console.log('提取到文件gist, 准备保存落库');
        reportInDb.name = fileName;
        reportInDb.summary = summary
          .replace(/\n/g, '')
          .replace(/```html/g, '')
          .replace(/```/g, '');
        await this.reportDao.update(reportInDb);
        console.log('文件摘要保存完毕，准备写入coze');
        //  将摘要和文件名按特定格式写入coze知识库
        const txtPath = path.join(
          process.env.LOCAL_PDF_PATH,
          `${fileName}.txt`,
        );
        const textContent = reportInDb.summary.replace(/<[^>]+>/g, '');
        fs.writeFileSync(txtPath, textContent);
      } else {
        console.error('摘要提取失败，文件：', fileName);
      }
    } catch (error) {
      console.error('Error during processing:', error);
    }
  }

  async importCoze() {
    const directory = process.env.LOCAL_PDF_PATH;
    const files = fs
      .readdirSync(directory)
      .filter((file) => file.endsWith('.txt'));

    for (const file of files) {
      const filePath = path.join(directory, file);
      const txtFileData = fs.readFileSync(filePath);
      fetch(process.env.COZE_DOCUMENT_CREATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Agw-Js-Conv': 'str',
          Authorization: `Bearer ${process.env.COZE_SECRET_TOKEN}`,
        },
        body: JSON.stringify({
          dataset_id: process.env.COZE_DB_ID,
          document_bases: [
            {
              name: path.basename(file, '.txt'),
              source_info: {
                file_type: 'txt',
                file_base64: txtFileData.toString('base64'),
              },
            },
          ],
          chunk_strategy: {
            chunk_type: 0,
            max_tokens: 1024,
          },
        }),
      })
        .then((response) => {
          console.log('response: ', response);
        })
        .catch((error) => {
          console.error('Error during processing coze :', error.message);
        });

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.log('coze导入完毕');
  }

  async writePdfImages(fileFullPath: string) {
    return new Promise(async (resolve, reject) => {
      const fileName = this.replaceName(path.basename(fileFullPath));
      console.log('提取到文件名: ', fileName);
      // 判断文件名是否已落库
      const reportInDb = await this.reportDao.queryByName(fileName);
      // console.log('查询结果: ', reportInDb);
      if (reportInDb?.totalCount ?? 0 > 0) {
        console.log('文件未落库');
        reject('文件未落库');
      }

      const downloadFileName = stringUtil.generateRandomFiveDigitNumber();
      console.log('downloadFileName: ', downloadFileName);
      // 提取并上传pdf的样例图片
      const imagePaths = await pdfUtil.convertPDFPagesToImages(
        fileFullPath,
        [2, 3, 4],
        process.env.LOCAL_IMAGE_PATH,
        downloadFileName,
      );

      // 上传pdf文件
      try {
        await R2Util.uploadToR2(fileFullPath, downloadFileName + '.pdf');
        const r2ImageUrls: string[] = [];
        for (const imagePath of imagePaths) {
          let imageName = path.basename(imagePath);
          imageName = imageName.replace('.png', '').replace('.', '') + '.png';

          await R2Util.uploadToR2(imagePath, imageName);
          fs.unlinkSync(imagePath);
          r2ImageUrls.push(process.env.R2_IMAGE_BASE_URL + '/' + imageName);
        }

        reportInDb.download_url =
          process.env.R2_IMAGE_BASE_URL + '/' + downloadFileName + '.pdf';
        reportInDb.example_image_url = r2ImageUrls.join(',');
        await this.reportDao.update(reportInDb);
        resolve(reportInDb);
      } catch (e) {
        console.error(e);
        reject(e);
      }
    });
  }

  async scanPdfDirectory(directory: string): Promise<string[]> {
    const files: string[] = [];
    const entries = fs
      .readdirSync(directory, {
        withFileTypes: true,
      })
      .filter((file) => file.name.endsWith('.pdf'));
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await this.scanPdfDirectory(fullPath);
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
      temperature: 0.5,
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
    return fileName
      .replace('【发现报告 fxbaogao.com】', '')
      .replace('.pdf', '');
  }
}
