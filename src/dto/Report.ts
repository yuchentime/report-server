export class Report {
  id?: number;
  name: string;
  download_url: string;
  summary: string;
  // 格式：202411
  published_date: number;
  // 页数
  pages: number;
  ext = '{}';
}
