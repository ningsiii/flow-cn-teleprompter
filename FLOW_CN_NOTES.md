# Flow-CN 中文跟读版

本项目基于 Flow 1.9.0 的提交 `f95ea8bef9807c96d28277c0b1add032048b5c7b`。
上游 `v1.9.0` 标签实际指向内部版本 1.8.3，因此这里使用并记录明确提交号。
Flow-CN 使用独立应用标识和数据目录，不会覆盖已安装的原版 Flow；自动更新源也已与上游隔离，避免未来更新覆盖中文改造。

## 第一版范围

- 增加 `zh-CN` 普通话语音选项。
- 支持下载 Vosk 42 MB 中文小模型和 1.3 GB 中文大模型。
- 连续中文按汉字生成高亮节点，英文和数字保持词级节点。
- Vosk 输出和稿件采用相同的汉字粒度。
- 当前行附近支持漏字、多字和错字的局部模糊匹配。

## 本地验证

```powershell
npm.cmd install
npm.cmd test
npm.cmd run tauri dev
```

Windows 编译 Tauri/Rust 版本需要 Visual Studio Build Tools 2022 的 C++ 构建工具。
