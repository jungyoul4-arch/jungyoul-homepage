import Image from "next/image";

interface HeroBannerProps {
  src: string;
  alt: string;
  title?: string;
  subtitle?: string;
}

export function HeroBanner({ src, alt, title, subtitle }: HeroBannerProps) {
  return (
    <div className="relative w-full aspect-[21/9] max-h-[320px] overflow-hidden bg-gray-100">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        priority
        sizes="100vw"
      />
      {(title || subtitle) && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end">
          <div className="max-w-[1280px] mx-auto w-full px-4 pb-8">
            {title && <h1 className="text-[1.375rem] md:text-[1.875rem] font-bold text-white">{title}</h1>}
            {subtitle && <p className="text-[0.875rem] md:text-[1.5rem] font-medium text-white/80 mt-2">{subtitle}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
