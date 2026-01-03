"use client";

interface HeroImageProps {
    src: string;
    alt: string;
    className?: string;
}

export function HeroImage({ src, alt, className }: HeroImageProps) {
    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={(e) => {
                (e.target as HTMLImageElement).src = "/hero.png";
            }}
        />
    );
}

