# track-capped · 工程健康家族封顶门户生成器

零依赖单文件 Node CLI。扫描本地已归档的工程健康家族目录，动态生成一张**自包含**导航门户 HTML（家族地图 + 选型决策树 + 已归档清单 + 清单自检徽标）。

数据来自你磁盘上的真实归档，而不是硬编码的展示数据——重跑一次，门户即更新。

- 零依赖 / 零网络 / 零配置，纯 `fs` 只读
- 产物单文件 HTML，**零外部请求**（无 CDN / 远程字体 / 外链脚本，CI 有断言守着这条线）
- 跨平台：Linux + Windows 双平台 CI 验证

## 快速开始

零依赖，无需安装，直接跑：

```bash
node index.js ./当前深耕                    # 生成 ./当前深耕/_family-portal.html
node index.js --root ./当前深耕 --out portal.html
node index.js --check                      # 家族清单自检（CI 门禁用）
node index.js --root ./当前深耕 --json      # 只输出扫描结果 JSON
node index.js --help
```

扫描根目录下**每个子目录**即视为一个家族项目：读其 `README.md` 取标题与首段描述，判断是否含 `index.js` / `index.html` 入口，并按内置治理层分类表归层。

## 参数

| 参数 | 说明 |
| --- | --- |
| `root` / `--root <dir>` | 要扫描的已归档目录（默认当前工作目录）。不存在或不是目录时退出码 `2` |
| `--out <file>` | 输出 HTML 路径（默认 `<root>/_family-portal.html`） |
| `--json` | 仅输出扫描到的项目清单 JSON，绝不混入其他文本 |
| `--check` | 家族清单一致性自检；有漂移时退出码 `3` |
| `--help` / `-h` | 帮助 |

退出码约定：`0` 成功 · `2` 参数/路径错误 · `3` 清单自检失败。

## 为什么需要它

家族二十余个成员散落在桌面不同日期目录，缺一个动态总入口把它们串起来。静态展示站会与真实归档脱节；本工具扫真实目录，重跑即更新。

## 清单一致性门禁（`--check`）

本工具内置两张手工维护的表：`LAYER_MAP`（治理层分类）与 `DECISION_TREE`（选型决策树）。它们其实是同一份家族清单的两种视图——历史上真实发生过「新增了轴，决策树补了但分类表没补」的漂移，后果是该轴被静默归入「未分类」，用户无从察觉。

`--check` 把这种漂移变成确定性失败：两表必须双向覆盖、slug 不得重复定义。因此**家族新增轴时必须同时更新两表**，漏改即 CI 红灯。门户页顶部也会显示自检徽标与家族轴数。

## 设计纪律

- CLI 面向用户输出禁用 emoji，只用纯文本
- `--json` 只输出纯 JSON，门禁结果用退出码表达，绝不向 stdout 写额外文本
- 路径参数先验存在性与是否为目录，避免对错误路径谎报通过
- 门户中「未分类」目录会被显式告警，而不是静默丢弃

## 测试

```bash
node --test test.js        # 18 项单测
node scripts/smoke-cli.js  # 13 项端到端断言，含产物零外部请求检查
```

CI（`.github/workflows/verify.yml`）在 ubuntu + windows 双平台依次跑：单测 → `--check` 自检 → 端到端冒烟。

## 家族封顶说明

截至 2026-08-16，工程健康家族横向切口已枯竭：SonarQube TOP 静态坏味道、git 四件套、依赖与结构、配置层、编排层、展示层均已覆盖；err / file-hygiene / i18n / timezone / CI 五类新轴均被免费工具占满。`track-capped` 作为家族阶段的封装终点。

## 作者

由 **ReTr · 樊斯瑞** 维护 · [GitHub 主页](https://github.com/huanweide)

## 赞助支持

如果这个项目帮到了你，欢迎 [点 Star](https://github.com/huanweide/track-capped) 支持；也可微信扫码自愿赞助（收款码见 `sponsor/wechat-qr.png`，作者本人带 Tri 水印的码，纯静态图片、不含任何密钥）。

## 许可证

[MIT](LICENSE)