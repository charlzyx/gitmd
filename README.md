# gitmd

一个同步 md 文件夹到 git 的小玩意

- 扫描一下文件生成一下 `vitepress` 导航
- 启动一个 vitepress server by `vitepress dev`
- 每5分钟同步一下 git `git pull --ff -> git add . -> git commit -m 'autosave' -> git push`

- 就是这样了

```
npx gitmd dir/of/docs
```
