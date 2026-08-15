#!/usr/bin/env node
'use strict';

/*
 * track-capped — 工程健康家族·封顶门户生成器（零依赖单文件）
 *
 * 扫描本地已归档的 family 工具目录，动态生成一张自包含导航门户 HTML：
 *   - 家族地图（按治理层分类的轴卡片）
 *   - 选型决策树（"我想排查 X -> 用 Y"）
 *   - 已归档项目清单（标题 / 描述 / 入口文件 / 治理层）
 * 零依赖、零网络、零配置，纯 fs 只读，输出单文件 HTML（无任何外部请求 / CDN）。
 *
 * 用法：
 *   node track-capped.js [root] [--root <dir>] [--out <file>] [--json] [--help]
 *
 * 设计纪律（沿用 family 范式）：
 *   - CLI 面向用户输出禁用 emoji，只用纯文本。
 *   - --json 模式只输出纯 JSON，门禁结果用退出码表达，绝不向 stdout 写额外文本。
 *   - 路径参数必须 statSync 先验存在性与是否为目录，避免对错误路径谎报通过。
 */

const fs = require('fs');
const path = require('path');

const VERSION = '1.0.0';

// 家族治理层分类（doctor slug -> layer），内置知识（非文件扫描）
const LAYER_MAP = {
  '源码层·静态坏味道': ['idiot-index', 'devdoctor', 'testlite', 'debtlens', 'a11ydoctor', 'awaitscan', 'cycscan', 'secscan', 'dupscan', 'typedoctor', 'debugdoctor', 'litdoctor'],
  'git 层·治理': ['repodoctor', 'docdoctor', 'commitdoctor', 'reldoctor'],
  '配置层': ['pkgdoctor'],
  '编排层': ['enghealth'],
  '展示/门户': ['family-showcase', 'track-capped'],
};

// 选型决策树（知识，硬编码；扫描仅补充"已归档项目"清单）
const DECISION_TREE = [
  ['想查依赖是否臃肿 / 死依赖 / 许可证风险', 'idiot-index · devdoctor · licguard'],
  ['想查测试卫生 / 覆盖率配置', 'testlite'],
  ['想查技术债密度 (TODO/FIXME)', 'debtlens'],
  ['想查前端可访问性 (a11y)', 'a11ydoctor'],
  ['想查异步性能 (串行 await / 嵌套循环)', 'awaitscan'],
  ['想查结构复杂度 (圈复杂度 / 长函数)', 'cycscan'],
  ['想查安全反模式 (eval / 命令注入)', 'secscan'],
  ['想查重复代码块', 'dupscan'],
  ['想查调试 / 日志残留 (console / debugger)', 'debugdoctor'],
  ['想查硬编码魔法值 / 重复字面量', 'litdoctor'],
  ['想查类型纪律 (any / ts-ignore)', 'typedoctor'],
  ['想查 git 仓库卫生 (.env 入库 / 大文件)', 'repodoctor'],
  ['想查文档健康 (死链 / 标题跳级)', 'docdoctor'],
  ['想查提交消息规范', 'commitdoctor'],
  ['想查发布一致性 (version/tag/CHANGELOG)', 'reldoctor'],
  ['想查 package.json 配置规范', 'pkgdoctor'],
  ['想一键全检 + 总分 (编排入口)', 'enghealth'],
];

function layerOf(slug) {
  // 兼容 forge 项目目录的 "ol-" 前缀（如 ol-devdoctor）与桌面归档的裸名（devdoctor）
  const norm = slug.startsWith('ol-') ? slug.slice(3) : slug;
  for (const [layer, slugs] of Object.entries(LAYER_MAP)) {
    if (slugs.includes(slug) || slugs.includes(norm)) return layer;
  }
  return '未分类';
}

function parseArgs(argv) {
  const args = { root: null, out: null, json: false, help: false, rootMissing: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { args.help = true; continue; }
    if (a === '--json') { args.json = true; continue; }
    if (a === '--root') {
      const v = argv[++i];
      if (v === undefined || v.startsWith('-')) {
        args.rootMissing = true;
        if (v !== undefined) i--; // 回退，让下一个选项被正常解析
      } else {
        args.root = v;
      }
      continue;
    }
    if (a === '--out') { args.out = argv[++i]; continue; }
    // 位置参数（非选项）当作 root
    if (!a.startsWith('-') && args.root === null) { args.root = a; }
  }
  return args;
}

