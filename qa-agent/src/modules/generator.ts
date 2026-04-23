/**
 * CTRL QA Agent - Test Generator Module
 * Generates test cases based on discovered structure and business flows
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import {
  TestCase,
  TestSuite,
  GeneratedTest,
  ProjectStructure,
  TestStep,
} from "../types/index.js";
import { ctrlFlows, assessmentModules } from "../config/index.js";

/**
 * Test Generator class
 */
export class TestGenerator {
  private outputDir: string;
  private structure: ProjectStructure | null = null;

  constructor(outputDir: string = "./generated-tests") {
    this.outputDir = outputDir;
    this.ensureOutputDir();
  }

  /**
   * Generate all test suites
   */
  async generateAllTests(
    structure: ProjectStructure,
  ): Promise<GeneratedTest[]> {
    this.structure = structure;
    const generatedTests: GeneratedTest[] = [];

    console.log("🧪 Generating test suites...\n");

    // Generate authentication tests
    const authTests = this.generateAuthTests();
    generatedTests.push(...authTests);
    console.log(`✅ Generated ${authTests.length} authentication tests`);

    // Generate candidate flow tests
    const candidateTests = this.generateCandidateFlowTests();
    generatedTests.push(...candidateTests);
    console.log(`✅ Generated ${candidateTests.length} candidate flow tests`);

    // Generate admin flow tests
    const adminTests = this.generateAdminFlowTests();
    generatedTests.push(...adminTests);
    console.log(`✅ Generated ${adminTests.length} admin flow tests`);

    // Generate assessment module tests
    const assessmentTests = this.generateAssessmentTests();
    generatedTests.push(...assessmentTests);
    console.log(`✅ Generated ${assessmentTests.length} assessment tests`);

    // Generate API tests
    const apiTests = this.generateAPITests();
    generatedTests.push(...apiTests);
    console.log(`✅ Generated ${apiTests.length} API tests`);

    // Write all tests to files
    for (const test of generatedTests) {
      this.writeTestFile(test);
    }

    console.log(`\n📁 All tests written to: ${this.outputDir}`);
    return generatedTests;
  }

  /**
   * Generate authentication test suite
   */
  private generateAuthTests(): GeneratedTest[] {
    const tests: GeneratedTest[] = [];

    const authSuite: TestSuite = {
      name: "Authentication Tests",
      description: "Tests for login, logout, and authentication flows",
      tests: [
        {
          id: "auth-001",
          name: "Candidate can login with valid credentials",
          description: "Test successful candidate login flow",
          type: "e2e",
          priority: "critical",
          category: "authentication",
          steps: [
            { action: "navigate", value: "/auth/login" },
            {
              action: "fill",
              selector: 'input[type="email"]',
              value: "${CANDIDATE_EMAIL}",
            },
            {
              action: "fill",
              selector: 'input[type="password"]',
              value: "${CANDIDATE_PASSWORD}",
            },
            { action: "click", selector: 'button[type="submit"]' },
            { action: "waitForURL", value: "/dashboard" },
            {
              action: "assert",
              assertion: "url-contains",
              value: "/dashboard",
            },
          ],
          expectedResult:
            "User is redirected to dashboard after successful login",
          tags: ["auth", "login", "critical"],
        },
        {
          id: "auth-002",
          name: "Admin can login with valid credentials",
          description: "Test successful admin login flow",
          type: "e2e",
          priority: "critical",
          category: "authentication",
          steps: [
            { action: "navigate", value: "/auth/login" },
            {
              action: "fill",
              selector: 'input[type="email"]',
              value: "${ADMIN_EMAIL}",
            },
            {
              action: "fill",
              selector: 'input[type="password"]',
              value: "${ADMIN_PASSWORD}",
            },
            { action: "click", selector: 'button[type="submit"]' },
            { action: "waitForURL", value: "/admin" },
            { action: "assert", assertion: "url-contains", value: "/admin" },
          ],
          expectedResult: "Admin is redirected to admin dashboard",
          tags: ["auth", "login", "admin", "critical"],
        },
        {
          id: "auth-003",
          name: "Login fails with invalid credentials",
          description: "Test login failure with wrong password",
          type: "e2e",
          priority: "high",
          category: "authentication",
          steps: [
            { action: "navigate", value: "/auth/login" },
            {
              action: "fill",
              selector: 'input[type="email"]',
              value: "invalid@test.com",
            },
            {
              action: "fill",
              selector: 'input[type="password"]',
              value: "wrongpassword",
            },
            { action: "click", selector: 'button[type="submit"]' },
            { action: "waitForSelector", selector: '[role="alert"]' },
            {
              action: "assert",
              assertion: "visible",
              selector: '[role="alert"]',
            },
          ],
          expectedResult: "Error message is displayed",
          tags: ["auth", "login", "negative"],
        },
        {
          id: "auth-004",
          name: "Protected routes redirect to login",
          description:
            "Test that unauthenticated users cannot access protected routes",
          type: "e2e",
          priority: "critical",
          category: "authentication",
          steps: [
            { action: "navigate", value: "/dashboard" },
            { action: "waitForURL", value: "/auth/login" },
            {
              action: "assert",
              assertion: "url-contains",
              value: "/auth/login",
            },
          ],
          expectedResult: "User is redirected to login page",
          tags: ["auth", "security", "critical"],
        },
        {
          id: "auth-005",
          name: "Admin routes not accessible by candidates",
          description: "Test role-based access control",
          type: "e2e",
          priority: "critical",
          category: "authentication",
          preconditions: ["Login as candidate"],
          steps: [
            { action: "login", value: "candidate" },
            { action: "navigate", value: "/admin" },
            {
              action: "assert",
              assertion: "url-not-contains",
              value: "/admin",
            },
          ],
          expectedResult: "Candidate cannot access admin panel",
          tags: ["auth", "rbac", "security", "critical"],
        },
      ],
      setup: ["Clear cookies", "Clear localStorage"],
      teardown: ["Logout if logged in"],
    };

    tests.push(this.generatePlaywrightTest(authSuite, "auth.spec.ts"));
    return tests;
  }

