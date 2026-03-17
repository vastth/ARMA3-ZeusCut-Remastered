# Obsidian Kanban 插件 — 构建经验教训

> 记录首次在库中引入 Kanban 时遇到的所有错误，避免重蹈覆辙。
> 日期：2026-03-17

---

## ❌ 错误一：kanban:settings 块用了反引号包裹 JSON

### 现象
```
SyntaxError: Expected ',' or '}' after property value in JSON at position XX
```

### 根因
在 `%% kanban:settings` 和 `%%` 之间用了 Markdown 代码块语法（三个反引号）包裹 JSON：
```
%% kanban:settings
```{"kanban-plugin":"board","lane-width":280}```
%%
```
Kanban 插件读取原始文本，把反引号当作 JSON 内容来解析，导致报错。

### 正确写法
JSON 必须裸写，不加任何包裹：
```
%% kanban:settings
{"kanban-plugin":"board","lane-width":280}
%%
```

---

## ❌ 错误二：Kanban 文件内混入 Dataview 代码块

### 现象
```
SyntaxError: Unexpected token 'd', "dataview T"... is not valid JSON
```

### 根因
Kanban 插件**接管整个文件**，会将 `%% kanban:settings %%` 之后（甚至之前）的所有非标准内容尝试解析。
文件内的 ` ```dataview ``` ` 块被当作 settings 的 JSON 内容来读取，直接崩溃。

### 正确做法
Kanban 文件必须保持**纯净**，只含：
- YAML frontmatter（最小化）
- `## 列名` + `- [ ] 卡片` 结构
- 最末的 `%% kanban:settings {...} %%`

Dataview 查询必须放在**独立的配套文件**中（例如 `场次追踪表.md`）。

---

## ❌ 错误三：Frontmatter 塞了过多自定义字段

### 现象
JSON 解析失败，位置偏移量与设置 JSON 本身长度不符（说明插件读了 frontmatter 内容）。

### 根因
Kanban 文件 frontmatter 中写了 `标题: 《投名状》`、`场次: S1-2`、`layer`、`type` 等字段，
部分版本的 Kanban 插件对含有中文值或特殊字符的 YAML 字段处理异常，导致错误传递到 settings 解析阶段。

### 正确做法
Kanban 文件的 frontmatter **只保留一行**：
```yaml
---
kanban-plugin: board
---
```
其余元数据（场次号、标题等）记录在**配套的 `场次追踪表.md`** 中。

---

## ❌ 错误四：settings JSON 包含复杂 metadata-keys 配置

### 现象
第一个看板（主进度看板）在添加 `metadata-keys` 数组后报 position 265 处 JSON 错误。

### 根因
`metadata-keys` 对象数组中包含中文字符串（`"label":"场次"`），插件在该版本下对非 ASCII 字符处理不稳定。

### 正确做法
Settings JSON 保持最小化，只写必要字段：
```json
{"kanban-plugin":"board","lane-width":300}
```
高级配置（metadata-keys、list-collapse 等）应在 Obsidian UI 中通过看板设置面板配置，让插件自动生成，不要手写。

---

## ✅ 正确的 Kanban 文件结构模板

```markdown
---
kanban-plugin: board
---

## 列名一

- [ ] 卡片内容 #tag

## 列名二

- [ ] 卡片内容

%% kanban:settings
{"kanban-plugin":"board","lane-width":300}
%%
```

**关键规则速查**：
| 规则 | ✅ 正确 | ❌ 错误 |
|------|---------|---------|
| Settings JSON | 裸写在 `%% %%` 之间 | 用反引号包裹 |
| Dataview 查询 | 独立配套文件 | 写在同一 Kanban 文件 |
| Frontmatter | 只有 `kanban-plugin: board` | 加入自定义字段 |
| 复杂 Settings | 用 Obsidian UI 配置 | 手写 metadata-keys |
| 空列 | `## 列名`（空行即可） | 不需要注释占位符 |

---

## 📁 Kanban + Dataview 分离模式（已验证有效）

```
SX/SX-N/
├── 场次子看板.md      ← 纯 Kanban（工作流卡片）
└── 场次追踪表.md      ← 纯 Dataview（同步状态查询）
```

两个文件各司其职，在 Obsidian 中分别打开，互不干扰。
