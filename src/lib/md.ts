// 写信用 Markdown：发送时转成排版好的 HTML（纯文本部分保留原文）
import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ gfm: true, breaks: true })

export function mdToHtml(md: string) {
  const body = DOMPurify.sanitize(marked.parse(md, { async: false }) as string, { USE_PROFILES: { html: true } })
  return `<div style="font-family:-apple-system,'Segoe UI','Microsoft YaHei',sans-serif;font-size:14px;line-height:1.6;color:#1F2A37">${body}</div>`
}

export function mdPreview(md: string) {
  return DOMPurify.sanitize(marked.parse(md, { async: false }) as string, { USE_PROFILES: { html: true } })
}

/** 回复时引用原文 */
export function quoteText(text: string, header: string) {
  const lines = text.split(/\r?\n/).slice(0, 200).map((l) => `> ${l}`)
  return `\n\n${header}\n${lines.join('\n')}`
}
