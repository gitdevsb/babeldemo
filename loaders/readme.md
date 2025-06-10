
### 全局放大或者缩小字号Loaders demo

### monorepo中，在项目目录下配置即可vite.config.js
```js
import fontSizePlugin from './loaders/font-size-loader'

fontSizePlugin({
    enabled: true, // 是否启用插件
}),
`
