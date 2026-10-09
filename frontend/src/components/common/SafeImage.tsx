"use client";

import React from "react";
import Image, { ImageProps } from "next/image";

const CONFIGURED_IMAGE_HOSTS = new Set([
  "res.cloudinary.com",
  "images.unsplash.com",
  "plus.unsplash.com",
  "localhost",
  "127.0.0.1",
]);

/**
 * Checks if an image URL's hostname is in next.config.ts remotePatterns.
 */
export function isConfiguredImageHost(url?: string | null): boolean {
  if (!url) return false;
  if (url.startsWith("/")) return true;
  try {
    const { hostname } = new URL(url);
    return CONFIGURED_IMAGE_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

/**
 * Drop-in replacement for next/image that prevents crashes when rendering
 * images from unconfigured external hostnames by falling back to unoptimized loading.
 */
export function SafeImage(props: ImageProps) {
  const { alt = "", unoptimized, src, ...rest } = props;
  const isConfigured =
    typeof src === "string" ? isConfiguredImageHost(src) : true;

  return (
    <Image
      alt={alt}
      src={src}
      {...rest}
      unoptimized={unoptimized ?? !isConfigured}
    />
  );
}

export default SafeImage;
