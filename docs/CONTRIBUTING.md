# 贡献指南

## Git Hooks 和代码质量保护

本项目使用 Husky 和 lint-staged 来确保代码质量。

### Pre-commit Hook

在每次提交前，会自动运行：

1. **lint-staged**: 对暂存的文件运行检查和格式化
   - TypeScript 文件：类型检查 (`tsc --noEmit`) 和格式化
   - JavaScript/JSON/Markdown 文件：格式化
   - 只处理已暂存的文件，提高效率

### Pre-push Hook

在每次推送到远程仓库前，会自动运行：

1. **测试**: 运行所有包的测试 (`pnpm test`)
   - 确保所有测试通过后才能推送
   - 防止将失败的测试推送到远程仓库

### Commit Message Hook

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范验证提交信息。

#### 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type 类型

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档变更
- `style`: 代码格式（不影响代码运行的变动）
- `refactor`: 重构（既不是新增功能，也不是修复 bug）
- `perf`: 性能优化
- `test`: 增加测试
- `chore`: 构建过程或辅助工具的变动
- `revert`: 回滚
- `build`: 构建系统或外部依赖的变更
- `ci`: CI 配置文件和脚本的变更

#### 示例

```bash
# ✅ 正确
git commit -m "feat(runtime): add progress tracking support"
git commit -m "fix(cli): resolve module resolution issue"
git commit -m "docs: update README with new package names"
git commit -m "refactor: rename packages to match CLI name"

# ❌ 错误
git commit -m "update code"  # 缺少 type
git commit -m "fix: update code."  # subject 不能以句号结尾
git commit -m "FEAT: add feature"  # type 必须小写
```

#### 规则

- `type` 必须小写
- `type` 不能为空
- `subject` 不能为空
- `subject` 不能以句号结尾
- 提交信息总长度不超过 100 字符

### 手动运行

```bash
# 格式化所有文件
pnpm format

# 检查格式（不修改文件）
pnpm format:check

# 验证提交信息格式
pnpm commitlint --edit <commit-message-file>
```

### 跳过 Hooks（不推荐）

只有在特殊情况下才应该跳过 hooks：

```bash
# 跳过 pre-commit hook（不推荐）
git commit --no-verify -m "..."

# 跳过 commit-msg hook（不推荐）
git commit --no-verify -m "..."

# 跳过 pre-push hook（不推荐）
git push --no-verify
```

**注意**: 根据项目规范，应该修复问题而不是绕过 hooks。如果测试失败，应该先修复测试，然后再推送。
