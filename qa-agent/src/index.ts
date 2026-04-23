/**
 * CTRL QA Agent - Main Entry Point
 * Autonomous QA system with AI-powered analysis
 */

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { ProjectDiscovery } from "./modules/discovery.js";
import { TestGenerator } from "./modules/generator.js";
import { TestExecutor } from "./modules/executor.js";
import { ErrorAnalyzer } from "./modules/analyzer.js";
import { ReportGenerator } from "./modules/reporter.js";
import { loadConfig } from "./config/index.js";
import { ProjectStructure, ExecutionSummary, QAReport } from "./types/index.js";

// ASCII Banner
const banner = `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ██████╗████████╗██████╗ ██╗         ██████╗  █████╗        ║
║  ██╔════╝╚══██╔══╝██╔══██╗██║        ██╔═══██╗██╔══██╗       ║
║  ██║        ██║   ██████╔╝██║        ██║   ██║███████║       ║
║  ██║        ██║   ██╔══██╗██║        ██║▄▄ ██║██╔══██║       ║
║  ╚██████╗   ██║   ██║  ██║███████╗   ╚██████╔╝██║  ██║       ║
║   ╚═════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝    ╚══▀▀═╝ ╚═╝  ╚═╝       ║
║                                                               ║
║         Autonomous QA Agent with AI-Powered Analysis          ║
║                        v1.0.0                                 ║
╚═══════════════════════════════════════════════════════════════╝
`;

/**
 * Main QA Agent class - orchestrates all modules
 */
class QAAgent {
  private discovery: ProjectDiscovery;
  private generator: TestGenerator;
  private executor: TestExecutor;
  private analyzer: ErrorAnalyzer;
  private reporter: ReportGenerator;
  private structure: ProjectStructure | null = null;
  private summary: ExecutionSummary | null = null;

  constructor() {
    this.discovery = new ProjectDiscovery();
    this.generator = new TestGenerator("./generated-tests");
    this.executor = new TestExecutor("./generated-tests", "./reports");
    this.analyzer = new ErrorAnalyzer();
    this.reporter = new ReportGenerator("./reports");
  }

  /**
   * Discover project structure
   */
  async discover(): Promise<ProjectStructure> {
    console.log(chalk.cyan("\n📋 PHASE 1: Project Discovery\n"));
    const spinner = ora("Analyzing project structure...").start();

    try {
      this.structure = await this.discovery.discoverProject();
      spinner.succeed("Project structure discovered");

      this.printStructureSummary();
      return this.structure;
    } catch (error) {
      spinner.fail("Failed to discover project");
      throw error;
    }
  }

  /**
   * Generate tests
   */
  async generate(): Promise<void> {
    console.log(chalk.cyan("\n🧪 PHASE 2: Test Generation\n"));

    if (!this.structure) {
      console.log(chalk.yellow("Running discovery first..."));
      await this.discover();
    }

    const spinner = ora("Generating test cases...").start();

    try {
      const tests = await this.generator.generateAllTests(this.structure!);
      spinner.succeed(`Generated ${tests.length} test files`);
    } catch (error) {
      spinner.fail("Failed to generate tests");
      throw error;
    }
  }

  /**
   * Execute tests
   */
  async execute(): Promise<ExecutionSummary> {
    console.log(chalk.cyan("\n🚀 PHASE 3: Test Execution\n"));

    const spinner = ora("Running tests with Playwright...").start();
    spinner.stop(); // Stop spinner to show test output

    try {
      this.summary = await this.executor.executeAllTests();
      return this.summary;
    } catch (error) {
      console.error(chalk.red("Failed to execute tests"));
      throw error;
    }
  }

  /**
   * Analyze results
   */
  async analyze(): Promise<void> {
    console.log(chalk.cyan("\n🔬 PHASE 4: Error Analysis\n"));

    if (!this.summary) {
      console.log(
        chalk.yellow("No test results to analyze. Run execute first."),
      );
      return;
    }

    const spinner = ora("Analyzing test failures with AI...").start();

    try {
      const { errorAnalysis, flowAnalysis } =
        await this.analyzer.analyzeFailures(this.summary);
      spinner.succeed(
        `Analyzed ${errorAnalysis.length} errors, ${flowAnalysis.length} flows`,
      );

      this.printAnalysisSummary(errorAnalysis.length, flowAnalysis);
    } catch (error) {
      spinner.fail("Failed to analyze results");
      throw error;
    }
  }

  /**
   * Generate report
   */
  async report(): Promise<QAReport> {
    console.log(chalk.cyan("\n📝 PHASE 5: Report Generation\n"));

    if (!this.structure) {
      await this.discover();
    }
    if (!this.summary) {
      this.summary = this.createEmptySummary();
    }

    const spinner = ora("Generating comprehensive report...").start();

    try {
      const { errorAnalysis, flowAnalysis } =
        await this.analyzer.analyzeFailures(this.summary);

      const report = await this.reporter.generateReport(
        this.summary,
        this.structure!,
        errorAnalysis,
        flowAnalysis,
      );

      spinner.succeed("Report generated successfully");
      this.printReportSummary(report);

      return report;
    } catch (error) {
      spinner.fail("Failed to generate report");
      throw error;
    }
  }

