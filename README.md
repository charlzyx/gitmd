# gitmd

一个同步 md 文件夹到 git 的小玩意

- 扫描一下文件生成一下 `vitepress` 导航
- 启动一个 vitepress server by `vitepress dev`
- 每5分钟同步一下 git `git pull --ff -> git add . -> git commit -m 'autosave' -> git push`

- 就是这样了

## vscode 插件
[install to vscode](https://marketplace.visualstudio.com/items?itemName=charlzyx.gitmd)

## 使用方式
1. 命令行
```
npx gitmd dir/of/docs
```

2. vscode 插件
检测打开的项目中 `gitmd.js` 文件是否存在
其实就是一个 [vitepress 的配置](https://vitepress.dev/reference/site-config)啦
```js
module.exports = {
  "title": "Chao's Memory",
  "description": "Git MarkDown Notes",
}
```
