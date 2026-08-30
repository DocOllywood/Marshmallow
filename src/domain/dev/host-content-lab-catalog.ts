import { HOST_DEPOSIT_CONFIG } from "@/domain/content/host-deposit-content";
import { HOST_FLIRTS_CONFIG } from "@/domain/content/host-flirts-content";
import { HOST_PUBLIC_PRAISE_CONFIG } from "@/domain/content/host-public-praise-content";
import { HOST_THE_BEST_CONFIG } from "@/domain/content/host-the-best-content";
import type { HostExperimentConfig } from "@/domain/dev/host-rehearsal-types";

export const HOST_CONTENT_LAB_EXPERIMENTS: readonly HostExperimentConfig[] = [
  HOST_THE_BEST_CONFIG,
  HOST_FLIRTS_CONFIG,
  HOST_DEPOSIT_CONFIG,
  HOST_PUBLIC_PRAISE_CONFIG,
] as const;

export type HostContentLabExperimentId = (typeof HOST_CONTENT_LAB_EXPERIMENTS)[number]["id"];

export function getHostExperimentConfig(id: string): HostExperimentConfig | null {
  return HOST_CONTENT_LAB_EXPERIMENTS.find((experiment) => experiment.id === id) ?? null;
}

export function isHostContentLabExperimentId(id: string): id is HostContentLabExperimentId {
  return HOST_CONTENT_LAB_EXPERIMENTS.some((experiment) => experiment.id === id);
}
