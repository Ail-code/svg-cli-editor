# SVG 编辑器（CLI）

> 当前为初稿。已具备可运行的实现与本地测试基础，后续按实际试用、需求复核和架构讨论逐步迭代，尚未进行最终提交验收，也未打 `final` 标签。

Lab1 Phase 1：使用 TypeScript、Command 与 Composite 模式实现命令行 SVG 编辑器。

公开仓库：[Ail-code/svg-cli-editor](https://github.com/Ail-code/svg-cli-editor)。

## 运行

需要 Node.js 22.18+（或更新的 LTS 版本）与 npm。

```sh
npm install
npm run cli
```

在本机已安装依赖的目录，也可双击 `run.command` 启动终端。它优先使用系统 Node.js，
未配置时尝试当前用户目录下 Codex 的附带运行时。

也可以构建后执行：

```sh
npm run build
npm start
```

架构方案、实现过程与验收依据见 [doc/README.md](doc/README.md)。

## 示例

```text
svg> init 800 600
svg> create g node1
svg> create rect r1 100 100 160 60 blue in node1
svg> create text t1 120 135 "开始" in node1
svg> move node1 0 100
svg> undo
svg> save demo.svg
```

在浏览器里打开生成的 SVG 即可预览。输入 `help` 查看全部语法，按 Ctrl-D 退出。

回放题面的两个例子：

```sh
npm run cli < examples/basic.txt
npm run cli < examples/flowchart.txt
```

`basic.txt` 有两条故意演示错误的命令。流程图输出为 `examples/flowchart.svg`。
交互终端显示 `svg>`；管道输入省略提示符，逐行按顺序执行。

## 验证

```sh
npm ci
npm run check
```

提交前在本地运行以上检查。

六种内置图形、编辑、容器操作、撤销重做、SVG 读写均已实现。
`box` 属后续插件化阶段，本版按作业要求报未知图形类型。
