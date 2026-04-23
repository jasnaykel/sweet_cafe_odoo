/**
 * CTRL QA Agent - Error Analyzer Module
 * AI-powered analysis of test failures with root cause detection
 */

import OpenAI from "openai";
import {
  TestResult,
  TestError,
  ErrorAnalysis,
  ErrorCategory,
  FlowAnalysis,
  ExecutionSummary,
} from "../types/index.js";
import { loadConfig, ctrlFlows } from "../config/index.js";

/**
 * AI-powered Error Analyzer
 */
export class ErrorAnalyzer {
  private config = loadConfig();
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Analyze all test failures
   */
  async analyzeFailures(summary: ExecutionSummary): Promise<{
    errorAnalysis: ErrorAnalysis[];
    flowAnalysis: FlowAnalysis[];
  }> {
    console.log("🔬 Analyzing test failures...\n");

    const failedTests = summary.results.filter((r) => r.status === "failed");

    if (failedTests.length === 0) {
      console.log("✅ No failures to analyze!\n");
      return { errorAnalysis: [], flowAnalysis: [] };
    }

    console.log(`📋 Found ${failedTests.length} failed tests to analyze\n`);

    // Analyze individual errors
    const errorAnalysis: ErrorAnalysis[] = [];
    for (const test of failedTests) {
      const analysis = await this.analyzeError(test);
      errorAnalysis.push(analysis);
    }

    // Analyze affected business flows
    const flowAnalysis = this.analyzeAffectedFlows(summary);

    return { errorAnalysis, flowAnalysis };
  }

  /**
   * Analyze a single test error
   */
  async analyzeError(testResult: TestResult): Promise<ErrorAnalysis> {
    const error = testResult.error || {
      message: "Unknown error",
      type: "unknown" as const,
    };

    // Use AI analysis if available
    let aiAnalysis: Partial<ErrorAnalysis> = {};
    if (this.openai) {
      aiAnalysis = await this.getAIAnalysis(testResult);
    }

    // Fallback to rule-based analysis
    const ruleBasedAnalysis = this.getRuleBasedAnalysis(testResult);

    return {
      testId: testResult.testId,
      error,
      rootCause: aiAnalysis.rootCause || ruleBasedAnalysis.rootCause,
      category: aiAnalysis.category || ruleBasedAnalysis.category,
      severity: this.determineSeverity(testResult, error),
      affectedArea: aiAnalysis.affectedArea || ruleBasedAnalysis.affectedArea,
      suggestedFix: aiAnalysis.suggestedFix || ruleBasedAnalysis.suggestedFix,
      codeExample: aiAnalysis.codeExample,
      relatedTests: this.findRelatedTests(testResult),
      businessImpact:
        aiAnalysis.businessImpact || ruleBasedAnalysis.businessImpact,
    };
  }

