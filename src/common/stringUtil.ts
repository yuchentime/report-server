export function generateRandomFiveDigitNumber() {
    // 生成一个 5 位数的随机数
    const min = 10000; // 最小的 5 位数
    const max = 99999; // 最大的 5 位数
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function replaceSpecialCharsAndSpaces(input: string): string {
  return input.replace(/[\s]+|[^\w\s]/g, '');
}