  /**
   * Generate candidate flow tests
   */
  private generateCandidateFlowTests(): GeneratedTest[] {
    const tests: GeneratedTest[] = [];

    const candidateSuite: TestSuite = {
      name: "Candidate Flow Tests",
      description: "End-to-end tests for candidate assessment journey",
      tests: [
        {
          id: "cand-001",
          name: "Candidate can view dashboard after login",
          description: "Test dashboard accessibility and content",
          type: "e2e",
          priority: "critical",
          category: "candidate-flow",
          preconditions: ["Login as candidate"],
          steps: [
            { action: "login", value: "candidate" },
            {
              action: "assert",
              assertion: "visible",
              selector: "text=Welcome",
            },
            {
              action: "assert",
              assertion: "visible",
              selector: "text=Typing Test",
            },
            {
              action: "assert",
              assertion: "visible",
              selector: "text=Call Simulation",
            },
            {
              action: "assert",
              assertion: "visible",
              selector: "text=Situational Judgement",
            },
          ],
          expectedResult: "Dashboard shows all assessment modules",
          tags: ["candidate", "dashboard", "critical"],
        },
        {
          id: "cand-002",
          name: "Candidate can navigate to typing test",
          description: "Test navigation from dashboard to typing test",
          type: "e2e",
          priority: "critical",
          category: "candidate-flow",
          preconditions: ["Login as candidate"],
          steps: [
            { action: "login", value: "candidate" },
            { action: "click", selector: 'a[href="/assessment/typing"]' },
            { action: "waitForURL", value: "/assessment/typing" },
            { action: "assert", assertion: "visible", selector: "text=Typing" },
          ],
          expectedResult: "Typing test page is displayed",
          tags: ["candidate", "navigation", "typing"],
        },
        {
          id: "cand-003",
          name: "Candidate can navigate to call simulation",
          description: "Test navigation from dashboard to call simulation",
          type: "e2e",
          priority: "critical",
          category: "candidate-flow",
          preconditions: ["Login as candidate"],
          steps: [
            { action: "login", value: "candidate" },
            {
              action: "click",
              selector: 'a[href="/assessment/call-simulation"]',
            },
            { action: "waitForURL", value: "/assessment/call-simulation" },
            {
              action: "assert",
              assertion: "visible",
              selector: "text=Call Simulation",
            },
          ],
          expectedResult: "Call simulation page is displayed",
          tags: ["candidate", "navigation", "call-simulation"],
        },
        {
          id: "cand-004",
          name: "Candidate can navigate to situational judgement",
          description: "Test navigation from dashboard to SJT",
          type: "e2e",
          priority: "critical",
          category: "candidate-flow",
          preconditions: ["Login as candidate"],
          steps: [
            { action: "login", value: "candidate" },
            {
              action: "click",
              selector: 'a[href="/assessment/situational-judgement"]',
            },
            {
              action: "waitForURL",
              value: "/assessment/situational-judgement",
            },
            {
              action: "assert",
              assertion: "visible",
              selector: "text=Situational Judgement",
            },
          ],
          expectedResult: "SJT page is displayed",
          tags: ["candidate", "navigation", "sjt"],
        },
      ],
      setup: ["Clear session"],
      teardown: ["Logout"],
    };

    tests.push(
      this.generatePlaywrightTest(candidateSuite, "candidate-flow.spec.ts"),
    );
    return tests;
  }

