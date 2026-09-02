/**
 * Utilitário para ler arquivos DOCX no navegador sem dependências pesadas externas.
 * Um arquivo .docx é um arquivo ZIP contendo 'word/document.xml'.
 * Usamos a API nativa do navegador DecompressionStream('deflate-raw') para ler arquivos zip não comprimidos/deflated,
 * ou fallback com extração direta de XML / texto de strings UTF-8.
 */

// Extrai o texto e estrutura XML de um arquivo .docx
export async function parseDocxFile(file: File): Promise<{ text: string; html: string }> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const xmlContent = await extractDocumentXmlFromZip(arrayBuffer)
    if (xmlContent) {
      return convertWordXmlToHtml(xmlContent)
    }
  } catch (err) {
    console.warn(
      '[parseDocxFile] Falha ao descompactar DOCX nativamente, tentando modo texto:',
      err,
    )
  }

  // Fallback: tentar ler como texto simples se o arquivo for texto puro ou extrair blocos de texto
  try {
    const text = await file.text()
    if (text.includes('<?xml') || text.includes('<w:document')) {
      return convertWordXmlToHtml(text)
    }
    // Texto simples
    return {
      text,
      html: textToFormattedHtml(text),
    }
  } catch {
    throw new Error(
      'Não foi possível ler o arquivo. Certifique-se de que é um arquivo .docx ou texto válido.',
    )
  }
}

/**
 * Descompacta o arquivo zip na memória procurando word/document.xml
 * Suporta ZIP Store (sem compressão) e Deflate (usando DecompressionStream nativo da Web).
 */
async function extractDocumentXmlFromZip(buffer: ArrayBuffer): Promise<string | null> {
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)
  let offset = 0

  // Percorre as entradas do ZIP (Local File Headers: 0x04034b50)
  while (offset + 30 < bytes.length) {
    const signature = view.getUint32(offset, true)
    if (signature !== 0x04034b50) {
      // Procura próxima assinatura se estiver desalinhado
      const nextSig = findNextZipHeader(bytes, offset + 1)
      if (nextSig === -1) break
      offset = nextSig
      continue
    }

    const compressionMethod = view.getUint16(offset + 8, true)
    const compressedSize = view.getUint32(offset + 18, true)
    const uncompressedSize = view.getUint32(offset + 22, true)
    const fileNameLength = view.getUint16(offset + 26, true)
    const extraFieldLength = view.getUint16(offset + 28, true)

    const fileNameBytes = bytes.subarray(offset + 30, offset + 30 + fileNameLength)
    const fileName = new TextDecoder('utf-8').decode(fileNameBytes)

    const dataOffset = offset + 30 + fileNameLength + extraFieldLength
    const compressedData = bytes.subarray(dataOffset, dataOffset + compressedSize)

    if (fileName === 'word/document.xml' || fileName.endsWith('/document.xml')) {
      if (compressionMethod === 0) {
        // Sem compressão (Store)
        return new TextDecoder('utf-8').decode(compressedData)
      } else if (compressionMethod === 8) {
        // Deflate
        const decompressed = await decompressDeflateRaw(compressedData)
        return new TextDecoder('utf-8').decode(decompressed)
      }
    }

    offset = dataOffset + compressedSize
  }

  // Se não achou pelos headers locais, busca padrões de XML no buffer
  const fallbackStr = new TextDecoder('latin1').decode(bytes)
  const docStart = fallbackStr.indexOf('<w:document')
  const docEnd = fallbackStr.indexOf('</w:document>')
  if (docStart !== -1 && docEnd !== -1 && docEnd > docStart) {
    const xml = fallbackStr.substring(docStart, docEnd + 13)
    return xml
  }

  return null
}

function findNextZipHeader(bytes: Uint8Array, startOffset: number): number {
  for (let i = startOffset; i < bytes.length - 4; i++) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x03 &&
      bytes[i + 3] === 0x04
    ) {
      return i
    }
  }
  return -1
}

/**
 * Descompressão Deflate Raw via Web Streams API nativa do navegador
 */
async function decompressDeflateRaw(compressedBytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream !== 'undefined') {
    // Garantir ArrayBuffer isolado não compartilhado para compatibilidade de tipos TS
    const safeBuffer = compressedBytes.slice().buffer as ArrayBuffer
    try {
      const ds = new DecompressionStream('deflate-raw')
      const writer = ds.writable.getWriter()
      writer.write(new Uint8Array(safeBuffer))
      writer.close()
      const response = new Response(ds.readable)
      const arrayBuf = await response.arrayBuffer()
      return new Uint8Array(arrayBuf)
    } catch {
      // Tentar com deflate padrão (com zlib header)
      try {
        const ds2 = new DecompressionStream('deflate')
        const writer2 = ds2.writable.getWriter()
        writer2.write(new Uint8Array(safeBuffer))
        writer2.close()
        const response2 = new Response(ds2.readable)
        const arrayBuf2 = await response2.arrayBuffer()
        return new Uint8Array(arrayBuf2)
      } catch {
        /* fallback */
      }
    }
  }

  throw new Error('Decompressão Deflate não suportada nativamente.')
}

