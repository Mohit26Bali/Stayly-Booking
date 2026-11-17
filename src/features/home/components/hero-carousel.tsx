"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

const HERO_IMAGES = [
  { src: "/images/hero/taj_mahal_agra_11948442.jpg", alt: "Taj Mahal, Agra" },
  { src: "/images/hero/kerala_backwaters_houseboat_17928231.jpg", alt: "Kerala backwaters" },
  { src: "/images/hero/jaisalmer_fort_rajasthan_35130760.jpg", alt: "Jaisalmer Fort, Rajasthan" },
  { src: "/images/hero/himalayas_manali_mountains_8020071.jpg", alt: "Himalayas near Manali" },
  { src: "/images/hero/varanasi_ganges_ghats_17869831.jpg", alt: "Varanasi ghats" },
  { src: "/images/hero/golden_temple_amritsar_14890717.jpg", alt: "Golden Temple, Amritsar" },
  { src: "/images/hero/hampi_ruins_karnataka_38605003.jpg", alt: "Hampi, Karnataka" },
  { src: "/images/hero/goa_beach_sunset_28520254.jpg", alt: "Goa beach at sunset" },
  { src: "/images/hero/udaipur_city_palace_lake_27960110.jpg", alt: "City Palace, Udaipur" },
  { src: "/images/hero/mumbai_gateway_of_india_36874536.jpg", alt: "Gateway of India, Mumbai" },
];

const ROTATE_MS = 7000;

export function HeroCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % HERO_IMAGES.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div aria-hidden className="absolute inset-0 -z-20 overflow-hidden bg-black">
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <Image
            src={HERO_IMAGES[index].src}
            alt={HERO_IMAGES[index].alt}
            fill
            priority={index === 0}
            sizes="100vw"
            className="object-cover"
          />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-5 z-10 flex justify-center gap-1.5">
        {HERO_IMAGES.map((image, i) => (
          <button
            key={image.src}
            type="button"
            aria-label={`Show ${image.alt}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
