#!/usr/bin/env node
/**
 * public/demo-data.js 同步器：离线回退数据必须是 demo/demo-data.js 的同一份（唯一源）。
 *
 * 为什么存在：public/ 是随包发出的静态目录，里面这份是**生成副本**。手工各改一份，
 * 原型与开发版的回退数据就会分叉（ui-parity ⑧ 会拦，但要在提交前就能修）。
 *
 * 用法：
 *   node scripts/build-demo-copy.mjs           写入（内容没变不落盘）
 *   node scripts/build-demo-copy.mjs --check   只校验，不一致时退出码 1
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'demo', 'demo-data.js')
const target = join(root, 'public', 'demo-data.js')
const checkOnly = process.argv.includes('--check')

if (checkOnly) {
  if (readFileSync(target, 'utf8') !== readFileSync(source, 'utf8')) {
    console.error('✗ public/demo-data.js 与 demo/demo-data.js 不同步，请运行 npm run build:demo')
    process.exit(1)
  }
  console.log('✓ public/demo-data.js 与唯一源同步')
  process.exit(0)
}

copyFileSync(source, target)
writeFileSync(target, readFileSync(source, 'utf8'))
console.log('✓ 已同步 public/demo-data.js ← demo/demo-data.js（唯一源）')
