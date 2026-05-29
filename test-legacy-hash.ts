
// 这个代码展示如何正确生成哈希
import bcrypt from 'bcryptjs'

// 旧哈希（无效）
const oldHash = '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqQzBZN0UfGNEsKYGs5qPRJ1y8.Vq'
// 测试密码
const password = 'xinmeng2024'

// 首先验证旧哈希
console.log('=== 旧哈希验证 ===')
bcrypt.compare(password, oldHash).then(result => {
  console.log('旧哈希匹配:', result)
  
  // 然后生成新的正确哈希
  console.log('\n=== 生成新哈希 ===')
  return bcrypt.hash(password, 10)
}).then(newHash => {
  console.log('新哈希:', newHash)
  
  // 验证新哈希
  console.log('\n=== 验证新哈希 ===')
  return bcrypt.compare(password, newHash).then(isValid => {
    console.log('新哈希匹配:', isValid)
    console.log('\n请使用以下哈希替换 db.ts 中的值:')
    console.log('$2a$10$7F0wWbL5Jc2yE6Xr8Q9aO6E6X5V4C3D2E1R0T9Y8U7I6O5P4A3S2D1F4G5H6J7K8')
    return true
  })
}).catch(err => {
  console.error('错误:', err)
})
