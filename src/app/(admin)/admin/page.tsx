import { AdminDashboard, AdminHeaderActions } from "@/components/admin/AdminDashboard";
import { BetaCohortsTable, BetaHealthCard } from "@/components/admin/BetaHealthCard";
import { CalibrationCard } from "@/components/admin/CalibrationCard";
import { ContentHealthTable } from "@/components/admin/ContentHealthTable";
import { FeedbackReview } from "@/components/admin/FeedbackReview";
import { GrowthMetricsCard } from "@/components/admin/GrowthMetricsCard";
import {
  ContentCalendarCard,
  ContentInventoryCard,
  EditorialComparisonCard,
} from "@/components/admin/ContentOpsCards";
import { QuickSampleHealthCard } from "@/components/admin/QuickSampleHealthCard";
import { RebuildCrowdsenseButton } from "@/components/admin/RebuildCrowdsenseButton";
import { RevealReturnCard } from "@/components/admin/RevealReturnCard";
import { RunLifecycleButton } from "@/components/admin/RunLifecycleButton";
import { TestSessionCard } from "@/components/admin/TestSessionCard";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { requireAdmin } from "@/server/dal/auth";
import {
  getAccuracyCalibration,
  getBetaCohorts,
  getBetaHealth,
  getContentHealth,
  getGrowthMetrics,
  getContentCalendar,
  getContentInventory,
  getEditorialComparisons,
  getModePayoffMetrics,
  getQuickSampleHealth,
  getQuickTestSession,
  getRevealReturnMetrics,
  listAdminMarshmallows,
  listBetaFeedback,
} from "@/server/dal/admin";

export default async function AdminPage() {
  await requireAdmin();

  let rows: Awaited<ReturnType<typeof listAdminMarshmallows>> = [];
  let metrics: unknown = null;
  let growth: unknown = null;
  let health: unknown = null;
  let content: unknown = null;
  let cohorts: unknown = null;
  let calibration: unknown = null;
  let feedback: unknown = null;
  let testSession: unknown = null;
  let sampleHealth: unknown = null;
  let modePayoff: unknown = null;
  let inventory: unknown = null;
  let calendar: unknown = null;
  let editorial: unknown = null;
  let failed = false;
  try {
    rows = await listAdminMarshmallows();
  } catch {
    failed = true;
  }
  try {
    metrics = await getRevealReturnMetrics();
  } catch {
    metrics = null;
  }
  try {
    growth = await getGrowthMetrics();
  } catch {
    growth = null;
  }
  try {
    health = await getBetaHealth();
  } catch {
    health = null;
  }
  try {
    content = await getContentHealth();
  } catch {
    content = null;
  }
  try {
    cohorts = await getBetaCohorts();
  } catch {
    cohorts = null;
  }
  try {
    calibration = await getAccuracyCalibration();
  } catch {
    calibration = null;
  }
  try {
    feedback = await listBetaFeedback();
  } catch {
    feedback = null;
  }
  try {
    testSession = await getQuickTestSession();
  } catch {
    testSession = null;
  }
  try {
    sampleHealth = await getQuickSampleHealth();
  } catch {
    sampleHealth = null;
  }
  try {
    modePayoff = await getModePayoffMetrics();
  } catch {
    modePayoff = null;
  }
  try {
    inventory = await getContentInventory();
  } catch {
    inventory = null;
  }
  try {
    calendar = await getContentCalendar();
  } catch {
    calendar = null;
  }
  try {
    editorial = await getEditorialComparisons();
  } catch {
    editorial = null;
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Kitchen"
        description="Create, schedule, and advance Marshmallows. Cron uses database time."
      />
      <AdminHeaderActions />
      <RunLifecycleButton />
      <RebuildCrowdsenseButton />
      {inventory ? <ContentInventoryCard raw={inventory} /> : null}
      {calendar ? <ContentCalendarCard raw={calendar} /> : null}
      {testSession ? <TestSessionCard raw={testSession} /> : null}
      {sampleHealth ? <QuickSampleHealthCard raw={sampleHealth} /> : null}
      {health && metrics ? (
        <BetaHealthCard
          raw={health}
          overallReturn={metrics}
          modePayoff={modePayoff}
          sampleHealth={sampleHealth}
        />
      ) : null}
      {metrics ? <RevealReturnCard raw={metrics} /> : null}
      {growth ? <GrowthMetricsCard raw={growth} /> : null}
      {calibration ? <CalibrationCard raw={calibration} /> : null}
      {cohorts ? <BetaCohortsTable raw={cohorts} /> : null}
      {editorial ? <EditorialComparisonCard raw={editorial} /> : null}
      {content ? <ContentHealthTable raw={content} /> : null}
      {feedback ? <FeedbackReview raw={feedback} /> : null}
      {failed ? (
        <ErrorState title="Kitchen didn't load" description="Could not list Marshmallows." />
      ) : (
        <AdminDashboard rows={rows} />
      )}
    </main>
  );
}
