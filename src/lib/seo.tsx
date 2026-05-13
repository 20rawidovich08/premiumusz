import { Helmet } from "react-helmet-async";
import { ReactNode } from "react";

interface SeoProps {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  jsonLd?: object;
  children?: ReactNode;
}

const BASE = "https://premium-usz.lovable.app";
const DEFAULT_IMG = "https://storage.googleapis.com/gpt-engineer-file-uploads/5J5KodxPxwPI7agyXq8ATRlokJL2/social-images/social-1776966209570-IMG_2658.webp";

export const Seo = ({ title, description, path = "/", image, type = "website", jsonLd, children }: SeoProps) => {
  const url = `${BASE}${path}`;
  const img = image || DEFAULT_IMG;
  return (
    <Helmet>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={img} />
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
      {children}
    </Helmet>
  );
};