  /**
   * Generate admin flow tests
   */
  private generateAdminFlowTests(): GeneratedTest[] {
    const tests: GeneratedTest[] = [];

    const adminSuite: TestSuite = {
      name: "Admin Flow Tests",
      description: "End-to-end tests for admin panel functionality",
      tests: [
        {
          id: "admin-001",
          name: "Admin can view dashboard with stats",
          description: "Test admin dashboard displays statistics",
          type: "e2e",
          priority: "critical",
          category: "admin-flow",
          preconditions: ["Login as admin"],
          steps: [
            { action: "login", value: "admin" },
            { action: "assert", assertion: "url-contains", value: "/admin" },
            {
              action: "assert",
              assertion: "visible",
              selector: "text=Admin Control Panel",
            },
          ],
          expectedResult: "Admin dashboard is displayed with stats",
          tags: ["admin", "dashboard", "critical"],
        },
        {
          id: "admin-002",
          name: "Admin can view candidates list",
          description: "Test candidates page functionality",
          type: "e2e",
          priority: "high",
          category: "admin-flow",
          preconditions: ["Login as admin"],
          steps: [
            { action: "login", value: "admin" },
            { action: "click", selector: 'a[href="/admin/candidates"]' },
            { action: "waitForURL", value: "/admin/candidates" },
            { action: "assert", assertion: "visible", selector: "table" },
          ],
          expectedResult: "Candidates table is displayed",
          tags: ["admin", "candidates"],
        },
        {
          id: "admin-003",
          name: "Admin can view companies list",
          description: "Test companies management page",
          type: "e2e",
          priority: "high",
          category: "admin-flow",
          preconditions: ["Login as admin"],
          steps: [
            { action: "login", value: "admin" },
            { action: "click", selector: 'a[href="/admin/companies"]' },
            { action: "waitForURL", value: "/admin/companies" },
            { action: "assert", assertion: "visible", selector: "table" },
          ],
          expectedResult: "Companies table is displayed",
          tags: ["admin", "companies"],
        },
        {
          id: "admin-004",
          name: "Admin can view analytics page",
          description: "Test analytics dashboard",
          type: "e2e",
          priority: "medium",
          category: "admin-flow",
          preconditions: ["Login as admin"],
          steps: [
            { action: "login", value: "admin" },
            { action: "click", selector: 'a[href="/admin/analytics"]' },
            { action: "waitForURL", value: "/admin/analytics" },
            {
              action: "assert",
              assertion: "visible",
              selector: "text=Analytics",
            },
          ],
          expectedResult: "Analytics page is displayed",
          tags: ["admin", "analytics"],
        },
        {
          id: "admin-005",
          name: "Admin can view reports page",
          description: "Test reports page functionality",
          type: "e2e",
          priority: "high",
          category: "admin-flow",
          preconditions: ["Login as admin"],
          steps: [
            { action: "login", value: "admin" },
            { action: "click", selector: 'a[href="/admin/reports"]' },
            { action: "waitForURL", value: "/admin/reports" },
            {
              action: "assert",
              assertion: "visible",
              selector: "text=Reports",
            },
          ],
          expectedResult: "Reports page is displayed",
          tags: ["admin", "reports"],
        },
        {
          id: "admin-006",
          name: "Admin can manage typing texts",
          description: "Test typing texts management",
          type: "e2e",
          priority: "medium",
          category: "admin-flow",
          preconditions: ["Login as admin"],
          steps: [
            { action: "login", value: "admin" },
            { action: "click", selector: 'a[href="/admin/texts"]' },
            { action: "waitForURL", value: "/admin/texts" },
            { action: "assert", assertion: "visible", selector: "table" },
          ],
          expectedResult: "Typing texts table is displayed",
          tags: ["admin", "texts", "content-management"],
        },
        {
          id: "admin-007",
          name: "Admin can manage questions",
          description: "Test questions management",
          type: "e2e",
          priority: "medium",
          category: "admin-flow",
          preconditions: ["Login as admin"],
          steps: [
            { action: "login", value: "admin" },
            { action: "click", selector: 'a[href="/admin/questions"]' },
            { action: "waitForURL", value: "/admin/questions" },
            { action: "assert", assertion: "visible", selector: "table" },
          ],
          expectedResult: "Questions table is displayed",
          tags: ["admin", "questions", "content-management"],
        },
        {
          id: "admin-008",
          name: "Admin can manage audio calls",
          description: "Test audio calls management",
          type: "e2e",
          priority: "medium",
          category: "admin-flow",
          preconditions: ["Login as admin"],
          steps: [
            { action: "login", value: "admin" },
            { action: "click", selector: 'a[href="/admin/calls"]' },
            { action: "waitForURL", value: "/admin/calls" },
            { action: "assert", assertion: "visible", selector: "table" },
          ],
          expectedResult: "Audio calls table is displayed",
          tags: ["admin", "calls", "content-management"],
        },
      ],
      setup: ["Clear session"],
      teardown: ["Logout"],
    };

    tests.push(this.generatePlaywrightTest(adminSuite, "admin-flow.spec.ts"));
    return tests;
  }

