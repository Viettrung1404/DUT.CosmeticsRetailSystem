"use client";
import { useEffect, useState } from "react";

export function HomeMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = document.querySelectorAll<HTMLElement>(
      ".home-section, .home-editorials, .home-trust",
    );
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.08, rootMargin: "0px 0px 40px 0px" },
    );
    targets.forEach((target) => {
      target.classList.add("motion-section");
      observer.observe(target);
    });
    return () => {
      observer.disconnect();
      targets.forEach((target) => target.classList.remove("motion-section", "is-visible"));
    };
  }, []);
  return null;
}

function remaining(endDate: string) {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 1000));
}
export function FlashCountdown({ endDate }: { endDate: string }) {
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setSeconds(remaining(endDate));
    const initial = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [endDate]);
  if (seconds === null)
    return (
      <div className="flash-countdown" aria-label="Đang tải thời gian còn lại">
        <span>--</span>:<span>--</span>:<span>--</span>
      </div>
    );
  if (seconds <= 0) return <p className="flash-countdown-ended">Ưu đãi đã kết thúc</p>;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const second = seconds % 60;
  const values = days ? [days, hours, minutes, second] : [hours, minutes, second];
  return (
    <div
      className="flash-countdown"
      aria-label={`Còn ${days} ngày ${hours} giờ ${minutes} phút ${second} giây`}
    >
      <span className="countdown-label">Kết thúc sau</span>
      {values.map((value, index) => (
        <span className="countdown-pair" key={index}>
          {index > 0 && <span className="countdown-colon">:</span>}
          <span className="countdown-digit" key={`${index}-${value}`}>
            {String(value).padStart(2, "0")}
          </span>
        </span>
      ))}
    </div>
  );
}
