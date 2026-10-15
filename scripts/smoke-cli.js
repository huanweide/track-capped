#!/usr/bin/env node
'use strict';

/*
 * track-capped 端到端冒烟 + 产物自包含断言
 *
 * 存在理由：单测测的是函数级行为，而本工具唯一的「交付物」是一张自包含 HTML 门户。
 * 历史上出现过「单测全绿但门户漏样式 / 漏资源」的同类事故，因此这里真跑一次 CLI，
 * 并对产物做外部请求扫描——一旦有人引入 CDN / 远程字体 / 外链脚本，门禁必须红。
 *
 * 用法: node scripts/smoke-cli.js
 * 退出码: 0 全通过 / 1 存在断言失败
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CLI = path.join(ROOT, 'index.js');
const NODE = process.execPath;

let pass = 0;
const fails = [];

function ok(name, cond, extra) {
  if (cond) { pass++; return; }
  fails.push(name + (extra ? ' -> ' + extra : ''));
}

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-smoke-'));
  const a = path.join(root, 'ol-devdoctor');
  fs.mkdirSync(a);
  fs.writeFileSync(path.join(a, 'README.md'), '# devdoctor\n\n四维项目体检。\n');
  fs.writeFileSync(path.join(a, 'index.js'), '// entry\n');
  const b = path.join(root, 'ol-repodoctor');
  fs.mkdirSync(b);
  fs.writeFileSync(path.join(b, 'README.md'), '# repodoctor\n\n仓库卫生。\n');
  const c = path.join(root, 'random-unrelated');
  fs.mkdirSync(c);
  fs.writeFileSync(path.join(c, 'README.md'), '# 无关目录\n\n不是家族成员。\n');
  return root;
}

// 1) 真跑一次门户生成
const root = makeFixture();
const outFile = path.join(root, '_portal.html');
const stdout = execFileSync(NODE, [CLI, '--root', root, '--out', outFile], { encoding: 'utf8' });
ok('CLI 成功并报告生成路径', stdout.includes(outFile), stdout.trim());
ok('门户文件真实落盘', fs.existsSync(outFile));

const html = fs.readFileSync(outFile, 'utf8');

// 2) 产物内容断言
ok('含 DOCTYPE', html.includes('<!DOCTYPE html>'));
ok('含家族成员 ol-devdoctor', html.includes('ol-devdoctor'));
ok('含家族成员 ol-repodoctor', html.includes('ol-repodoctor'));
ok('已知轴被正确分层', html.includes('源码层·静态坏味道') && html.includes('git 层·治理'));
ok('未知目录归入未分类并告警', html.includes('不属于本家族') && html.includes('random-unrelated'));
ok('页内带自检徽标', html.includes('清单自检通过'));
ok('样式内联在产物中', /<style>[\s\S]{200,}<\/style>/.test(html));
ok('meta viewport 存在', html.includes('name="viewport"'));

// 3) 自包含性断言：任何外部资源请求都视为破坏「零网络」承诺
const externalRefs = [];
const patterns = [
  /<script[^>]+src=/gi,
  /<link[^>]+href=["']https?:/gi,
  /<img[^>]+src=["']https?:/gi,
  /@import\s+(url\()?["']?https?:/gi,
  /url\(\s*["']?https?:/gi,
];
for (const re of patterns) {
  const m = html.match(re);
  if (m) externalRefs.push(...m);
}
ok('产物零外部请求（无 CDN / 远程字体 / 外链脚本）', externalRefs.length === 0, externalRefs.join(' | '));

// 4) --check 门禁真能以非 0 退出（用不存在的 root 不行，改验证 --root 缺值边界）
let rc = 0;
try {
  execFileSync(NODE, [CLI, '--root'], { encoding: 'utf8' });
} catch (e) { rc = e.status; }
ok('--root 缺值退出码为 2', rc === 2, 'rc=' + rc);

let rcCheck = 0;
try {
  execFileSync(NODE, [CLI, '--check'], { encoding: 'utf8' });
} catch (e) { rcCheck = e.status; }
ok('--check 自洽时退出码 0', rcCheck === 0, 'rc=' + rcCheck);

fs.rmSync(root, { recursive: true, force: true });

// 输出
if (fails.length) {
  process.stderr.write('冒烟失败 ' + fails.length + ' 项:\n');
  for (const f of fails) process.stderr.write('  - ' + f + '\n');
  process.exit(1);
}
process.stdout.write('冒烟通过: ' + pass + ' 项断言全绿, 产物自包含且零外部请求\n');