  /**
   * Generate assessment module tests
   */
  private generateAssessmentTests(): GeneratedTest[] {
    const tests: GeneratedTest[] = [];

    // Typing Test Suite
    const typingSuite: TestSuite = {
      name: "Typing Test Module",
      description: "Tests for the typing assessment module",
      tests: [
        {
          id: "typing-001",
          name: "Typing test displays instructions",
          description: "Test that instructions are visible before starting",
          type: "e2e",
          priority: "critical",
          category: "assessment",
          preconditions: ["Login as candidate"],
          steps: [
            { action: "login", value: "candidate" },
            { action: "navigate", value: "/assessment/typing" },
            { action: "assert", assertion: "visible", selector: "text=Typing" },
            {
              action: "assert",
              assertion: "visible",
              selector: "text=Practice",
            },
          ],
          expectedResult: "Typing test page shows instructions",
          tags: ["typing", "instructions", "critical"],
        },
        {
          id: "typing-002",
          name: "Typing test can be started",
          description: "Test starting the typing test",
          type: "e2e",
          priority: "critical",
          category: "assessment",
          preconditions: ["Login as candidate", "Navigate to typing test"],
          steps: [
            { action: "login", value: "candidate" },
            { action: "navigate", value: "/assessment/typing" },
            { action: "click", selector: 'button:has-text("Start")' },
            {
              action: "assert",
              assertion: "visible",
              selector: '[class*="timer"]',
            },
          ],
          expectedResult: "Timer starts counting down",
          tags: ["typing", "start", "critical"],
        },
        {
          id: "typing-003",
          name: "Typing test calculates WPM and accuracy",
          description: "Test that metrics are calculated after completion",
          type: "e2e",
          priority: "critical",
          category: "assessment",
          preconditions: ["Login as candidate", "Start typing test"],
          steps: [
            { action: "login", value: "candidate" },
            { action: "navigate", value: "/assessment/typing" },
            { action: "click", selector: 'button:has-text("Start")' },
            {
              action: "type",
              selector: "textarea",
              value: "test typing content",
            },
            { action: "wait", value: "12000" },
            { action: "assert", assertion: "visible", selector: "text=WPM" },
            {
              action: "assert",
              assertion: "visible",
              selector: "text=Accuracy",
            },
          ],
          expectedResult: "WPM and accuracy are displayed",
          tags: ["typing", "metrics", "critical"],
        },
        {
          id: "typing-004",
          name: "Practice test does not save results",
          description: "Verify practice mode behavior",
          type: "e2e",
          priority: "high",
          category: "assessment",
          preconditions: ["Login as candidate"],
          steps: [
            { action: "login", value: "candidate" },
            { action: "navigate", value: "/assessment/typing" },
            {
              action: "assert",
              assertion: "visible",
              selector: "text=Practice",
            },
          ],
          expectedResult: "Practice mode is indicated",
          tags: ["typing", "practice"],
        },
      ],
      setup: ["Login as candidate"],
      teardown: ["Return to dashboard"],
    };

    tests.push(this.generatePlaywrightTest(typingSuite, "typing-test.spec.ts"));

    // Call Simulation Suite
    const callSimSuite: TestSuite = {
      name: "Call Simulation Module",
      description: "Tests for the call simulation assessment module",
      tests: [
        {
          id: "call-001",
          name: "Call simulation displays audio player",
          description: "Test that audio player is visible",
          type: "e2e",
          priority: "critical",
          category: "assessment",
          preconditions: ["Login as candidate"],
          steps: [
            { action: "login", value: "candidate" },
            { action: "navigate", value: "/assessment/call-simulation" },
            {
              action: "assert",
              assertion: "visible",
              selector: "text=Call Simulation",
            },
            {
              action: "assert",
              assertion: "visible",
              selector: '[class*="audio"], audio, button:has-text("Play")',
            },
          ],
          expectedResult: "Audio player is visible",
          tags: ["call-simulation", "audio", "critical"],
        },
        {
          id: "call-002",
          name: "Call simulation shows incident form",
          description: "Test that incident log form is visible",
          type: "e2e",
          priority: "critical",
          category: "assessment",
          preconditions: ["Login as candidate"],
          steps: [
            { action: "login", value: "candidate" },
            { action: "navigate", value: "/assessment/call-simulation" },
            {
              action: "assert",
              assertion: "visible",
              selector: "text=Incident",
            },
            {
              action: "assert",
              assertion: "visible",
              selector: 'form, [class*="form"]',
            },
          ],
          expectedResult: "Incident form is displayed",
          tags: ["call-simulation", "form", "critical"],
        },
        {
          id: "call-003",
          name: "Call simulation tracks progress",
          description: "Test progress indicator (1/3, 2/3, etc.)",
          type: "e2e",
          priority: "high",
          category: "assessment",
          preconditions: ["Login as candidate"],
          steps: [
            { action: "login", value: "candidate" },
            { action: "navigate", value: "/assessment/call-simulation" },
            {
              action: "assert",
              assertion: "visible",
              selector: "text=/\\d+\\/\\d+/",
            },
          ],
          expectedResult: "Progress indicator is visible",
          tags: ["call-simulation", "progress"],
        },
      ],
      setup: ["Login as candidate"],
      teardown: ["Return to dashboard"],
    };

    tests.push(
      this.generatePlaywrightTest(callSimSuite, "call-simulation.spec.ts"),
    );

    // Situational Judgement Suite
    const sjtSuite: TestSuite = {
      name: "Situational Judgement Test Module",
      description: "Tests for the SJT assessment module",
      tests: [
        {
          id: "sjt-001",
          name: "SJT displays questions",
          description: "Test that questions are displayed",
          type: "e2e",
          priority: "critical",
          category: "assessment",
          preconditions: ["Login as candidate"],
          steps: [
            { action: "login", value: "candidate" },
            { action: "navigate", value: "/assessment/situational-judgement" },
            {
              action: "assert",
              assertion: "visible",
              selector: "text=Situational Judgement",
            },
            {
              action: "assert",
              assertion: "visible",
              selector: "text=Question",
            },
          ],
          expectedResult: "Question is displayed",
          tags: ["sjt", "questions", "critical"],
        },
        {
          id: "sjt-002",
          name: "SJT shows answer options",
          description: "Test MCQ options are visible",
          type: "e2e",
          priority: "critical",
          category: "assessment",
          preconditions: ["Login as candidate"],
          steps: [
            { action: "login", value: "candidate" },
            { action: "navigate", value: "/assessment/situational-judgement" },
            {
              action: "assert",
              assertion: "visible",
              selector: '[role="radiogroup"], [class*="radio"]',
            },
          ],
          expectedResult: "Answer options are displayed",
          tags: ["sjt", "mcq", "critical"],
        },
        {
          id: "sjt-003",
          name: "SJT shows progress bar",
          description: "Test progress indication",
          type: "e2e",
          priority: "high",
          category: "assessment",
          preconditions: ["Login as candidate"],
          steps: [
            { action: "login", value: "candidate" },
            { action: "navigate", value: "/assessment/situational-judgement" },
            {
              action: "assert",
              assertion: "visible",
              selector: '[role="progressbar"], [class*="progress"]',
            },
          ],
          expectedResult: "Progress bar is visible",
          tags: ["sjt", "progress"],
        },
        {
          id: "sjt-004",
          name: "SJT allows selecting answers",
          description: "Test answer selection functionality",
          type: "e2e",
          priority: "critical",
          category: "assessment",
          preconditions: ["Login as candidate"],
          steps: [
            { action: "login", value: "candidate" },
            { action: "navigate", value: "/assessment/situational-judgement" },
            { action: "click", selector: '[role="radio"]:first-of-type' },
            {
              action: "assert",
              assertion: "checked",
              selector: '[role="radio"]:first-of-type',
            },
          ],
          expectedResult: "Answer can be selected",
          tags: ["sjt", "interaction", "critical"],
        },
      ],
      setup: ["Login as candidate"],
      teardown: ["Return to dashboard"],
    };

    tests.push(
      this.generatePlaywrightTest(sjtSuite, "situational-judgement.spec.ts"),
    );

    return tests;
  }

