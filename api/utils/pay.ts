import crypto from 'crypto'

/**
 * MD5签名工具函数
 * @param params 参数字典
 * @param key API密钥
 * @returns 签名结果
 */
export function md5Sign(params: Record<string, any>, key: string): string {
  // 1. 按参数名ASCII码从小到大排序
  const sortedKeys = Object.keys(params).sort()
  
  // 2. 拼接参数字符串
  let signStr = ''
  sortedKeys.forEach((key) => {
    const value = params[key]
    if (value !== null && value !== undefined && value !== '') {
      signStr += `${key}=${value}&`
    }
  })
  
  // 3. 拼接密钥
  signStr += `key=${key}`
  
  // 4. MD5加密并转大写
  return crypto.createHash('md5').update(signStr).digest('hex').toUpperCase()
}

/**
 * 创建支付订单（模拟第三方支付接口）
 * @param param0 订单参数
 * @returns 支付链接/二维码
 */
export async function createPayOrder({ orderNo, fee }: { orderNo: string; fee: number }): Promise<{ pay_url: string }> {
  // 这里模拟第三方支付接口调用
  // 实际项目中替换为真实的支付平台API调用
  console.log(`[Pay] Creating payment order: ${orderNo}, fee: ${fee}`)
  
  // 模拟返回支付链接
  // 实际项目中，这里应该调用微信/支付宝等第三方支付API
  return {
    pay_url: `https://pay.example.com/qrcode?order=${orderNo}`
  }
}