  /**
   * Run full QA pipeline
   */
  async runFullPipeline(): Promise<QAReport> {
    console.log(banner);
    console.log(chalk.green("Starting Full QA Pipeline...\n"));

    const startTime = Date.now();

    try {
      // Phase 1: Discovery
      await this.discover();

      // Phase 2: Generate
      await this.generate();

      // Phase 3: Execute
      await this.execute();

      // Phase 4: Analyze
      await this.analyze();

      // Phase 5: Report
      const report = await this.report();

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        chalk.green(`\n✅ Full QA Pipeline completed in ${duration}s\n`),
      );

      return report;
    } catch (error) {
      console.error(chalk.red("\n❌ Pipeline failed:"), error);
      throw error;
    }
  }

  /**
   * Print structure summary
   */
  private printStructureSummary(): void {
    if (!this.structure) return;

    console.log("\n" + chalk.gray("─".repeat(50)));
    console.log(chalk.white("Project Structure Summary:"));
    console.log(chalk.gray("─".repeat(50)));
    console.log(`  Type:        ${chalk.cyan(this.structure.type)}`);
    console.log(`  Version:     ${chalk.cyan(this.structure.version)}`);
    console.log(`  Routes:      ${chalk.yellow(this.structure.routes.length)}`);
    console.log(
      `  Components:  ${chalk.yellow(this.structure.components.length)}`,
    );
    console.log(
      `  API Endpoints: ${chalk.yellow(this.structure.apiEndpoints.length)}`,
    );
    console.log(`  Pages:       ${chalk.yellow(this.structure.pages.length)}`);
    console.log(chalk.gray("─".repeat(50)) + "\n");
  }

  /**
   * Print analysis summary
   */
  private printAnalysisSummary(errorCount: number, flowAnalysis: any[]): void {
    console.log("\n" + chalk.gray("─".repeat(50)));
    console.log(chalk.white("Analysis Summary:"));
    console.log(chalk.gray("─".repeat(50)));
    console.log(`  Errors Analyzed:  ${chalk.yellow(errorCount)}`);
    console.log(`  Flows Analyzed:   ${chalk.yellow(flowAnalysis.length)}`);

    const working = flowAnalysis.filter((f) => f.status === "working").length;
    const partial = flowAnalysis.filter((f) => f.status === "partial").length;
    const broken = flowAnalysis.filter((f) => f.status === "broken").length;

    console.log(`  Flows Working:    ${chalk.green(working)}`);
    console.log(`  Flows Partial:    ${chalk.yellow(partial)}`);
    console.log(`  Flows Broken:     ${chalk.red(broken)}`);
    console.log(chalk.gray("─".repeat(50)) + "\n");
  }

  /**
   * Print report summary
   */
  private printReportSummary(report: QAReport): void {
    console.log("\n" + chalk.gray("═".repeat(50)));
    console.log(chalk.white.bold("📊 FINAL QA REPORT"));
    console.log(chalk.gray("═".repeat(50)));

    const healthColor =
      report.healthScore >= 80
        ? chalk.green
        : report.healthScore >= 50
          ? chalk.yellow
          : chalk.red;

    console.log(`  Health Score:     ${healthColor(report.healthScore + "%")}`);
    console.log(
      `  Total Tests:      ${chalk.white(report.summary.totalTests)}`,
    );
    console.log(`  Passed:           ${chalk.green(report.summary.passed)}`);
    console.log(`  Failed:           ${chalk.red(report.summary.failed)}`);
    console.log(
      `  Critical Issues:  ${chalk.red(report.criticalIssues.length)}`,
    );
    console.log(
      `  Recommendations:  ${chalk.yellow(report.recommendations.length)}`,
    );
    console.log(chalk.gray("═".repeat(50)));
    console.log(chalk.cyan("\n📁 Reports saved to: ./reports/"));
    console.log("   - qa-report.html (Visual Report)");
    console.log("   - qa-report.json (Data Export)");
    console.log("   - qa-report.md (Markdown)\n");
  }

  /**
   * Create empty summary
   */
  private createEmptySummary(): ExecutionSummary {
    return {
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      startTime: new Date(),
      endTime: new Date(),
      results: [],
    };
  }
}

// CLI Setup
const program = new Command();

program
  .name("ctrl-qa")
  .description("CTRL QA Agent - Autonomous testing with AI analysis")
  .version("1.0.0");

program
  .command("discover")
  .description("Discover project structure and routes")
  .action(async () => {
    const agent = new QAAgent();
    await agent.discover();
  });

program
  .command("generate")
  .description("Generate test cases based on discovered structure")
  .action(async () => {
    const agent = new QAAgent();
    await agent.discover();
    await agent.generate();
  });

program
  .command("execute")
  .description("Execute generated tests")
  .action(async () => {
    const agent = new QAAgent();
    await agent.execute();
  });

program
  .command("analyze")
  .description("Analyze test results with AI")
  .action(async () => {
    const agent = new QAAgent();
    await agent.execute();
    await agent.analyze();
  });

program
  .command("report")
  .description("Generate comprehensive QA report")
  .action(async () => {
    const agent = new QAAgent();
    await agent.report();
  });

program
  .command("full")
  .alias("run")
  .description(
    "Run complete QA pipeline (discover → generate → execute → analyze → report)",
  )
  .action(async () => {
    const agent = new QAAgent();
    await agent.runFullPipeline();
  });

// Parse arguments
program.parse();

// Export for programmatic use
export { QAAgent };
export default QAAgent;