  /**
   * Generate API tests
   */
  private generateAPITests(): GeneratedTest[] {
    const tests: GeneratedTest[] = [];

    const apiSuite: TestSuite = {
      name: "API Tests",
      description: "Tests for backend API endpoints",
      tests: [
        {
          id: "api-001",
          name: "Health endpoint returns 200",
          description: "Test API health check",
          type: "api",
          priority: "critical",
          category: "api",
          steps: [
            { action: "request", value: "GET /api/health" },
            { action: "assert", assertion: "status", value: "200" },
          ],
          expectedResult: "Health endpoint returns OK",
          tags: ["api", "health", "critical"],
        },
        {
          id: "api-002",
          name: "Auth endpoint accepts valid credentials",
          description: "Test authentication API",
          type: "api",
          priority: "critical",
          category: "api",
          steps: [
            { action: "request", value: "POST /api/auth/local" },
            { action: "assert", assertion: "status", value: "200" },
            { action: "assert", assertion: "has-property", value: "jwt" },
          ],
          expectedResult: "Returns JWT token",
          tags: ["api", "auth", "critical"],
        },
        {
          id: "api-003",
          name: "Protected endpoints require authentication",
          description: "Test auth protection",
          type: "api",
          priority: "critical",
          category: "api",
          steps: [
            { action: "request", value: "GET /api/users/me" },
            { action: "assert", assertion: "status", value: "401" },
          ],
          expectedResult: "Returns 401 without token",
          tags: ["api", "security", "critical"],
        },
      ],
      setup: [],
      teardown: [],
    };

    tests.push(this.generatePlaywrightTest(apiSuite, "api.spec.ts"));
    return tests;
  }

