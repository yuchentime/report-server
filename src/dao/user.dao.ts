import { Injectable } from '@nestjs/common';
import { executeQuery, executeSave } from '../common/sqlApi';

@Injectable()
export class UserDao {
  async updateUser(email: string, vip: number, days: number) {
    try {
      const sql = `UPDATE user_info SET vip = ${vip} WHERE email = '${email}'`;
      await executeSave(sql);
    } catch (e) {
      console.error('更新用户信息失败');
    }

    try {
      const vipInfoWithPage = await this.getVipInfo(email);
      if (!vipInfoWithPage || vipInfoWithPage.totalCount === 0) {
        //   根据今日累计days，计算起止日期
        const startDate = new Date();
        const endDate = this.addDays(startDate, Number(days));
        const vipSql = `INSERT INTO vip_info (email, start_date, end_date) VALUES ('${email}', '${startDate}', '${endDate}')`;
        await executeSave(vipSql);
      } else {
        const startDate = new Date();
        const endDate = this.addDays(startDate, Number(days));
        const vipSql = `UPDATE vip_info SET start_date=${startDate}, end_date=${endDate} WHERE email=${email}`;
        await executeSave(vipSql);
      }
    } catch (e) {
      console.error('更新VIP信息失败');
    }
  }

  async getVipInfo(email: string) {
    const sql = `SELECT * FROM vip_info WHERE email = '${email}'`;
    return await executeQuery(sql);
  }

  addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