  /**
   * Get AI-powered analysis using OpenAI
   */
  private async getAIAnalysis(
    testResult: TestResult,
  ): Promise<Partial<ErrorAnalysis>> {
    if (!this.openai) return {};

    try {
      const prompt = this.buildAnalysisPrompt(testResult);

      const completion = await this.openai.chat.completions.create({
        model: this.config.ai.model,
        messages: [
          {
            role: "system",
            content: `You are a QA expert analyzing test failures for the CTRL Assessment Platform.
The platform has:
- Authentication: NextAuth.js with email/password
- Assessment modules: Typing Test, Call Simulation, Situational Judgement
- Admin panel: Candidates, Companies, Reports, Analytics
- Tech stack: Next.js 15, Strapi 5, Playwright

Analyze errors and provide actionable fixes.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) return {};

      // Parse AI response
      return this.parseAIResponse(response);
    } catch (error) {
      console.error("AI analysis failed:", error);
      return {};
    }
  }

  /**
   * Build prompt for AI analysis
   */
  private buildAnalysisPrompt(testResult: TestResult): string {
    return `Analyze this test failure:

TEST: ${testResult.testName}
SUITE: ${testResult.suite}
STATUS: ${testResult.status}
ERROR TYPE: ${testResult.error?.type || "unknown"}
ERROR MESSAGE: ${testResult.error?.message || "No message"}
STACK TRACE (first 500 chars): ${testResult.error?.stack?.substring(0, 500) || "No stack"}

Please provide:
1. ROOT CAUSE: What caused this failure (1-2 sentences)
2. CATEGORY: One of [authentication, validation, navigation, api_integration, state_management, ui_rendering, performance, accessibility, data_integrity, unknown]
3. AFFECTED AREA: Which part of the application is affected
4. SUGGESTED FIX: Step-by-step fix (numbered list)
5. CODE EXAMPLE: If applicable, show fixed code
6. BUSINESS IMPACT: How this affects users

Format your response as:
ROOT_CAUSE: ...
CATEGORY: ...
AFFECTED_AREA: ...
SUGGESTED_FIX: ...
CODE_EXAMPLE: ...
BUSINESS_IMPACT: ...`;
  }

  /**
   * Parse AI response into structured analysis
   */
  private parseAIResponse(response: string): Partial<ErrorAnalysis> {
    const analysis: Partial<ErrorAnalysis> = {};

    // Extract root cause
    const rootCauseMatch = response.match(
      /ROOT_CAUSE:\s*(.+?)(?=\n[A-Z_]+:|$)/s,
    );
    if (rootCauseMatch) {
      analysis.rootCause = rootCauseMatch[1].trim();
    }

    // Extract category
    const categoryMatch = response.match(/CATEGORY:\s*(\w+)/);
    if (categoryMatch) {
      analysis.category = categoryMatch[1].toLowerCase() as ErrorCategory;
    }

    // Extract affected area
    const areaMatch = response.match(/AFFECTED_AREA:\s*(.+?)(?=\n[A-Z_]+:|$)/s);
    if (areaMatch) {
      analysis.affectedArea = areaMatch[1].trim();
    }

    // Extract suggested fix
    const fixMatch = response.match(/SUGGESTED_FIX:\s*(.+?)(?=\n[A-Z_]+:|$)/s);
    if (fixMatch) {
      analysis.suggestedFix = fixMatch[1].trim();
    }

    // Extract code example
    const codeMatch = response.match(
      /CODE_EXAMPLE:\s*```[\w]*\n?([\s\S]+?)```/,
    );
    if (codeMatch) {
      analysis.codeExample = codeMatch[1].trim();
    }

    // Extract business impact
    const impactMatch = response.match(
      /BUSINESS_IMPACT:\s*(.+?)(?=\n[A-Z_]+:|$)/s,
    );
    if (impactMatch) {
      analysis.businessImpact = impactMatch[1].trim();
    }

    return analysis;
  }

  /**
   * Rule-based error analysis (fallback when AI not available)
   */
  private getRuleBasedAnalysis(testResult: TestResult): {
    rootCause: string;
    category: ErrorCategory;
    affectedArea: string;
    suggestedFix: string;
    businessImpact: string;
  } {
    const error = testResult.error;
    const errorType = error?.type || "unknown";
    const message = error?.message || "";
    const testName = testResult.testName.toLowerCase();
    const suite = testResult.suite.toLowerCase();

    // Determine category and analysis based on patterns
    let category: ErrorCategory = "unknown";
    let rootCause = "Test failed for unknown reason";
    let affectedArea = "Unknown area";
    let suggestedFix = "Review the test and application code";
    let businessImpact = "Feature may not work as expected";

    // Authentication errors
    if (
      testName.includes("login") ||
      testName.includes("auth") ||
      suite.includes("auth")
    ) {
      category = "authentication";
      affectedArea = "Authentication System";
      businessImpact = "Users cannot login to the platform";

      if (errorType === "timeout") {
        rootCause =
          "Login process timed out - server may be slow or unresponsive";
        suggestedFix =
          "1. Check if backend is running\n2. Verify credentials are correct\n3. Check network connectivity";
      } else if (errorType === "element_not_found") {
        rootCause =
          "Login form elements not found - page structure may have changed";
        suggestedFix =
          "1. Update selectors in test\n2. Verify login page renders correctly\n3. Check for JavaScript errors";
      } else {
        rootCause = "Login failed - credentials may be invalid or server error";
        suggestedFix =
          "1. Verify test credentials exist in database\n2. Check authentication endpoint\n3. Review error logs";
      }
    }
    // Navigation errors
    else if (
      testName.includes("navigate") ||
      testName.includes("page") ||
      errorType === "timeout"
    ) {
      category = "navigation";
      affectedArea = "Page Navigation";
      businessImpact = "Users cannot access certain pages";

      if (errorType === "timeout") {
        rootCause =
          "Page navigation timed out - page may not load or URL may be incorrect";
        suggestedFix =
          "1. Verify the target URL exists\n2. Check for redirects\n3. Increase timeout if page is slow";
      } else {
        rootCause =
          "Navigation failed - route may not exist or require authentication";
        suggestedFix =
          "1. Verify route is accessible\n2. Check if route requires auth\n3. Verify middleware configuration";
      }
    }
    // UI/Element errors
    else if (errorType === "element_not_found" || errorType === "assertion") {
      category = "ui_rendering";
      affectedArea = "User Interface";
      businessImpact = "UI elements missing or displaying incorrectly";

      if (errorType === "element_not_found") {
        rootCause = `Element not found on page - selector may be outdated or component not rendered`;
        suggestedFix = `1. Update selector to match current DOM\n2. Add data-testid attributes\n3. Check if component conditionally renders`;
      } else {
        rootCause =
          "Assertion failed - expected value did not match actual value";
        suggestedFix =
          "1. Verify expected values are correct\n2. Check if data has changed\n3. Add wait for dynamic content";
      }
    }
    // API errors
    else if (suite.includes("api") || testName.includes("api")) {
      category = "api_integration";
      affectedArea = "API Integration";
      businessImpact = "Backend API not functioning correctly";

      if (errorType === "network") {
        rootCause = "Network error - backend may be unreachable";
        suggestedFix =
          "1. Verify backend is running\n2. Check CORS configuration\n3. Verify API URL";
      } else {
        rootCause =
          "API request failed - endpoint may return unexpected response";
        suggestedFix =
          "1. Check API endpoint response\n2. Verify request payload\n3. Check authentication headers";
      }
    }
    // Assessment module errors
    else if (testName.includes("typing") || suite.includes("typing")) {
      category = "state_management";
      affectedArea = "Typing Test Module";
      businessImpact = "Candidates cannot complete typing assessment";
      rootCause =
        "Typing test component issue - timer, input, or scoring may be broken";
      suggestedFix =
        "1. Check typing test component\n2. Verify timer functionality\n3. Test input handling";
    } else if (testName.includes("call") || suite.includes("call")) {
      category = "state_management";
      affectedArea = "Call Simulation Module";
      businessImpact = "Candidates cannot complete call simulation";
      rootCause =
        "Call simulation component issue - audio player or form may be broken";
      suggestedFix =
        "1. Check audio file loading\n2. Verify form submission\n3. Test audio playback";
    } else if (
      testName.includes("judgement") ||
      testName.includes("sjt") ||
      suite.includes("sjt")
    ) {
      category = "state_management";
      affectedArea = "Situational Judgement Module";
      businessImpact = "Candidates cannot complete SJT assessment";
      rootCause =
        "SJT component issue - questions, options, or navigation may be broken";
      suggestedFix =
        "1. Check question rendering\n2. Verify option selection\n3. Test progress tracking";
    }
    // Admin errors
    else if (testName.includes("admin") || suite.includes("admin")) {
      category = "ui_rendering";
      affectedArea = "Admin Panel";
      businessImpact = "Administrators cannot manage the platform";
      rootCause =
        "Admin panel issue - dashboard, tables, or forms may not render correctly";
      suggestedFix =
        "1. Check admin route protection\n2. Verify data loading\n3. Test CRUD operations";
    }

    return { rootCause, category, affectedArea, suggestedFix, businessImpact };
  }

  /**
   * Determine error severity
   */
  private determineSeverity(
    testResult: TestResult,
    error: TestError,
  ): ErrorAnalysis["severity"] {
    const testName = testResult.testName.toLowerCase();
    const suite = testResult.suite.toLowerCase();

    // Critical paths
    if (testName.includes("login") || testName.includes("auth"))
      return "critical";
    if (suite.includes("authentication")) return "critical";
    if (testName.includes("critical")) return "critical";

    // High priority
    if (suite.includes("candidate") || suite.includes("assessment"))
      return "high";
    if (testName.includes("submit") || testName.includes("save")) return "high";

    // Medium priority
    if (suite.includes("admin")) return "medium";
    if (testName.includes("view") || testName.includes("display"))
      return "medium";

    // Default to medium
    return "medium";
  }

  /**
   * Find related tests
   */
  private findRelatedTests(testResult: TestResult): string[] {
    const related: string[] = [];
    const testName = testResult.testName.toLowerCase();
    const suite = testResult.suite.toLowerCase();

    // Find by module
    if (testName.includes("typing")) {
      related.push("typing-001", "typing-002", "typing-003");
    }
    if (testName.includes("call")) {
      related.push("call-001", "call-002", "call-003");
    }
    if (testName.includes("auth") || testName.includes("login")) {
      related.push("auth-001", "auth-002", "auth-003");
    }

    return related.filter((r) => r !== testResult.testId);
  }

  /**
   * Analyze affected business flows
   */
  private analyzeAffectedFlows(summary: ExecutionSummary): FlowAnalysis[] {
    const flows: FlowAnalysis[] = [];
    const failedTests = summary.results.filter((r) => r.status === "failed");
    const passedTests = summary.results.filter((r) => r.status === "passed");

    // Analyze candidate flows
    for (const flow of ctrlFlows.candidateFlows) {
      const flowStatus = this.determineFlowStatus(
        flow.name,
        failedTests,
        passedTests,
      );
      flows.push({
        flowName: flow.name,
        status: flowStatus.status,
        completedSteps: flowStatus.completedSteps,
        totalSteps: flow.steps.length,
        failurePoint: flowStatus.failurePoint,
        errors: failedTests
          .filter((t) => this.testRelatesToFlow(t, flow.name))
          .map((t) => this.createErrorAnalysisStub(t)),
        recommendations: this.getFlowRecommendations(flow, flowStatus),
      });
    }

    // Analyze admin flows
    for (const flow of ctrlFlows.adminFlows) {
      const flowStatus = this.determineFlowStatus(
        flow.name,
        failedTests,
        passedTests,
      );
      flows.push({
        flowName: flow.name,
        status: flowStatus.status,
        completedSteps: flowStatus.completedSteps,
        totalSteps: flow.steps.length,
        failurePoint: flowStatus.failurePoint,
        errors: failedTests
          .filter((t) => this.testRelatesToFlow(t, flow.name))
          .map((t) => this.createErrorAnalysisStub(t)),
        recommendations: this.getFlowRecommendations(flow, flowStatus),
      });
    }

    return flows;
  }

  /**
   * Determine flow status based on test results
   */
  private determineFlowStatus(
    flowName: string,
    failedTests: TestResult[],
    passedTests: TestResult[],
  ): {
    status: "working" | "broken" | "partial";
    completedSteps: number;
    failurePoint?: string;
  } {
    const relatedFailed = failedTests.filter((t) =>
      this.testRelatesToFlow(t, flowName),
    );
    const relatedPassed = passedTests.filter((t) =>
      this.testRelatesToFlow(t, flowName),
    );

    if (relatedFailed.length === 0 && relatedPassed.length > 0) {
      return { status: "working", completedSteps: relatedPassed.length };
    }
    if (relatedFailed.length > 0 && relatedPassed.length === 0) {
      return {
        status: "broken",
        completedSteps: 0,
        failurePoint: relatedFailed[0].testName,
      };
    }
    if (relatedFailed.length > 0 && relatedPassed.length > 0) {
      return {
        status: "partial",
        completedSteps: relatedPassed.length,
        failurePoint: relatedFailed[0].testName,
      };
    }

    return { status: "working", completedSteps: 0 };
  }

  /**
   * Check if test relates to a flow
   */
  private testRelatesToFlow(test: TestResult, flowName: string): boolean {
    const testLower = test.testName.toLowerCase();
    const suiteLower = test.suite.toLowerCase();
    const flowLower = flowName.toLowerCase();

    // Check for common keywords
    const keywords = flowLower.split(/\s+/);
    return keywords.some(
      (kw) => testLower.includes(kw) || suiteLower.includes(kw),
    );
  }

  /**
   * Create error analysis stub
   */
  private createErrorAnalysisStub(test: TestResult): ErrorAnalysis {
    return {
      testId: test.testId,
      error: test.error || { message: "Unknown", type: "unknown" },
      rootCause: "Pending analysis",
      category: "unknown",
      severity: "medium",
      affectedArea: test.suite,
      suggestedFix: "Review test failure details",
      relatedTests: [],
      businessImpact: "Feature may not work correctly",
    };
  }

  /**
   * Get recommendations for flow
   */
  private getFlowRecommendations(
    flow: { name: string; steps: string[] },
    status: { status: string; failurePoint?: string },
  ): string[] {
    const recommendations: string[] = [];

    if (status.status === "broken") {
      recommendations.push(
        `Critical: Fix ${status.failurePoint} before other tests`,
      );
      recommendations.push("Check if prerequisite services are running");
    } else if (status.status === "partial") {
      recommendations.push(`Fix failing step: ${status.failurePoint}`);
      recommendations.push("Run tests in isolation to identify dependencies");
    }

    // Flow-specific recommendations
    if (flow.name.toLowerCase().includes("auth")) {
      recommendations.push("Verify test credentials are seeded in database");
    }
    if (flow.name.toLowerCase().includes("assessment")) {
      recommendations.push(
        "Ensure assessment content (texts, questions, audio) exists",
      );
    }
    if (flow.name.toLowerCase().includes("admin")) {
      recommendations.push("Verify admin user has correct role assigned");
    }

    return recommendations;
  }
}

export default ErrorAnalyzer;