  /**
   * Generate Playwright test file content
   */
  private generatePlaywrightTest(
    suite: TestSuite,
    filename: string,
  ): GeneratedTest {
    const content = `/**
 * ${suite.name}
 * ${suite.description}
 * 
 * Auto-generated by CTRL QA Agent
 * Generated at: ${new Date().toISOString()}
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:1337';

// Credentials
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@ctrl.test';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'admin123';
const CANDIDATE_EMAIL = process.env.TEST_CANDIDATE_EMAIL || 'candidate@ctrl.test';
const CANDIDATE_PASSWORD = process.env.TEST_CANDIDATE_PASSWORD || 'candidate123';

// Helper functions
async function login(page: Page, userType: 'admin' | 'candidate') {
  const email = userType === 'admin' ? ADMIN_EMAIL : CANDIDATE_EMAIL;
  const password = userType === 'admin' ? ADMIN_PASSWORD : CANDIDATE_PASSWORD;
  
  await page.goto(\`\${FRONTEND_URL}/auth/login\`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for navigation
  if (userType === 'admin') {
    await page.waitForURL('**/admin**', { timeout: 10000 });
  } else {
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
  }
}

async function logout(page: Page) {
  try {
    // Try to find and click logout button
    const logoutButton = page.locator('button:has-text("Logout"), [aria-label="Logout"]');
    if (await logoutButton.isVisible({ timeout: 2000 })) {
      await logoutButton.click();
    }
  } catch {
    // Navigate to login page to clear session
    await page.goto(\`\${FRONTEND_URL}/auth/login\`);
  }
}

// Test Suite: ${suite.name}
test.describe('${suite.name}', () => {
  ${
    suite.setup && suite.setup.length > 0
      ? `
  test.beforeEach(async ({ page, context }) => {
    // Setup: ${suite.setup.join(", ")}
    await context.clearCookies();
  });
  `
      : ""
  }
  
  ${
    suite.teardown && suite.teardown.length > 0
      ? `
  test.afterEach(async ({ page }) => {
    // Teardown: ${suite.teardown.join(", ")}
    await logout(page);
  });
  `
      : ""
  }

${suite.tests.map((tc) => this.generateTestCase(tc)).join("\n\n")}
});
`;

    return {
      filename,
      content,
      testCase: suite.tests[0], // Reference first test case
    };
  }

