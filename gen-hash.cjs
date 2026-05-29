const bcrypt = require('bcryptjs')

bcrypt.hash('xinmeng2024', 10, (err, hash) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log('正确的 bcrypt 哈希:', hash)
  console.log()
  console.log('用这个替换 db.ts 中的 INSERT 语句的密码哈希值')
  console.log()
  bcrypt.compare('xinmeng2024', hash, (err, match) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    console.log('验证结果:', match ? '正确' : '错误')
    process.exit(0)
  })
})