/**
 * Converte XML WordprocessingML do DOCX para HTML limpo preservando títulos, parágrafos, negrito, itálico e alinhamento.
 */
export function convertWordXmlToHtml(xmlContent: string): { text: string; html: string } {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlContent, 'application/xml')

    const paragraphs = doc.getElementsByTagName('w:p')
    const htmlBlocks: string[] = []
    const textLines: string[] = []

    if (paragraphs.length === 0) {
      // Fallback: extrair todo w:t por regex
      const textMatches = xmlContent.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || []
      const plain = textMatches.map((m) => m.replace(/<[^>]+>/g, '')).join(' ')
      return {
        text: plain,
        html: textToFormattedHtml(plain),
      }
    }

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i]

      // Checa alinhamento
      const jcElem = p.getElementsByTagName('w:jc')[0]
      let align = 'justify'
      if (jcElem) {
        const val = jcElem.getAttribute('w:val') || ''
        if (val === 'center') align = 'center'
        else if (val === 'right') align = 'right'
        else if (val === 'left') align = 'left'
        else if (val === 'both' || val === 'distribute') align = 'justify'
      }

      // Checa se é título (heading)
      const pStyleElem = p.getElementsByTagName('w:pStyle')[0]
      const styleVal = (pStyleElem?.getAttribute('w:val') || '').toLowerCase()
      const isTitle =
        styleVal.includes('heading') || styleVal.includes('titulo') || styleVal.includes('title')

      // Coleta os runs (w:r)
      const runs = p.getElementsByTagName('w:r')
      let pText = ''
      let pHtml = ''

      for (let j = 0; j < runs.length; j++) {
        const r = runs[j]
        const isBold = r.getElementsByTagName('w:b').length > 0
        const isItalic = r.getElementsByTagName('w:i').length > 0
        const isUnderline = r.getElementsByTagName('w:u').length > 0

        const textElems = r.getElementsByTagName('w:t')
        let runText = ''
        for (let k = 0; k < textElems.length; k++) {
          runText += textElems[k].textContent || ''
        }

        if (runText) {
          pText += runText
          let formattedChunk = escapeHtml(runText)
          if (isBold) formattedChunk = `<strong>${formattedChunk}</strong>`
          if (isItalic) formattedChunk = `<em>${formattedChunk}</em>`
          if (isUnderline) formattedChunk = `<u>${formattedChunk}</u>`
          pHtml += formattedChunk
        }
      }

      if (pText.trim().length > 0) {
        textLines.push(pText.trim())
        if (isTitle) {
          htmlBlocks.push(
            `<h2 style="text-align:${align};font-size:15px;font-weight:bold;margin-top:16px;margin-bottom:12px;text-transform:uppercase;">${pHtml}</h2>`,
          )
        } else {
          htmlBlocks.push(
            `<p style="margin-bottom:12px;line-height:1.8;text-align:${align};">${pHtml}</p>`,
          )
        }
      }
    }

    return {
      text: textLines.join('\n\n'),
      html:
        htmlBlocks.length > 0 ? htmlBlocks.join('\n') : textToFormattedHtml(textLines.join('\n\n')),
    }
  } catch (err) {
    console.warn('[convertWordXmlToHtml] Erro ao converter XML:', err)
    // Extração pura de regex
    const plain = xmlContent
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return {
      text: plain,
      html: textToFormattedHtml(plain),
    }
  }
}

/**
 * Converte texto simples para HTML mantendo parágrafos e títulos identificados
 */
export function textToFormattedHtml(rawText: string): string {
  if (!rawText || !rawText.trim()) return ''

  const lines = rawText.split(/\r?\n/)
  const paragraphs: string[] = []
  let currentP: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (currentP.length > 0) {
        paragraphs.push(currentP.join(' '))
        currentP = []
      }
    } else {
      currentP.push(escapeHtml(trimmed))
    }
  }
  if (currentP.length > 0) {
    paragraphs.push(currentP.join(' '))
  }

  return paragraphs
    .map((p) => {
      // Se for todo em caixa alta ou curto com estilo de cabeçalho
      if (p.length < 90 && p === p.toUpperCase() && !p.includes('.')) {
        return `<h1 style="text-align:center;font-size:15px;font-weight:bold;margin-bottom:18px;text-transform:uppercase;">${p}</h1>`
      }
      return `<p style="margin-bottom:12px;line-height:1.8;text-align:justify;">${p}</p>`
    })
    .join('\n')
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
