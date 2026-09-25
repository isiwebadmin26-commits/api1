import { runCareerReport } from "./career-report";

/**
 * Service for /reports/career
 * Executes the monthly career resume digest pipeline with drive attachments & email
 */
export async function executeCareerReportService({ dryRun = false }: { dryRun?: boolean } = {}) {
  return runCareerReport({ dryRun });
}
