import { z } from "astro/zod";

export function createEvidenceSchema<TImage extends z.ZodTypeAny>(image: () => TImage) {
  const evidenceUnion = z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("image"),
      label: z.string().min(1),
      src: image(),
      alt: z.string().min(1),
      value: z.string().min(1).optional(),
    }).strict(),

    z.object({
      kind: z.literal("metric"),
      label: z.string().min(1),
      value: z.string().min(1),
    }).strict(),

    z.object({
      kind: z.literal("document"),
      label: z.string().min(1),
      value: z.string().min(1).optional(),
      href: z.url().optional(),
    }).strict(),

    z.object({
      kind: z.literal("demo"),
      label: z.string().min(1),
      href: z.url(),
      value: z.string().min(1).optional(),
    }).strict(),

    z.object({
      kind: z.literal("video"),
      label: z.string().min(1),
      href: z.url(),
      value: z.string().min(1).optional(),
    }).strict(),
  ]);

  return z.array(
    evidenceUnion.refine(
      (item) => {
        if (item.kind !== "document") return true;

        const documentItem = item as {
          value?: string;
          href?: string;
        };

        return documentItem.value !== undefined || documentItem.href !== undefined;
      },
      {
        message: "document evidence must include value or href",
      },
    ),
  ).default([]);
}
