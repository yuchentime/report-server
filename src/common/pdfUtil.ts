
import * as fs from 'fs';
import { fromPath } from "pdf2pic";
import { start } from 'repl';

export async function convertPDFPagesToImages(pdfPath: string, startPage: number, endPage: number, outputDir: string) {
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // 配置 pdf2pic
  const options = {
    density: 100, // 图片质量
    saveFilename: "page", // 图片文件名前缀
    savePath: outputDir, // 输出目录
    format: "png", // 图片格式
    width: 800, // 图片宽度
    height: 1200, // 图片高度
  };

  // 创建 pdf2pic 实例
  fromPath(pdfPath, options)(startPage, { responseType: 'image' }).then((res: any) => {
    console.log(res);
  }).catch((err: any) => {
    console.log(err);
  });

}
