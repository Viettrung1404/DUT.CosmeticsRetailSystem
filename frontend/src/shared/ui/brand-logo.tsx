import Image from "next/image";
import Link from "next/link";

export function BrandLogo({ caption = "BEAUTY & CARE" }: { caption?: string }) {
  return <Link href="/" className="logo" aria-label="GlowUp — Trang chủ">
    <Image src="/images/stitch/glowup-logo.webp" width={48} height={48} alt="" className="logo-image"/>
    <span>GlowUp<small>{caption}</small></span>
  </Link>;
}
