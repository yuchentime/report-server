import * as pdf2image from 'pdf2image';

export function convertPdfPageToImage(pdfPath, page, outputPath) {
  const pdf = new pdf2image({
    pdf: pdfPath, // 输入PDF文件路径
    page: page, // 要转换的页面号（从1开始）
    output: outputPath, // 输出图片路径
  });
  pdf.convertPDF(pdfPath);
  return new Promise((resolve, reject) => {
    pdf2image.convert(
      {
        pdf: pdfPath, // 输入PDF文件路径
        page: page, // 要转换的页面号（从1开始）
        output: outputPath, // 输出图片路径
      },
      function (err, imagePaths) {
        if (err) {
          reject(err);
        } else {
          resolve(imagePaths);
        }
      },
    );
  });
}
