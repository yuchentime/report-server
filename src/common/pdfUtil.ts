
import * as fs from 'fs';
import { fromPath } from "pdf2pic";
import { WriteImageResponse } from 'pdf2pic/dist/types/convertResponse';

/**
 * 需要预先安装：graphicsmagick ghostscript
 * @param pdfPath 
 * @param startPage 
 * @param endPage 
 * @param outputDir 
 */
export async function convertPDFPagesToImages(pdfPath: string, pages: number[], outputDir: string, name: string) {
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // 配置 pdf2pic
  const options = {
    density: 100, // 图片质量
    saveFilename: name, // 图片文件名前缀
    savePath: outputDir, // 输出目录
    format: "png", // 图片格式
    width: 800, // 图片宽度
    height: 1200, // 图片高度
  };

  // 创建 pdf2pic 实例
  try {
    const images: WriteImageResponse[] = await fromPath(pdfPath, options).bulk(pages, { responseType: 'image' });
    return images.map((image, index) => outputDir + '/' + image.name);
  } catch (error) {
    console.error(`Error converting PDF to images: ${error}, pdfPath: ${pdfPath}`);
  }
  return [];
}
