import { Injectable } from '@nestjs/common';
import { ZhipuAI } from 'zhipuai-sdk-nodejs-v4';
import * as path from 'path';
import * as fs from 'fs';
import { gist_system_prompt } from './data/constant';

@Injectable()
export class AppService {
  async scanFiles() {
    const directory = process.env.FIEL_PATHS;
    const fileFullPaths = await this.scanDirectory(directory);
    console.log('==> ', fileFullPaths);
    for (const fileFullPath of fileFullPaths) {
      // 读取文件二进制内容
      const data = fs.readFileSync(fileFullPath);
      console.log('提取到文件二进制内容');
      const fileName = path.basename(fileFullPath);
      console.log('提取到文件名: ', fileName);
      const summary = await this.extractSummary(data, fileName);
      if (!summary) {
        console.log('没有提取到文件摘要');
        continue;
      }
      console.log('提取到文件摘要');
      const gist = await this.extractGists(summary);
      console.log(gist);
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
    console.log('摘要响应：', summary);
    const deleteFileApi = `https://open.bigmodel.cn/api/paas/v4/files/${fileId}`;
    const deleteRes: any = await fetch(deleteFileApi, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${process.env.ZHIPUAI_API_KEY}`,
      },
    });
    console.log('删除文件响应: ', deleteRes);
    console.log('总结内容: ', summary?.content);
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
}
