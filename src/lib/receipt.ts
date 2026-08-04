const MAX_RECEIPT_BYTES = 400_000

export async function readReceiptFile(file: File): Promise<{
  dataUrl: string
  fileName: string
}> {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일(JPG, PNG, WebP)만 첨부할 수 있습니다.')
  }

  const raw = await compressImage(file, 1200, 0.72)
  if (raw.length > MAX_RECEIPT_BYTES) {
    throw new Error('영수증 이미지가 너무 큽니다. 더 작은 사진을 사용해 주세요.')
  }

  return { dataUrl: raw, fileName: file.name }
}

function compressImage(file: File, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('이미지 처리에 실패했습니다.'))
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'))
    reader.readAsDataURL(file)
  })
}
