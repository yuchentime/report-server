export class Report {
  id: number;
  name: string;
  download_url: string;
  summary: string;
  description: string;
  // 格式：202411
  published_date: number;
  // 页数
  pages: number;
  ext_json = '{}';
}
