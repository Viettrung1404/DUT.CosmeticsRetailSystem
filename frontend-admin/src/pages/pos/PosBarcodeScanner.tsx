import { Alert, Button, Modal, Space, Typography } from 'antd'
import { useEffect, useRef, useState } from 'react'

type DetectedBarcode = { rawValue: string }
type NativeDetector = { detect: (video: HTMLVideoElement) => Promise<DetectedBarcode[]> }
type DetectorConstructor = new (options: { formats: string[] }) => NativeDetector

type Props = {
  open: boolean
  onClose: () => void
  onDetected: (barcode: string) => void
}

export default function PosBarcodeScanner({ open, onClose, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    let stream: MediaStream | null = null
    let timeout: ReturnType<typeof setTimeout> | undefined
    const Detector = (window as Window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector
    const start = async () => {
      if (!Detector) {
        setError('Trình duyệt không hỗ trợ BarcodeDetector. Dùng Chrome/Edge phiên bản có hỗ trợ hoặc nhập mã thủ công.')
        return
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Cần HTTPS hoặc localhost và trình duyệt cho phép truy cập camera.')
        return
      }
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: 'environment' },
        })
        if (cancelled) {
          media.getTracks().forEach(track => track.stop())
          return
        }
        stream = media
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        setReady(true)
        const detector = new Detector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'],
        })
        const scan = async () => {
          if (cancelled) return
          try {
            const values = await detector.detect(video)
            if (values[0]?.rawValue) {
              cancelled = true
              onDetected(values[0].rawValue)
              return
            }
          } catch {
            // Camera có thể chưa lấy được frame trong lúc khởi động.
          }
          if (!cancelled) timeout = setTimeout(() => { void scan() }, 250)
        }
        void scan()
      } catch {
        setError('Không mở được camera. Hãy cấp quyền camera và thử lại, hoặc nhập barcode thủ công.')
      }
    }
    setReady(false)
    setError('')
    void start()
    return () => {
      cancelled = true
      if (timeout) clearTimeout(timeout)
      stream?.getTracks().forEach(track => track.stop())
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [open, onDetected])

  return (
    <Modal title="Quét mã vạch sản phẩm" open={open} onCancel={onClose} footer={<Button onClick={onClose}>Đóng camera</Button>} destroyOnHidden>
      <Space direction="vertical" style={{ width: '100%' }}>
        {error && <Alert type="warning" showIcon message={error} />}
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: 12, background: '#111827' }} />
        {!ready && !error && <Typography.Text type="secondary">Đang khởi động camera…</Typography.Text>}
        <Typography.Text type="secondary">Đưa mã vạch vào giữa khung hình. Bạn có thể nhập barcode thủ công tại màn hình POS.</Typography.Text>
      </Space>
    </Modal>
  )
}
