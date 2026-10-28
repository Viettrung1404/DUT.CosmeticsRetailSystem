"use client";
import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { z } from "zod";
import { readBff } from "@/shared/api/browser";

const lipOuter = [
  61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146,
];
const lipInner = [
  78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95,
];
type Swatch = { variantId: string; label: string; colorHex: string | null };
const tryOnColorsSchema = z.array(
  z.object({ variantId: z.string(), label: z.string(), colorHex: z.string().nullable() }),
);
function traceLip(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  indices: number[],
  width: number,
  height: number,
) {
  indices.forEach((index, offset) => {
    const point = points[index];
    if (!point) return;
    const x = (1 - point.x) * width,
      y = point.y * height;
    if (offset === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}
export function TryOnCamera({ productId, variantId }: { productId: string; variantId?: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [swatches, setSwatches] = useState<Swatch[]>([]);
  const [selected, setSelected] = useState(variantId || "");
  const [manualColor, setManualColor] = useState("#C85A70");
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const landmarker = useRef<FaceLandmarker | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const frame = useRef(0);
  const lastTime = useRef(-1);
  const landmarks = useRef<{ x: number; y: number }[] | null>(null);
  const color = useRef(manualColor);
  const shade = swatches.find((item) => item.variantId === selected);
  const previewColor = shade?.colorHex || manualColor;
  useEffect(() => {
    color.current = previewColor;
  }, [previewColor]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    readBff(
      `/api/catalog/try-on?productId=${encodeURIComponent(productId)}`,
      tryOnColorsSchema,
      controller.signal,
    )
      .then((items) => {
        setSwatches(items);
        setSelected((current) => current || items[0]?.variantId || "");
      })
      .catch(() => setStatus("Chưa tải được bảng màu; bạn có thể chọn màu minh họa bên dưới."));
    return () => controller.abort();
  }, [open, productId]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const videoElement = video.current;
    async function start() {
      try {
        setStatus("Đang mở camera và tải mô hình nhận diện...");
        const camera = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          camera.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.current = camera;
        if (!video.current) return;
        video.current.srcObject = camera;
        await video.current.play();
        const vision = await FilesetResolver.forVisionTasks("/mediapipe");
        const detector = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task", delegate: "CPU" },
          runningMode: "VIDEO",
          numFaces: 1,
        });
        if (cancelled) {
          detector.close();
          return;
        }
        landmarker.current = detector;
        setStatus("Camera đang hoạt động. Hướng mặt về phía camera.");
        function draw() {
          const source = video.current,
            target = canvas.current,
            model = landmarker.current;
          if (!source || !target || !model || source.readyState < 2) {
            frame.current = requestAnimationFrame(draw);
            return;
          }
          const width = source.videoWidth,
            height = source.videoHeight;
          if (target.width !== width || target.height !== height) {
            target.width = width;
            target.height = height;
          }
          const ctx = target.getContext("2d");
          if (!ctx) return;
          ctx.save();
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(source, 0, 0, width, height);
          ctx.restore();
          if (source.currentTime !== lastTime.current) {
            landmarks.current =
              model.detectForVideo(source, performance.now()).faceLandmarks[0] || null;
            lastTime.current = source.currentTime;
          }
          if (landmarks.current) {
            ctx.beginPath();
            traceLip(ctx, landmarks.current, lipOuter, width, height);
            traceLip(ctx, landmarks.current, lipInner, width, height);
            ctx.fillStyle = `${color.current}AA`;
            ctx.fill("evenodd");
          }
          frame.current = requestAnimationFrame(draw);
        }
        draw();
      } catch {
        if (!cancelled)
          setStatus(
            "Không mở được camera hoặc mô hình nhận diện. Hãy kiểm tra quyền camera và thử lại.",
          );
      }
    }
    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame.current);
      landmarker.current?.close();
      landmarker.current = null;
      landmarks.current = null;
      lastTime.current = -1;
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      if (videoElement) videoElement.srcObject = null;
    };
  }, [open]);
  return (
    <>
      <button type="button" className="try-on-trigger" onClick={() => setOpen(true)}>
        Thử màu son qua camera
      </button>
      {open && (
        <div
          className="try-on-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Thử màu son qua camera"
            className="try-on-dialog"
          >
            <div className="try-on-heading">
              <h2>Thử màu son qua camera</h2>
              <button type="button" aria-label="Đóng thử màu" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
            <div className="try-on-preview">
              <video ref={video} playsInline muted className="sr-only" />
              <canvas ref={canvas} aria-label="Hình camera với lớp màu son minh họa" />
            </div>
            <p role="status">{status}</p>
            {swatches.length > 0 && (
              <label>
                Phiên bản{" "}
                <select value={selected} onChange={(event) => setSelected(event.target.value)}>
                  {swatches.map((item) => (
                    <option key={item.variantId} value={item.variantId}>
                      {item.label || item.variantId}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!shade?.colorHex && (
              <label>
                Màu minh họa{" "}
                <input
                  type="color"
                  value={manualColor}
                  onChange={(event) => setManualColor(event.target.value)}
                />
              </label>
            )}
            <p className="hint">
              Màu camera chỉ để tham khảo; ánh sáng và màn hình có thể làm màu khác sản phẩm thật.
              Hình camera được xử lý trên thiết bị và không tải lên máy chủ.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
