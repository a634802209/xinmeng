import bcrypt from 'bcryptjs'

const plainText = 'xinmeng2024'
bcrypt.hash(plainText, 10).then(hash => {
  console.log('新的密码哈希:', hash)
  console.log('测试验证...')
  return bcrypt.compare(plainText, hash)
}).then(isValid => {
  console.log('验证结果:', isValid)
})
