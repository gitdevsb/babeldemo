import postcss from 'postcss'
import valueParser from 'postcss-value-parser'
import { createFilter } from 'vite'

// 扩展Tailwind字体大小类名映射（包含响应式）
const TEXT_CLASS_MAP = {
  'text-xs': 'text-sm',
  'text-sm': 'text-base',
  'text-base': 'text-lg',
  'text-lg': 'text-xl',
  'text-xl': 'text-2xl',
  'text-2xl': 'text-3xl',
  'text-3xl': 'text-4xl',
  'text-4xl': 'text-5xl',
  'text-5xl': 'text-6xl',
  // 响应式类名映射
  'lg:text-xs': 'lg:text-sm',
  'lg:text-sm': 'lg:text-base',
  'lg:text-base': 'lg:text-lg',
  'lg:text-lg': 'lg:text-xl',
  'lg:text-xl': 'lg:text-2xl',
  'lg:text-2xl': 'lg:text-3xl',
  'lg:text-3xl': 'lg:text-4xl',
  'lg:text-4xl': 'lg:text-5xl',
  'lg:text-5xl': 'lg:text-6xl',
  // 行高类映射
  'leading-3': 'leading-4',
  'leading-4': 'leading-5',
  'leading-5': 'leading-6',
  'leading-6': 'leading-7',
  'leading-7': 'leading-8',
  'leading-8': 'leading-9',
  'leading-9': 'leading-10',
  'leading-10': 'leading-none',
  // 其他尺寸单位映射
  '12px': '16px',
  '14px': '18px',
  '16px': '20px',
  '18px': '24px',
  '20px': '28px',
  '24px': '32px',
  '28px': '36px',
}

// 智能增加字体大小的辅助函数
function increaseFontSize(value) {
  if (typeof value !== 'string') return value

  // 按比例缩放（非固定增量）
  const scaleFactor = 1.2

  // 处理px单位
  if (value.endsWith('px')) {
    const pxVal = parseFloat(value)
    return pxVal >= 12 ? `${Math.round(pxVal * scaleFactor)}px` : value
  }

  // 处理rem单位
  if (value.endsWith('rem')) {
    const remVal = parseFloat(value)
    return remVal >= 0.75 ? `${(remVal * scaleFactor).toFixed(4)}rem` : value
  }

  // Tailwind类名转换（如text-3xl -> text-4xl）
  if (value in TEXT_CLASS_MAP) {
    return TEXT_CLASS_MAP[value]
  }

  return value
}

export default function fontSizePlugin(options = {}) {
  const {
    include = /\.(css|scss|sass|less|styl|vue)$/, // 增加vue文件支持
    exclude = /node_modules/,
    enabled = true,
  } = options

  const filter = createFilter(include, exclude)

  return {
    name: 'font-size-plugin',

    // 转换CSS内容
    transform(code, id) {
      if (!enabled || !filter(id)) return null
      console.log('[font-size-plugin] 处理文件:', id)

      return postcss([
        // 处理传统CSS属性（扩展属性范围）
        postcss.plugin('css-property-adjuster', () => (root) => {
          const affectedProps = ['font', 'font-size', 'line-height', 'font-weight']
          
          root.walkDecls((decl) => {
            // 处理font简写属性
            if (decl.prop === 'font') {
              const parsed = valueParser(decl.value)
              let foundSize = false
              
              parsed.walk(node => {
                if (node.type === 'word' && /^\d+(px|rem)$/.test(node.value)) {
                  node.value = increaseFontSize(node.value)
                  foundSize = true
                }
              })
              
              if (foundSize) {
                decl.value = parsed.toString()
              }
              return
            }
            
            // 处理其他字体相关属性
            if (affectedProps.includes(decl.prop)) {
              const parsedValue = valueParser(decl.value)
              let modified = false
              
              parsedValue.walk((node) => {
                if (node.type === 'word') {
                  const newValue = increaseFontSize(node.value)
                  if (newValue !== node.value) {
                    node.value = newValue
                    modified = true
                  }
                }
              })
              
              if (modified) {
                decl.value = parsedValue.toString()
              }
            }
          })
        }),

        // 重构Tailwind类名处理器（支持响应式）
        postcss.plugin('tailwind-class-adjuster', () => (root) => {
          root.walkRules((rule) => {
            // 重构正则：匹配响应式前缀(text-xxx或lg:text-xxx)
            rule.selector = rule.selector.replace(
              /(\S+:)?(text-(xs|sm|base|lg|xl|[0-9]?xl))\b/g, 
              (_, prefix, match) => {
                const fullClass = prefix ? prefix + match : match
                return prefix 
                  ? prefix + (TEXT_CLASS_MAP[match] || match) 
                  : TEXT_CLASS_MAP[fullClass] || fullClass
              }
            )
            
            // 额外处理行高类（如leading-9 -> leading-10）
            rule.selector = rule.selector.replace(
              /(\S+:)?(leading-[0-9]+)/g, 
              (_, prefix, match) => {
                const num = match.replace('leading-', '')
                if (!isNaN(num)) {
                  const newNum = Math.min(12, Math.max(3, parseInt(num) + 1))
                  return (prefix || '') + `leading-${newNum}`
                }
                return match
              }
            )
          })
        }),
      ])
        .process(code, { from: id })
        .then((result) => ({
          code: result.css,
          map: result.map, 
        }))
        .catch((error) => {
          console.error('[font-size-plugin] 处理失败:', error)
          return { code } 
        })
    },
  }
}