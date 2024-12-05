export function generateRandomFiveDigitNumber() {
  // 获取当前时间戳
  const timestamp = new Date().getTime();

  // 生成一个0到99999999的随机数
  const randomPart = Math.floor(Math.random() * 100000000);

  // 结合时间戳和随机数，使用位运算来混合它们
  const combined = timestamp ^ randomPart;

  // 取combined的绝对值并取模100000000，确保结果为8位数字
  const result = Math.abs(combined) % 100000000;

  // 将结果转换为字符串，并确保长度为8位，不足前面补0
  return result.toString().padStart(8, '0');
}

export function replaceSpecialCharsAndSpaces(input: string): string {
  return input.replace(/[\s]+|[^\w\s]/g, '');
}
