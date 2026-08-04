Flow-CN Teleprompter v1.9.0-cn.1-beta

这是基于 Flow 的非官方 Windows 中文离线语音跟读提词器测试版。

使用方法：
1. 请先完整解压 ZIP，不要直接在压缩包内运行。
2. 双击 Flow-CN.exe，无需安装。
3. 在“设置”中选择中文（普通话）和语音跟读模式。
4. 首次加载中文模型可能需要一点时间。
5. 跟读卡住时，可以直接点击准备继续朗读的汉字，手动重新定位。
6. 如果启用了“点击穿透”，需要先关闭点击穿透才能点击文字。

便携说明：
- 稿件和设置会保存在程序文件夹下的 data 目录。
- 整个文件夹可以移动。
- 卸载时直接删除整个文件夹即可。
- 请勿只复制 Flow-CN.exe；同目录 DLL 文件是程序运行所需文件。

隐私说明：
- 中文语音识别使用本地 Vosk 模型。
- 只有主动使用 Groq AI 功能时才会发送 Groq 请求。
- 发布压缩包不含制作者的稿件、API Key 或个人设置。

项目源码：
https://github.com/ningsiii/flow-cn-teleprompter

原项目 Flow：
https://github.com/LumoRez07/Flow

本项目按照 GPL-3.0-or-later 发布；中文 Vosk 小模型按照 Apache 2.0 发布。
