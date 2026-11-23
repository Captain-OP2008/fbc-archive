# 联邦控制局 · 内部档案终端

《控制》（Control，Remedy Entertainment，2019）的**非官方中文粉丝档案站**。

网站以游戏中的联邦控制局（FBC）内部档案终端为形态：野兽派混凝土、瑞士网格排版、官僚文书腔、CRT 噪点。全部内容为纯静态实现，无构建步骤、无外部依赖、无运行时网络请求。

## 在线访问

https://captain-op2008.github.io/fbc-archive/

## 本地打开

直接双击 `index.html` 即可（`file://` 可用）。也可以用任意静态服务器：

```bash
python -m http.server 8000
# 打开 http://localhost:8000
```

## 目录结构

```
index.html              站点入口（单页）
assets/
  css/                  基础、布局、组件、分区、特效样式
  js/                   数据（data/extra）、渲染、交互、档案题材文案
  audio/                环境音（ambience.m4a / ambience.wav）
  tiles/                地图瓦片（webp）
research/               设定考据笔记（中文）
tools/make_ambience.py  环境音生成脚本
CONTENT-BRIEF.md        内容与写作约定
```

## 声明

- 非官方粉丝作品，与 Remedy Entertainment 及其关联方无隶属关系，未获其授权或背书。
- 《控制》及其角色、世界观设定、图像与音频素材的相关权利归 Remedy Entertainment 所有。
- 本仓库仅用于学习与同人创作交流，不作商业用途。
