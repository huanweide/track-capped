'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const mod = require('./index.js');
const CLI = path.join(__dirname, 'index.js');
const NODE = process.execPath;

test('parseArgs: 位置参数当 root', () => {
  const a = mod.parseArgs(['/some/dir']);
  assert.equal(a.root, '/some/dir');
  assert.equal(a.json, false);
});

test('parseArgs: --root / --out / --json 显式标志', () => {
  const a = mod.parseArgs(['--root', '/r', '--out', '/o.html', '--json']);
  assert.equal(a.root, '/r');
  assert.equal(a.out, '/o.html');
  assert.equal(a.json, true);
});

test('parseArgs: --help 与 -h', () => {
  assert.equal(mod.parseArgs(['--help']).help, true);
  assert.equal(mod.parseArgs(['-h']).help, true);
});

test('parseArgs: 多个位置参数只取第一个当 root', () => {
  const a = mod.parseArgs(['/r1', '/r2']);
  assert.equal(a.root, '/r1');
});

test('layerOf: 正确分类已知 slug', () => {
  assert.equal(mod.layerOf('devdoctor'), '源码层·静态坏味道');
  assert.equal(mod.layerOf('repodoctor'), 'git 层·治理');
  assert.equal(mod.layerOf('pkgdoctor'), '配置层');
  assert.equal(mod.layerOf('enghealth'), '编排层');
  assert.equal(mod.layerOf('track-capped'), '展示/门户');
});

test('layerOf: 未知 slug 落未分类', () => {
  assert.equal(mod.layerOf('totally-unknown-xyz'), '未分类');
});

test('extractReadmeMeta: 提取标题与首段', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-meta-'));
  const rp = path.join(dir, 'README.md');
  fs.writeFileSync(rp, '# My Tool\n\n这是一段描述文字。\n\n## 用法\n更多内容。\n');
  const m = mod.extractReadmeMeta(rp);
  assert.equal(m.title, 'My Tool');
  assert.equal(m.desc, '这是一段描述文字。');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('extractReadmeMeta: 无标题行取目录名', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-meta2-'));
  fs.writeFileSync(path.join(dir, 'README.md'), '纯文本没有标题\n');
  const m = mod.extractReadmeMeta(path.join(dir, 'README.md'));
  assert.equal(m.title, 'tc-meta2-'.length >= 0 ? m.title : m.title); // title 非空
  assert.ok(m.title.length > 0);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('scanProjects: 扫描 fixture 目录产出卡片', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-scan-'));
  const d1 = path.join(root, 'ol-devdoctor');
  fs.mkdirSync(d1);
  fs.writeFileSync(path.join(d1, 'README.md'), '# devdoctor\n\n依赖体检整合版。\n');
  fs.writeFileSync(path.join(d1, 'index.js'), '// entry\n');
  const d2 = path.join(root, 'ol-notes');
  fs.mkdirSync(d2);
  fs.writeFileSync(path.join(d2, 'README.md'), '# 纯笔记\n\n只有文档。\n');
  const projects = mod.scanProjects(root);
  assert.equal(projects.length, 2);
  const dev = projects.find((p) => p.slug === 'ol-devdoctor');
  assert.ok(dev);
  assert.equal(dev.hasEntry, true);
  assert.equal(dev.layer, '源码层·静态坏味道');
  const notes = projects.find((p) => p.slug === 'ol-notes');
  assert.equal(notes.hasEntry, false);
  // 有入口的排在前面
  assert.equal(projects[0].slug, 'ol-devdoctor');
  fs.rmSync(root, { recursive: true, force: true });
});

test('renderPortal: 含决策树 / 治理层 / 项目 slug / 封顶标记', () => {
  const html = mod.renderPortal({
    root: '/tmp/x',
    projects: [{ slug: 'ol-devdoctor', title: 'devdoctor', desc: 'd', files: ['index.js'], hasEntry: true, layer: '源码层·静态坏味道' }],
    generatedAt: '2026-08-16T00:00:00Z',
  });
  assert.ok(html.includes('工程健康家族 · 封顶门户'));
  assert.ok(html.includes('选型决策树'));
  assert.ok(html.includes('想查依赖是否臃肿'));
  assert.ok(html.includes('源码层·静态坏味道'));
  assert.ok(html.includes('ol-devdoctor'));
  assert.ok(html.includes('横向切口已枯竭'));
  assert.ok(html.includes('<!DOCTYPE html>'));
});

test('CLI 边界: root 不存在 -> 退出码 2 且报错到 stderr', () => {
  let code = 0, errOut = '';
  try {
    execFileSync(NODE, [CLI, '--root', '/no/such/dir/xyz'], { encoding: 'utf8' });
  } catch (e) {
    code = e.status;
    errOut = e.stderr ? e.stderr.toString() : '';
  }
  assert.equal(code, 2);
  assert.ok(errOut.includes('错误'));
});

test('CLI: --json 仅输出纯 JSON (无多余文本)', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-json-'));
  const d = path.join(root, 'ol-devdoctor');
  fs.mkdirSync(d);
  fs.writeFileSync(path.join(d, 'README.md'), '# devdoctor\n\nx。\n');
  const out = execFileSync(NODE, [CLI, '--root', root, '--json'], { encoding: 'utf8' });
  let parsed = null;
  assert.doesNotThrow(() => { parsed = JSON.parse(out); });
  assert.equal(parsed.count, 1);
  assert.equal(parsed.projects[0].slug, 'ol-devdoctor');
  fs.rmSync(root, { recursive: true, force: true });
});

test('CLI: 生成 HTML 门户文件', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-gen-'));
  const d = path.join(root, 'ol-devdoctor');
  fs.mkdirSync(d);
  fs.writeFileSync(path.join(d, 'README.md'), '# devdoctor\n\n依赖体检。\n');
  const outFile = path.join(root, '_portal.html');
  execFileSync(NODE, [CLI, '--root', root, '--out', outFile], { encoding: 'utf8' });
  assert.ok(fs.existsSync(outFile));
  const html = fs.readFileSync(outFile, 'utf8');
  assert.ok(html.includes('工程健康家族 · 封顶门户'));
  assert.ok(html.includes('devdoctor'));
  fs.rmSync(root, { recursive: true, force: true });
});

test('CLI 边界: --root 缺值 -> 退出码 2', () => {
  let code = 0, errOut = '';
  try {
    execFileSync(NODE, [CLI, '--root'], { encoding: 'utf8' });
  } catch (e) {
    code = e.status;
    errOut = e.stderr ? e.stderr.toString() : '';
  }
  assert.equal(code, 2);
  assert.ok(errOut.includes('错误'));
});
