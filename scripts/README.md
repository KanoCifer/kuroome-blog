# UA 解析脚本

用于批量处理数据库中 visitor_track 表的 User-Agent 数据，解析为结构化的浏览器、操作系统、设备信息。

## 功能特性

- 使用 `ua-parser-js` 解析 UA 字符串
- 批量处理，每次处理 100 条记录，避免内存压力
- 自动跳过已处理的记录（browser_name 不为空的记录）
- 错误处理，单条记录解析失败不影响整体流程
- 处理完成后显示统计信息

## 字段映射

| 解析结果字段 | 数据库字段 | 说明 |
|-------------|------------|------|
| browser.name | browser_name | 浏览器名称（如 Chrome、Safari） |
| browser.version | browser_version | 浏览器版本号 |
| os.name | os_name | 操作系统名称（如 Windows、macOS、iOS） |
| os.version | os_version | 操作系统版本号 |
| cpu.architecture | cpu | CPU 架构（如 amd64、arm64） |
| device.type | device_type | 设备类型（如 mobile、tablet、desktop） |

## 使用方法

### 1. 确保数据库配置正确

脚本会自动读取 `../backend/.env` 文件中的 `DATABASE_URL` 配置，确保后端的环境变量已经正确配置。

### 2. 运行脚本

```bash
cd scripts
npm run parse-ua
```

### 3. 输出示例

```
Connected to database successfully
Processing 100 records...
Processed 100 records so far...
Processing 87 records...
Processed 187 records so far...
Processing 0 records...
Processed 187 records so far...

Processing complete! Total records processed: 187

Statistics:
Total records: 245
Processed records: 187
Remaining records: 58
```

## 注意事项

- 脚本只会处理 `browser_name` 为空的记录，已经处理过的记录不会重复处理
- 如果需要重新处理所有记录，可以先执行 SQL 清空相关字段：
  ```sql
  UPDATE visitor_track SET browser_name = NULL, browser_version = NULL, os_name = NULL, os_version = NULL, cpu = NULL, device_type = NULL;
  ```
- 建议在非高峰时段运行，避免对数据库性能造成影响
