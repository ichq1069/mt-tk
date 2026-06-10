# 存储管理功能迁移说明

## 任务
将 H5 端的 Storage.tsx 页面功能完整迁移到 PC 管理端的 StorageSection

## 功能清单
1. R2 存储配置
   - 用户 ID、密钥 ID、密钥、端点、存储桶名称、自定义域名
   - 连接测试功能
   - 配置保存功能

2. 宝塔面板部署指南
   - 部署步骤说明
   - 配置示例

3. 数据库工具
   - SQL 编辑器
   - SQL 文件上传
   - 危险操作检测
   - SQL 执行历史
   - 数据导出功能（DDL + DML）

## 实施计划
1. 保留 Storage.tsx 的完整功能代码
2. 将其集成到 PCDashboard.tsx 的 StorageSection 中
3. 使用 Tabs 组件分隔不同功能模块
4. 保持原有的所有状态管理和业务逻辑