// 从 README.md 提取标题（首个 # 行）与首段描述（首个非空非标题行）
function extractReadmeMeta(readmePath) {
  try {
    const text = fs.readFileSync(readmePath, 'utf8');
    const lines = text.split(/\r?\n/);
    let title = '';
    let desc = '';
    for (const ln of lines) {
      const t = ln.trim();
      if (!title) {
        const m = t.match(/^#\s+(.*)$/);
        if (m) { title = m[1].trim(); continue; }
      } else if (!desc) {
        if (t && !t.startsWith('#')) { desc = t; break; }
      }
    }
    return { title: title || path.basename(path.dirname(readmePath)), desc };
  } catch (e) {
    return null;
  }
}

// 扫描 root 下每个子目录，产出项目卡片（纯只读，不执行任何用户代码）
function scanProjects(root) {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const projects = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const dir = path.join(root, e.name);
    let title = e.name;
    let desc = '';
    const readme = path.join(dir, 'README.md');
    if (fs.existsSync(readme)) {
      const meta = extractReadmeMeta(readme);
      if (meta) { title = meta.title; desc = meta.desc; }
    }
    let files = [];
    try { files = fs.readdirSync(dir).filter((f) => !f.startsWith('.')); } catch (e) { files = []; }
    const hasEntry = files.includes('index.js') || files.includes('index.html');
    projects.push({
      slug: e.name,
      title,
      desc,
      files,
      hasEntry,
      layer: layerOf(e.name),
    });
  }
  // 稳定排序：有入口文件的优先，其次按 slug
  projects.sort((a, b) => {
    if (a.hasEntry !== b.hasEntry) return a.hasEntry ? -1 : 1;
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  });
  return projects;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function accentFor(layer) {
  const map = {
    '源码层·静态坏味道': '#5eead4',
    'git 层·治理': '#a78bfa',
    '配置层': '#fbbf24',
    '编排层': '#f472b6',
    '展示/门户': '#38bdf8',
    '未分类': '#94a3b8',
  };
  return map[layer] || '#94a3b8';
}

function renderPortal(ctx) {
  const { root, projects, generatedAt } = ctx;
  const byLayer = {};
  for (const p of projects) {
    (byLayer[p.layer] = byLayer[p.layer] || []).push(p);
  }
  const layerOrder = Object.keys(LAYER_MAP).concat(['未分类']).filter((l) => byLayer[l]);

  const cardsHtml = layerOrder.map((layer) => {
    const items = byLayer[layer].map((p) => {
      const entry = p.hasEntry ? '<span class="tag ok">有入口</span>' : '<span class="tag">仅文档</span>';
      const desc = p.desc ? `<p class="desc">${esc(p.desc)}</p>` : '';
      return `<div class="card">
        <div class="card-head"><span class="slug">${esc(p.slug)}</span>${entry}</div>
        <div class="card-title">${esc(p.title)}</div>
        ${desc}
      </div>`;
    }).join('\n');
    const accent = accentFor(layer);
    return `<section class="layer">
      <h2 style="border-color:${accent}"><span class="dot" style="background:${accent}"></span>${esc(layer)} <span class="count">${byLayer[layer].length}</span></h2>
      <div class="grid">${items}</div>
    </section>`;
  }).join('\n');

  const decisionHtml = DECISION_TREE.map(([q, a]) =>
    `<div class="row"><div class="q">${esc(q)}</div><div class="a">${esc(a)}</div></div>`
  ).join('\n');

  const total = projects.length;
  const withEntry = projects.filter((p) => p.hasEntry).length;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>工程健康家族 · 封顶门户</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 32px 20px 64px;
    font-family: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    background: radial-gradient(1200px 600px at 20% -10%, #1e293b 0%, #0b1120 55%, #060914 100%);
    color: #e2e8f0; line-height: 1.6;
  }
  .wrap { max-width: 1080px; margin: 0 auto; }
  header { text-align: center; margin-bottom: 28px; }
  h1 { font-size: 30px; margin: 0 0 6px;
    background: linear-gradient(90deg, #5eead4, #38bdf8, #a78bfa);
    -webkit-background-clip: text; background-clip: text; color: transparent; }
  .sub { color: #94a3b8; font-size: 14px; }
  .stats { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; margin: 18px 0 8px; }
  .stat { background: rgba(148,163,184,.08); border: 1px solid rgba(148,163,184,.18);
    border-radius: 12px; padding: 10px 18px; backdrop-filter: blur(6px); }
  .stat b { color: #f8fafc; font-size: 20px; }
  .stat span { display: block; color: #94a3b8; font-size: 12px; }
  .cap { display: inline-block; margin-top: 10px; padding: 4px 12px; border-radius: 999px;
    background: rgba(244,114,182,.12); border: 1px solid rgba(244,114,182,.4); color: #f9a8d4; font-size: 12px; }
  section { margin: 30px 0; }
  h2 { font-size: 18px; border-left: 4px solid #38bdf8; padding-left: 10px; margin: 0 0 14px;
    display: flex; align-items: center; gap: 8px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
  .count { color: #94a3b8; font-size: 13px; font-weight: 400; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
  .card { background: rgba(255,255,255,.04); border: 1px solid rgba(148,163,184,.16);
    border-radius: 14px; padding: 14px 16px; backdrop-filter: blur(8px); transition: transform .15s, border-color .15s; }
  .card:hover { transform: translateY(-3px); border-color: rgba(56,189,248,.5); }
  .card-head { display: flex; justify-content: space-between; align-items: center; }
  .slug { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-size: 13px; color: #7dd3fc; }
  .tag { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: rgba(148,163,184,.12); color: #cbd5e1; }
  .tag.ok { background: rgba(94,234,212,.14); color: #5eead4; }
  .card-title { font-size: 15px; font-weight: 600; margin: 6px 0 4px; color: #f1f5f9; }
  .desc { font-size: 13px; color: #94a3b8; margin: 0; }
  .decision { background: rgba(255,255,255,.03); border: 1px solid rgba(148,163,184,.14); border-radius: 14px; overflow: hidden; }
  .row { display: flex; gap: 12px; padding: 11px 16px; border-bottom: 1px solid rgba(148,163,184,.1); }
  .row:last-child { border-bottom: none; }
  .q { flex: 1; color: #e2e8f0; font-size: 14px; }
  .a { flex: 1; color: #7dd3fc; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 13px; text-align: right; }
  footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 40px; }
  code { background: rgba(148,163,184,.12); padding: 1px 6px; border-radius: 6px; font-size: 12px; }
  @media (max-width: 640px) {
    .row { flex-direction: column; gap: 2px; }
    .a { text-align: left; }
    .grid { grid-template-columns: 1fr; }
    h1 { font-size: 24px; }
  }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>工程健康家族 · 封顶门户</h1>
    <div class="sub">零依赖单文件 CLI 家族 · 源码层 / git 层 / 配置层 / 编排层 / 展示 五形态</div>
    <div class="stats">
      <div class="stat"><b>${total}</b><span>已归档项目</span></div>
      <div class="stat"><b>${withEntry}</b><span>含可执行入口</span></div>
      <div class="stat"><b>${layerOrder.length}</b><span>治理层</span></div>
    </div>
    <div class="cap">横向切口已枯竭 · 家族封顶 · 2026-08-16</div>
  </header>

  <section>
    <h2>选型决策树</h2>
    <div class="decision">${decisionHtml}</div>
  </section>

  <section>
    <h2>家族地图</h2>
    ${cardsHtml}
  </section>

  <footer>
    由 <code>track-capped</code> 动态生成 · 扫描根: <code>${esc(root)}</code><br>
    生成时间: ${esc(generatedAt)} · 零依赖 / 零网络 / 零配置 · 数据来自本地真实归档
  </footer>
</div>
</body>
</html>`;
}

function printHelp() {
  process.stdout.write(
    'track-capped — 工程健康家族·封顶门户生成器 (v' + VERSION + ')\n\n' +
    '用法:\n' +
    '  node track-capped.js [root] [--root <dir>] [--out <file>] [--json] [--help]\n\n' +
    '参数:\n' +
    '  root / --root <dir>   要扫描的已归档目录 (默认: 当前工作目录)\n' +
    '  --out <file>          输出 HTML 路径 (默认: <root>/_family-portal.html)\n' +
    '  --json                仅输出扫描到的项目清单 JSON (不含门户)\n' +
    '  --help / -h           显示本帮助\n\n' +
    '示例:\n' +
    '  node track-capped.js "C:/Users/Administrator/Desktop/GitHub-PreStorage/当前深耕"\n' +
    '  node track-capped.js --root ./当前深耕 --out portal.html\n'
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { printHelp(); process.exit(0); }

  if (args.rootMissing) {
    process.stderr.write('错误: --root 需要一个目录参数\n');
    process.exit(2);
  }
  const root = args.root || process.cwd();
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    process.stderr.write('错误: 根目录不存在或不是目录: ' + root + '\n');
    process.exit(2);
  }

  const projects = scanProjects(root);

  if (args.json) {
    process.stdout.write(JSON.stringify({ root, count: projects.length, projects }, null, 2) + '\n');
    process.exit(0);
  }

  const html = renderPortal({
    root,
    projects,
    generatedAt: new Date().toISOString(),
  });
  const out = args.out || path.join(root, '_family-portal.html');
  fs.writeFileSync(out, html, 'utf8');
  process.stdout.write('已生成家族门户: ' + out + ' (' + projects.length + ' 个已归档项目)\n');
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { parseArgs, extractReadmeMeta, layerOf, scanProjects, renderPortal, LAYER_MAP, DECISION_TREE };
