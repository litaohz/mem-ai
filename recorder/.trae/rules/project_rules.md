# 项目开发规则

## 测试和验证
- After completing a task, the user should test it themselves since this is a Proof of Concept (PoC) rather than production code. This allows for rapid iteration and validation of core functionality without the overhead of formal testing procedures.

## 服务器管理
- **绝对不要自动启动服务器**。用户偏好自己手动启动和管理服务器。
- Do not start the server automatically. This gives developers more control over their local environment and prevents interference with their development workflow.
- 用户通常会自己启动服务器，AI助手应该专注于代码修改和功能实现，而不是服务器管理。
- 如果需要验证功能，可以提供启动命令建议，但不要执行。

## 开发流程
- 用户希望保持对本地开发环境的完全控制
- 这是一个PoC项目，快速迭代比完美的自动化更重要
- 优先考虑功能实现和代码质量，而不是自动化部署
