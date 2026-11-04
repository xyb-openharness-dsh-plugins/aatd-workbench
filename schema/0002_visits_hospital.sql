/* AATD 0002 · 就医信息支持多家医院（INSPECTOR F6 / G5）
 *
 * 只增不改：0001 已冻结，这里用可空 ALTER 补列；旧行 NULL = 当时没记医院/联系方式，不冒充。
 * 不加判读列；医院名称/联系方式按患者原话与出处记录。
 */
ALTER TABLE visits ADD COLUMN hospital TEXT;
ALTER TABLE visits ADD COLUMN contact TEXT;
ALTER TABLE visits ADD COLUMN contact_source TEXT;
