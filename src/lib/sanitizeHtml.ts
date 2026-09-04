/**
 * Módulo de Sanitização HTML Segura (NOX Control Center V2)
 *
 * Garante que dados externos (Sentinela, DataJud, DJEN, minutas docx, intimações)
 * sejam tratados estritamente como DADOS e nunca como código executável.
 *
 * Utiliza o DOM nativo do navegador para neutralizar scripts, atributos inline (onload, onerror,
 * onclick), URIs perigosas (javascript:, data:, vbscript:) e tags maliciosas.
 */

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'strike',
  'span',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'blockquote',
  'pre',
  'code',
  'hr',
  'mark',
  'sub',
  'sup',
  'font',
  'a',
])

const ALLOWED_ATTRS = new Set([
  'style',
  'class',
  'className',
  'href',
  'target',
  'rel',
  'align',
  'color',
  'width',
  'height',
  'border',
  'cellpadding',
  'cellspacing',
  'colspan',
  'rowspan',
  'data-field',
  'data-section',
])

const FORBIDDEN_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'link',
  'meta',
  'base',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'svg',
  'math',
])

/**
 * Verifica se um protocolo ou valor de atributo é potencialmente malicioso.
 */
function isDangerousValue(value: string): boolean {
  if (!value) return false
  // Remove caracteres de controle e espaços sem disparar no-control-regex
  const clean = value
    .split('')
    .filter((ch) => ch.charCodeAt(0) > 32)
    .join('')
    .toLowerCase()

  return (
    clean.includes('javascript:') ||
    clean.includes('data:text/html') ||
    clean.includes('vbscript:') ||
    clean.includes('expression(') ||
    clean.includes('behavior:') ||
    clean.includes('-moz-binding')
  )
}

/**
 * Sanitiza recursivamente uma árvore DOM.
 */
function sanitizeNode(node: Node, doc: Document) {
  const children = Array.from(node.childNodes)

  for (const child of children) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const element = child as HTMLElement
      const tagName = element.tagName.toLowerCase()

      // Tag proibida: remove imediatamente todo o elemento e seu conteúdo
      if (FORBIDDEN_TAGS.has(tagName) || !ALLOWED_TAGS.has(tagName)) {
        // Se a tag não for permitida mas for de texto puro, preserva o textContent
        if (!FORBIDDEN_TAGS.has(tagName) && element.textContent) {
          const textNode = doc.createTextNode(element.textContent)
          node.insertBefore(textNode, element)
        }
        node.removeChild(element)
        continue
      }

      // Remove atributos perigosos ou manipuladores de eventos (on*)
      const attrs = Array.from(element.attributes)
      for (const attr of attrs) {
        const attrName = attr.name.toLowerCase()
        const attrValue = attr.value || ''

        if (
          attrName.startsWith('on') ||
          !ALLOWED_ATTRS.has(attrName) ||
          isDangerousValue(attrValue)
        ) {
          element.removeAttribute(attr.name)
          continue
        }

        // Se for link <a>, força target="_blank" e rel="noopener noreferrer"
        if (tagName === 'a' && attrName === 'href') {
          if (
            !/^https?:\/\//i.test(attrValue) &&
            !attrValue.startsWith('#') &&
            !attrValue.startsWith('mailto:')
          ) {
            element.removeAttribute('href')
          } else {
            element.setAttribute('target', '_blank')
            element.setAttribute('rel', 'noopener noreferrer')
          }
        }

        // Se for style inline, remove chamadas expression, javascript ou url perigosas
        if (attrName === 'style') {
          if (isDangerousValue(attrValue) || /url\s*\(/i.test(attrValue)) {
            element.removeAttribute('style')
          }
        }
      }

      // Processa filhos recursivamente
      sanitizeNode(element, doc)
    } else if (child.nodeType === Node.COMMENT_NODE) {
      // Remove comentários HTML
      node.removeChild(child)
    }
  }
}

/**
 * Sanitiza uma string HTML retornando HTML seguro para renderização via dangerouslySetInnerHTML.
 */
export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') {
    return ''
  }

  // Se não estiver em ambiente com DOM (ex: SSR/testes Node básicos), faz fallback defensivo
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return dirtyHtml
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
      .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/javascript:/gi, '')
  }

  try {
    const parser = new DOMParser()
    // Utiliza 'text/html' que cria um documento isolado
    const doc = parser.parseFromString(dirtyHtml, 'text/html')
    const body = doc.body

    sanitizeNode(body, doc)

    return body.innerHTML
  } catch (err) {
    console.warn('[sanitizeHtml] Erro ao sanitizar HTML, aplicando fallback de escape:', err)
    // Fallback absoluto: escapa entidades
    return dirtyHtml
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}

/**
 * Escapa texto puro para exibição segura sem interpretação HTML
 */
export function escapeHtml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
