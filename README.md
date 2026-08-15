# track-capped · 工程健康家族封顶门户生成器

零依赖单文件 Node CLI，扫描本地已归档的 family 工具目录，动态生成一张自包含导航门户 HTML（家族地图 + 选型决策树 + 已归档清单）。它是工程健康家族（17 轴 + 编排层 enghealth + 展示站 family-showcase）横向封顶后的**实战闭环**：数据来自你桌面的真实归档，而非硬编码展示。

## 为什么需要它

family 十七件套 + 编排层 + 展示站分散在桌面不同日期目录，没有一个"动态总入口"把它们串起来。`family-showcase` 是硬编码静态展示（与本地真实归档脱节），`track-capped` 则是**动态版**——扫你真实目录，重跑即更新。

## 设计纪律（沿用 family 范式）

- 零依赖、零网络、零配置，纯 `fs` 只读，输出单文件 HTML（无任何外部请求 / CDN）。
- 面向用户输出禁用 emoji，只用纯文本。
- `--json` 模式只输出纯 JSON，门禁结果用退出码表达，绝不向 stdout 写额外文本。
- 路径参数 `statSync` 先验存在性与是否为目录，避免对错误路径谎报通过。

## 安装 / 运行

```bash
node track-capped.js [root] [--root <dir>] [--out <file>] [--json] [--help]
```

- `root` / `--root <dir>`：要扫描的已归档目录（默认当前工作目录）
- `--out <file>`：输出 HTML 路径（默认 `<root>/_family-portal.html`）
- `--json`：仅输出扫描到的项目清单 JSON（不含门户）

## 示例

```bash
# 扫桌面"当前深耕"（本地归档的 doctor）
node track-capped.js "C:/Users/Administrator/Desktop/GitHub-PreStorage/当前深耕"

# 扫已上架家族的代码快照归档
node track-capped.js --root "C:/Users/Administrator/Desktop/GitHub-PreStorage/项目归档/工程健康家族" --out family.html

# 仅看扫描到的项目清单（CI / 脚本用）
node track-capped.js --root ./当前深耕 --json
```

## 门户内容

- **选型决策树**："我想排查 X → 用 Y"，17 条排查场景映射到对应 doctor。
- **家族地图**：按治理层分组（源码层 / git 层 / 配置层 / 编排层 / 展示）——每个已归档项目一张卡片（slug / 标题 / 描述 / 是否含可执行入口）。
- **统计**：已归档项数、含入口项数、治理层数 + 封顶标记。

## 测试

```bash
node test.js
```

## 家族封顶说明

截至 2026-08-16，工程健康家族已覆盖 SonarQube TOP 全部静态坏味道 + git 四件套 + 配置层 + 编排 + 展示五形态。经 WebSearch 验证，err / file-hygiene / i18n / timezone / CI 五类新轴均被免费工具（aislop / wssweep / localediff / timeloc / pipechecker 等）占满，违反"比竞品更好或市场压根无"硬标准。候选池（nono / Book-to-Skill / formlite / Jay / SkillForge）全部偏离零依赖基线。至此横向切口枯竭，`track-capped` 作为家族阶段的封装终点。
