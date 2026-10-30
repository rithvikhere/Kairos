import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import * as extendedFormulas from "../src/domain/extendedRiskFormulas/formulas.js";

export interface ProjectStats {
  testsPassing: number;
  testFileCount: number;
  riskFormulaCount: {
    extended: number;
    core: number;
    total: number;
  };
  apiRouteCount: number;
  componentCount: number;
  constraintCount: number;
  phasesShipped: number;
  generatedAt: string;
}

const PHASES_SHIPPED = [
  "Domain simulation",
  "Monte Carlo",
  "Data layer",
  "Diff engine",
  "API routes",
  "AI layer",
  "Frontend",
  "Constraint catalogue",
];

function walkDir(dir: string): string[] {
  let files: string[] = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

export function generateProjectStats(rootDir = process.cwd()): ProjectStats {
  const srcDir = path.resolve(rootDir, "src");
  const allFiles = walkDir(srcDir).map((p) =>
    path.relative(rootDir, p).replace(/\\/g, "/")
  );

  // 1a. Passing test count from actual test suite
  const tempOutputFile = path.resolve(rootDir, ".vitest-stats-output.json");
  let testsPassing = 0;
  try {
    // Run vitest with json reporter to output file
    execSync(
      `npx vitest run --reporter=json --outputFile="${tempOutputFile}"`,
      {
        cwd: rootDir,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 120000,
      }
    );

    if (!fs.existsSync(tempOutputFile)) {
      throw new Error(`Vitest report file was not created at ${tempOutputFile}`);
    }

    const testReportContent = fs.readFileSync(tempOutputFile, "utf-8");
    const testReport = JSON.parse(testReportContent);
    testsPassing = testReport.numPassedTests;

    if (typeof testsPassing !== "number" || testsPassing <= 0) {
      throw new Error(`Invalid test count parsed from report: ${testsPassing}`);
    }
  } catch (err: any) {
    if (fs.existsSync(tempOutputFile)) {
      try {
        fs.unlinkSync(tempOutputFile);
      } catch {
        // ignore
      }
    }
    console.error("FATAL: Failed to run vitest or parse passing test count:", err);
    process.exit(1);
  } finally {
    if (fs.existsSync(tempOutputFile)) {
      try {
        fs.unlinkSync(tempOutputFile);
      } catch {
        // ignore
      }
    }
  }

  // 1b. Test file count
  const testFiles = allFiles.filter(
    (f) => f.endsWith(".test.ts") || f.endsWith(".test.tsx")
  );
  const testFileCount = testFiles.length;

  // 1c. Risk formula count
  const extendedFormulaKeys = Object.keys(extendedFormulas).filter(
    (key) => typeof (extendedFormulas as Record<string, unknown>)[key] === "function"
  );
  const extendedCount = extendedFormulaKeys.length;
  const coreCount = 3; // scheduleRisk, budgetRisk, staffingRisk from simulation.ts
  const totalFormulaCount = extendedCount + coreCount;

  // 1d. API route count: src/app/api/**/route.ts
  const apiRoutes = allFiles.filter(
    (f) => f.startsWith("src/app/api/") && f.endsWith("/route.ts")
  );
  const apiRouteCount = apiRoutes.length;

  // 1e. UI component count: src/components/**/*.tsx excluding __tests__
  const uiComponents = allFiles.filter(
    (f) =>
      f.startsWith("src/components/") &&
      f.endsWith(".tsx") &&
      !f.includes("/__tests__/")
  );
  const componentCount = uiComponents.length;

  // 1f. Constraints modeled: literal length of ConstraintKey union in src/domain/types.ts
  const typesFilePath = path.resolve(rootDir, "src/domain/types.ts");
  const typesContent = fs.readFileSync(typesFilePath, "utf-8");
  const constraintMatch = typesContent.match(
    /export\s+type\s+ConstraintKey\s*=([\s\S]*?);/
  );
  if (!constraintMatch) {
    throw new Error("Could not find ConstraintKey type union in src/domain/types.ts");
  }
  const constraintKeys = constraintMatch[1]
    .split("|")
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
  const constraintCount = constraintKeys.length;

  // 1g. Phases shipped
  const phasesShipped = PHASES_SHIPPED.length;

  const stats: ProjectStats = {
    testsPassing,
    testFileCount,
    riskFormulaCount: {
      extended: extendedCount,
      core: coreCount,
      total: totalFormulaCount,
    },
    apiRouteCount,
    componentCount,
    constraintCount,
    phasesShipped,
    generatedAt: new Date().toISOString(),
  };

  return stats;
}

// Script execution entry point
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith("generateProjectStats.ts") ||
    process.argv[1].endsWith("generateProjectStats.js"));

if (isDirectExecution) {
  try {
    const stats = generateProjectStats();
    const outDir = path.resolve(process.cwd(), "src/data");
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const targetFile = path.resolve(outDir, "projectStats.generated.json");
    fs.writeFileSync(targetFile, JSON.stringify(stats, null, 2) + "\n", "utf-8");
    console.log("Project stats successfully generated at:", targetFile);
    console.log(JSON.stringify(stats, null, 2));
  } catch (e) {
    console.error("Failed to generate project stats:", e);
    process.exit(1);
  }
}
