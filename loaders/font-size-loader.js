import postcss from 'postcss'
import valueParser from 'postcss-value-parser'
// plugins/font-size-plugin.js
import { createFilter } from 'vite'

// Tailwind 字体大小类名映射
const TEXT_CLASS_MAP = {
  'text-xs': 'text-sm',
  'text-sm': 'text-base',
  'text-base': 'text-lg',
  'text-lg': 'text-xl',
  'text-xl': 'text-2xl',
  'text-2xl': 'text-3xl',
  'text-3xl': 'text-4xl',
  'text-4xl': 'text-5xl',
  // 其他映射...
  '12px': '16px',
  '14px': '18px',
  '16px': '20px',
  '18px': '24px',
  '20px': '28px',
  '24px': '32px',
  '28px': '36px',
}

// 增加字体大小的辅助函数
function increaseFontSize(value) {
  if (typeof value !== 'string') return value

  if (value.endsWith('px')) {
    return `${Number.parseFloat(value) + 6}px`
  }

  if (value.endsWith('rem')) {
    return `${Number.parseFloat(value) + 0.5}rem`
  }

  return value
}

export default function fontSizePlugin(options = {}) {
  const {
    include = /\.(css|scss|sass|less|styl)$/,
    exclude = /node_modules/,
    enabled = true,
  } = options

  const filter = createFilter(include, exclude)

  return {
    name: 'font-size-plugin',

    // 转换 CSS 内容
    transform(code, id) {
      if (!enabled || !filter(id)) return null
      console.log('[font-size-plugin] 处理文件:', id)

      return postcss([
        // 处理传统 CSS 中的 font-size 属性
        postcss.plugin('css-font-adjuster', () => (root) => {
          root.walkDecls((decl) => {
            if (['font', 'font-size'].includes(decl.prop)) {
              const parsedValue = valueParser(decl.value)

              parsedValue.walk((node) => {
                if (node.type === 'word') {
                  node.value = increaseFontSize(node.value)
                }
              })

              decl.value = parsedValue.toString()
            }
          })
        }),

        // 处理 Tailwind 类名
        postcss.plugin('tailwind-class-adjuster', () => (root) => {
          root.walkRules((rule) => {
            rule.selector = rule.selector.replaceAll(
              /(text-[a-z0-9-]+)/g,
              (match) => TEXT_CLASS_MAP[match] || match,
            )
          })
        }),
      ])
        .process(code, { from: id })
        .then((result) => ({
          code: result.css,
          map: result.map, // 可选：保留 source map
        }))
        .catch((error) => {
          console.error('[font-size-plugin] 处理失败:', error)
          return { code } // 出错时返回原始代码
        })
    },
  }
}
