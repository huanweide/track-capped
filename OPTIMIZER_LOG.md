# OPTIMIZER_LOG

## Round 1 — 2026-10-15

**方向**：单点深度特化 —— 让「动态门户」这一唯一卖点可信。

### 决策原因

先在家族里选门面层仓库做，机制改动可被下游 23 个成员复用，沿用已沉淀的四维快扫 + 三类共性缺陷套路。

存活评估结论：**保留**。本工具与 `family-showcase` 互补（一个扫真实归档、一个硬编码全景），家族内自闭环有真实场景，无碾压级替代。

### 抓到的真缺陷

**P0：两张手工维护的清单表之间没有任何一致性约束 —— 这就是本仓库存在的根本原因。**

`LAYER_MAP`（治理层分类）与 `DECISION_TREE`（选型决策树）其实是同一份家族清单的两种视图，但：

- `LAYER_MAP` 漏分 `licguard` / `chaineye` / `ghadoctor` 三个已发布成员
- `DECISION_TREE` 漏 `ghadoctor` 的选型入口、漏整个展示层入口
- 结果：扫到这三个目录时，工具把它们静默归入「未分类」，用户完全看不出「这是家族成员」还是「我扫错目录了」
- 而 README 里「17 轴」的说法和代码里的 21 轴也对不上

这不是文档问题，是**唯一卖点（可信的动态门户）本身失真**。

### 具体改动

| # | 改动 | 位置 |
| --- | --- | --- |
| 1 | 新增 `auditSelf()`：两表双向覆盖 + slug 去重 | `index.js` |
| 2 | 新增 `--check` 模式，漂移时退出码 `3` | `index.js` |
| 3 | `LAYER_MAP` 补 `依赖与结构层`（licguard/chaineye），配置层补 ghadoctor | `index.js` |
| 4 | `DECISION_TREE` 补 4 条（licguard / chaineye / ghadoctor / 展示层） | `index.js` |
| 5 | 门户页新增自检徽标 + 「家族轴数」统计卡 | `index.js` |
| 6 | 门户页新增未分类目录告警块 | `index.js` |
| 7 | 帮助文本入口名 `track-capped.js` → `index.js`，示例去本机路径 | `index.js` |
| 8 | 新增 `scripts/smoke-cli.js`（13 断言，含零外部请求正则扫描） | `scripts/` |
| 9 | 新增 `verify.yml`：ubuntu + windows 双平台 × (单测 → check → 冒烟) | `.github/workflows/` |
| 10 | 补 MIT LICENSE；`.gitignore` 补 `.env`/密钥/证书禁入 | 根目录 |
| 11 | README 全文重写 | `README.md` |
| 12 | 测试 14 → 18 项 | `test.js` |

### README 的说谎段

原文整段「CI 门禁用法」写道：「在流水线中运行本工具，它会输出健康分与严重度；若存在不达标项会以非 0 退出码」—— 这是从体检 CLI 模板复制来的。本工具**从不输出健康分，也从不因质量问题非 0 退出**（除了路径错误）。留着会让 CI 接入者以为接了个扫描门禁，实际上什么也没接。已删除并替换为真实的 `--check` 语义说明。

### 核验

```
node --test test.js        -> 18/18 pass
node index.js --check       -> 家族清单自检通过: 23 轴, rc=0
node scripts/smoke-cli.js   -> 13/13 断言, 产物自包含且零外部请求, rc=0
```

### 变异测试（对新门禁的信任来自这里）

| 变异 | 期望 | 实测 |
| --- | --- | --- |
| 注入 `<script src="https://cdn...">` 外链 | 冒烟红 | rc=1 ✓ |
| 去掉未分类告警块 | 冒烟红 | rc=1 ✓ |
| 决策树漏掉 ghadoctor 一条 | `--check` 红 | rc=3 ✓ |

3/3 全部拦下。**没做变异测试的门禁不算门禁**——否则又是一个假 CI。

### 自身错误与倾向记录

1. **池状态误判**：首次用 `gh api ... -q .sha 2>/dev/null` 判断标记文件是否存在，API 返回 404 时静默输出空串，于是把「无标记」误读成「已标记」，差点跳过 24 个未优化仓库。教训：判断存在性必须显式检查 HTTP 状态码，不能依赖静默失败。
2. **`git reset --hard` 误清改动**：为对齐远端历史执行了 `git reset --hard`，把刚改完的 `index.js` / `README.md` / `test.js` 全清回原版（新建的 CI/脚本/LICENSE 侥幸未受影响）。教训：tarball 落地 + `git init` 的工作流里，`reset --hard` 之前必须先确认改动已提交或已备份。
3. **脚本切片 marker 选错**：用 python 按 marker 切片替换 JS 常量块时，marker 出现在被替换区间内部，导致 `DECISION_TREE` 被整段吞掉。好在脚本带 `assert s != orig` 且中途抛错，没有静默写坏文件。教训：批量文本替换必须带断言，且替换后立即跑一次语法/自检。