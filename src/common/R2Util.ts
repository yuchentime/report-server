import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// 加载环境变量
dotenv.config();

// 配置 S3 客户端
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  endpoint: 'https://05a892b35f083d59d5c4108dd423c780.r2.cloudflarestorage.com', // 替换为你的 Cloudflare R2 端点
});

/**
 * 上传文件到 Cloudflare R2 存储桶
 * @param filePath 要上传的文件路径
 * @param key 存储在 R2 中的对象键（文件名）
 */
export async function uploadToR2(filePath: string, key: string): Promise<void> {
  try {
    const fileContent = fs.readFileSync(filePath);

    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: filePath.endsWith('.pdf') ? 'application/pdf' : 'image/png',
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    console.log(`File uploaded successfully: ${key}`);
  } catch (error) {
    console.error('Error uploading file to R2:', error);
    throw error;
  }
}

// 示例使用
if (require.main === module) {
  const filePath = path.join(__dirname, 'example.png'); // 替换为你的文件路径
  const key = 'example.png'; // 替换为你的对象键

  uploadToR2(filePath, key)
    .then(() => console.log('Upload complete'))
    .catch((err) => console.error('Upload failed:', err));
}
