import { z } from "zod";

import { CONTENT_FRESHNESS, QUESTION_ARCHETYPES } from "@/domain/content/archetype";
import { isSafeImageUrl } from "@/domain/content/image";
import { PLAY_MODES } from "@/domain/play/mode";

export const QUESTION_MIN = 8;
export const QUESTION_MAX = 280;
export const CHOICE_MAX = 80;
export const CHOICE_MIN_COUNT = 2;
export const CHOICE_MAX_COUNT = 4;

export function normalizeChoiceLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ");
}

export const choiceLabelSchema = z
  .string()
  .transform(normalizeChoiceLabel)
  .pipe(z.string().min(1, "Choice cannot be blank.").max(CHOICE_MAX));

export const marshmallowDraftSchema = z
  .object({
    id: z.string().uuid().optional(),
    question: z
      .string()
      .trim()
      .min(QUESTION_MIN, "Question is too short.")
      .max(QUESTION_MAX, "Question must be 280 characters or fewer."),
    topic_id: z.string().uuid().nullable(),
    choices: z.array(choiceLabelSchema).max(CHOICE_MAX_COUNT, "At most 4 choices."),
    opens_at: z.string().min(1, "Open time is required."),
    closes_at: z.string().min(1, "Close time is required."),
    reveals_at: z.string().min(1, "Reveal time is required."),
    is_daily: z.boolean(),
    play_mode: z.enum(PLAY_MODES).optional(),
    minimum_result_sample: z.coerce.number().int().min(0).optional(),
    hard_reveals_at: z.string().optional(),
    archetype: z.enum(QUESTION_ARCHETYPES).optional(),
    freshness: z.enum(CONTENT_FRESHNESS).optional(),
    entity_label: z.string().trim().max(80).optional().nullable(),
    spoiler_context: z.string().trim().max(80).optional().nullable(),
    image_url: z.string().trim().max(500).optional().nullable(),
    expires_at: z.string().optional().nullable(),
    content_set_id: z.string().uuid().optional().nullable(),
    checklist_instant: z.boolean().optional(),
    checklist_opinion: z.boolean().optional(),
    checklist_curiosity: z.boolean().optional(),
    checklist_clean: z.boolean().optional(),
    checklist_visual: z.boolean().optional(),
    checklist_timely: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const opens = Date.parse(value.opens_at);
    const closes = Date.parse(value.closes_at);
    const reveals = Date.parse(value.reveals_at);
    if (Number.isNaN(opens) || Number.isNaN(closes) || Number.isNaN(reveals)) {
      ctx.addIssue({ code: "custom", message: "Use valid dates and times.", path: ["opens_at"] });
      return;
    }
    if (!(opens < closes && closes < reveals)) {
      ctx.addIssue({
        code: "custom",
        message: "Open must be before close, and close before reveal.",
        path: ["closes_at"],
      });
    }
    if (value.hard_reveals_at) {
      const hard = Date.parse(value.hard_reveals_at);
      if (!Number.isNaN(hard) && !Number.isNaN(reveals) && hard < reveals) {
        ctx.addIssue({
          code: "custom",
          message: "Hard reveal must be at or after the target reveal.",
          path: ["hard_reveals_at"],
        });
      }
    }

    const normalized = value.choices.map((label) => label.toLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      ctx.addIssue({
        code: "custom",
        message: "Choices must be unique.",
        path: ["choices"],
      });
    }

    const mode = value.play_mode ?? (value.is_daily ? "daily" : "live");
    if (mode === "daily" && value.play_mode === "quick") {
      ctx.addIssue({
        code: "custom",
        message: "Quick cannot be Daily.",
        path: ["play_mode"],
      });
    }
    if (value.image_url && !isSafeImageUrl(value.image_url)) {
      ctx.addIssue({
        code: "custom",
        message: "Image must be an http(s) URL, or blank.",
        path: ["image_url"],
      });
    }
  })
  .transform((value) => {
    const play_mode = value.play_mode ?? (value.is_daily ? "daily" : "live");
    return {
      ...value,
      play_mode,
      is_daily: play_mode === "daily",
    };
  });

export const scheduleMarshmallowSchema = marshmallowDraftSchema.superRefine((value, ctx) => {
  if (value.choices.length < CHOICE_MIN_COUNT) {
    ctx.addIssue({
      code: "custom",
      message: "Schedule needs 2 to 4 choices.",
      path: ["choices"],
    });
  }
  if (!value.id) {
    ctx.addIssue({
      code: "custom",
      message: "Save a draft before scheduling.",
      path: ["id"],
    });
  }
});

export type MarshmallowDraftInput = z.infer<typeof marshmallowDraftSchema>;
