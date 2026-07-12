-- 001_visitor_track_browser_nullable.sql
--
-- 背景：parse-ua 迁库脚本下线后，前端不再发送完整 UA 字符串，
-- 只发 browser_name / os_name / device_type 等已解析字段。
-- 因此 visitor_track.browser 不再需要有值，改为可空 + TEXT。
--
-- 执行时机：本次 Go 端直接写库的代码上线 *之前*，在 dev 验证后于 prod 跑一次。
-- 该表只追加，ALTER 秒级完成，无锁表风险。

ALTER TABLE visitor_track ALTER COLUMN browser DROP NOT NULL;
ALTER TABLE visitor_track ALTER COLUMN browser TYPE TEXT;
