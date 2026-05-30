-- 初始化脚本 - 创建用户并设置权限
-- 这个脚本会在MySQL容器首次启动时自动执行

-- 确保xinmeng用户有访问xinmeng数据库的权限
CREATE USER IF NOT EXISTS 'xinmeng'@'%' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON xinmeng.* TO 'xinmeng'@'%';
FLUSH PRIVILEGES;

-- 如果已有数据，只需要修复权限
CREATE USER IF NOT EXISTS 'xinmeng'@'%';
ALTER USER 'xinmeng'@'%' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON xinmeng.* TO 'xinmeng'@'%';
FLUSH PRIVILEGES;
