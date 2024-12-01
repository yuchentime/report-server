import { Injectable } from '@nestjs/common';
import { ZhipuAI } from 'zhipuai-sdk-nodejs-v4';
import * as path from 'path';
import * as fs from 'fs';

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
    const systemPrompt = `
      ## 角色
      - 资深的文字编辑工作者
      ## 任务
      - 根据用户提供的报告内容，使用中文进行归纳总结
      ## 要求
      - 提取报告中的每一个核心要点，确保不要遗漏，这对我很重要
      - 针对每个要点提供30字以内的简短说明
      - 务必条理清晰
      - 不要展示跟核心要点无关的内容
      ## 附加动作
      - 在总结后面补充针对该报告提出的5个相关的值得思考的问题
      - 标题：“值得思考的问题？”
      ## 输出格式
      - HTML格式
      ## 参考如下示例中的内容格式:
      ---示例开始---
      <div>
        <h2>核心内容总结</h2>
        <p><strong>研究背景：</strong>IBM商业价值研究院联合牛津经济研究院对全球2000位CFO进行调研，探讨在生成式AI时代CFO如何应对挑战。</p>
        <p><strong>CFO角色转变：</strong>CFO从传统财务角色转变为深入业务、提供洞察的角色，需引领组织变革。</p>
        <p><strong>关键举措：</strong>报告提出六项关键举措，包括技术置于核心、战略执行力、投资回报展示、风险管理、数据作为AI氧气、人才革命。</p>
        <p><strong>高绩效CFO特质：</strong>高绩效CFO通过聚焦战略性未来、高效执行战略、快速响应市场变化、敏锐发现推动竞争优势的技术而脱颖而出。</p>
        <p><strong>技术与业务融合：</strong>技术战略与业务战略密不可分，CFO在此融合中发挥关键作用。</p>
      </div>
      <div>
        <h2>值得思考的问题？</h2>
        <ul>
          <li>如何在确保数据安全和隐私的前提下，有效地利用数据驱动决策？</li>
          <li>CFO如何评估和选择适合组织的技术投资，以确保长期竞争力？</li>
          <li>在人才培养方面，CFO应如何平衡现有员工的技能提升与新技能人才的招聘？</li>
        </ul>
      </div>  
      ---示例结束---  
    `;
    const data: any = await ai.createCompletions({
      model: 'glm-4-long',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        { role: 'user', content: `请帮我总结归纳如下内容: ${summary}` },
      ],
      stream: false,
    });
    return data?.choices[0].message.content;
  }
}
