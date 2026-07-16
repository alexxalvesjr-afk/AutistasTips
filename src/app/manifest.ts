import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AutistasTips — Gestão profissional de apostas",
    short_name: "AutistasTips",
    description:
      "Planilha inteligente para gerenciamento profissional de apostas esportivas.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0c0c0e",
    theme_color: "#0c0c0e",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon.svg", type: "image/svg+xml", sizes: "180x180" },
    ],
  };
}
