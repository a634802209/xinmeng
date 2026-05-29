import bcrypt from 'bcryptjs'

const hash = '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqQzBZN0UfGNEsKYGs5qPRJ1y8.Vq'
const plainText = 'xinmeng2024'

bcrypt.compare(plainText, hash).then(isValid => {
  console.log('密码匹配结果:', isValid)
  console.log('测试明文:', plainText)
  console.log('哈希值:', hash)
}).catch(err => {
  console.error('错误:', err)
})