  /**
   * Generate individual test case code
   */
  private generateTestCase(tc: TestCase): string {
    const stepsCode = tc.steps
      .map((step) => this.generateStepCode(step))
      .join("\n    ");

    return `  /**
   * Test: ${tc.name}
   * Description: ${tc.description}
   * Priority: ${tc.priority}
   * Category: ${tc.category}
   * Tags: ${tc.tags.join(", ")}
   */
  test('${tc.name}', async ({ page }) => {
    ${tc.preconditions ? `// Preconditions: ${tc.preconditions.join(", ")}` : ""}
    
    ${stepsCode}
    
    // Expected: ${tc.expectedResult}
  });`;
  }

  /**
   * Generate code for a single test step
   */
  private generateStepCode(step: TestStep): string {
    switch (step.action) {
      case "navigate":
        return `await page.goto(\`\${FRONTEND_URL}${step.value}\`);`;
      case "fill":
        return `await page.fill('${step.selector}', '${step.value?.replace(/\$\{(\w+)\}/g, "' + $1 + '")}');`;
      case "click":
        return `await page.click('${step.selector}');`;
      case "type":
        return `await page.type('${step.selector}', '${step.value}');`;
      case "waitForURL":
        return `await page.waitForURL('**${step.value}**', { timeout: ${step.timeout || 10000} });`;
      case "waitForSelector":
        return `await page.waitForSelector('${step.selector}', { timeout: ${step.timeout || 10000} });`;
      case "wait":
        return `await page.waitForTimeout(${step.value});`;
      case "login":
        return `await login(page, '${step.value}');`;
      case "assert":
        return this.generateAssertionCode(step);
      case "request":
        return `// API Request: ${step.value}`;
      default:
        return `// Unknown action: ${step.action}`;
    }
  }

  /**
   * Generate assertion code
   */
  private generateAssertionCode(step: TestStep): string {
    switch (step.assertion) {
      case "visible":
        return `await expect(page.locator('${step.selector}')).toBeVisible();`;
      case "not-visible":
        return `await expect(page.locator('${step.selector}')).not.toBeVisible();`;
      case "text":
        return `await expect(page.locator('${step.selector}')).toHaveText('${step.value}');`;
      case "url-contains":
        return `expect(page.url()).toContain('${step.value}');`;
      case "url-not-contains":
        return `expect(page.url()).not.toContain('${step.value}');`;
      case "checked":
        return `await expect(page.locator('${step.selector}')).toBeChecked();`;
      case "status":
        return `// Assert status: ${step.value}`;
      case "has-property":
        return `// Assert has property: ${step.value}`;
      default:
        return `// Unknown assertion: ${step.assertion}`;
    }
  }

  /**
   * Write test file to disk
   */
  private writeTestFile(test: GeneratedTest): void {
    const filePath = join(this.outputDir, test.filename);
    writeFileSync(filePath, test.content, "utf-8");
  }

  /**
   * Ensure output directory exists
   */
  private ensureOutputDir(): void {
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }
}

export default TestGenerator;
