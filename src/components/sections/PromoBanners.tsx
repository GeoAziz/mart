"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface PromoBanner {
  id: string;
  name: string;
  imageUrl: string;
  dataAiHint?: string;
  link: string;
  isActive: boolean;
  displayArea: "homepage_top" | "sidebar" | "category_page";
}

const PromoBanners = ({ area = "homepage_top" }: { area?: PromoBanner["displayArea"] }) => {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/cms/homepage");
        if (!response.ok) throw new Error("Failed to fetch homepage content");
        const data = await response.json();
        setBanners((data.promoBanners || []).filter((b: PromoBanner) => b.isActive && b.displayArea === area));
      } catch (error) {
        setBanners([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBanners();
  }, [area]);

  if (isLoading) {
    return <Skeleton className="w-full h-32 md:h-40 rounded-lg mb-8" />;
  }

  if (!banners.length) return null;

  return (
    <div className="mb-8 flex flex-col gap-4">
      {banners.map((banner) => (
        <a
          key={banner.id}
          href={banner.link}
          aria-label={banner.name}
          className="block group relative rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all"
        >
          <Image
            src={banner.imageUrl}
            alt={banner.name}
            width={1200}
            height={200}
            className="w-full h-32 md:h-40 object-cover group-hover:scale-105 transition-transform"
            data-ai-hint={banner.dataAiHint || "promo banner"}
            loading="lazy"
          />
          <span className="sr-only">{banner.name}</span>
        </a>
      ))}
    </div>
  );
};

export default PromoBanners;
