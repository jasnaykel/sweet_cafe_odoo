/**
 * CTRL QA Agent - Type Definitions
 * Core types for the autonomous QA system
 */

// ============================================
// DISCOVERY TYPES
// ============================================

export interface ProjectStructure {
  name: string;
  type: "nextjs" | "react" | "strapi" | "express" | "unknown";
  version: string;
  routes: RouteInfo[];
  components: ComponentInfo[];
  apiEndpoints: ApiEndpoint[];
  authConfig: AuthConfig | null;
  pages: PageInfo[];
}

export interface RouteInfo {
  path: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  type: "page" | "api" | "dynamic";
  protected: boolean;
  params?: string[];
  file: string;
}

export interface ComponentInfo {
  name: string;
  file: string;
  type: "page" | "component" | "layout";
  props?: string[];
  hasForm: boolean;
  hasAuth: boolean;
  interactions: string[];
}

export interface ApiEndpoint {
  path: string;
  method: string;
  controller?: string;
  authentication: boolean;
  permissions?: string[];
  requestBody?: object;
  responseType?: string;
}

export interface AuthConfig {
  provider: string;
  routes: {
    login: string;
    register?: string;
    logout?: string;
    forgotPassword?: string;
  };
  roles: string[];
}

export interface PageInfo {
  route: string;
  title: string;
  file: string;
  requiresAuth: boolean;
  role?: string;
  formElements: FormElement[];
  actions: PageAction[];
}

export interface FormElement {
  name: string;
  type: string;
  required: boolean;
  validation?: string;
}

export interface PageAction {
  type: "button" | "link" | "submit" | "navigation";
  label: string;
  target?: string;
}

// ============================================
// TEST GENERATION TYPES
// ============================================

export interface TestCase {
  id: string;
  name: string;
  description: string;
  type: "e2e" | "api" | "unit" | "integration";
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  steps: TestStep[];
  preconditions?: string[];
  expectedResult: string;
  tags: string[];
}

export interface TestStep {
  action: string;
  selector?: string;
  value?: string;
  assertion?: string;
  timeout?: number;
}

export interface TestSuite {
  name: string;
  description: string;
  tests: TestCase[];
  setup?: string[];
  teardown?: string[];
}

export interface GeneratedTest {
  filename: string;
  content: string;
  testCase: TestCase;
}

// ============================================
// EXECUTION TYPES
// ============================================

export interface TestResult {
  testId: string;
  testName: string;
  suite: string;
  status: "passed" | "failed" | "skipped" | "error";
  duration: number;
  error?: TestError;
  screenshots?: string[];
  video?: string;
  retries: number;
  browser: string;
  timestamp: Date;
}

export interface TestError {
  message: string;
  stack?: string;
  type:
    | "assertion"
    | "timeout"
    | "element_not_found"
    | "network"
    | "javascript"
    | "unknown";
  selector?: string;
  expected?: string;
  actual?: string;
  screenshot?: string;
}

export interface ExecutionSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  startTime: Date;
  endTime: Date;
  results: TestResult[];
  coverage?: CoverageInfo;
}

export interface CoverageInfo {
  pages: number;
  routes: number;
  apis: number;
  components: number;
  percentage: number;
}

// ============================================
// ANALYSIS TYPES
// ============================================

export interface ErrorAnalysis {
  testId: string;
  error: TestError;
  rootCause: string;
  category: ErrorCategory;
  severity: "critical" | "high" | "medium" | "low";
  affectedArea: string;
  suggestedFix: string;
  codeExample?: string;
  relatedTests: string[];
  businessImpact: string;
}

export type ErrorCategory =
  | "authentication"
  | "validation"
  | "navigation"
  | "api_integration"
  | "state_management"
  | "ui_rendering"
  | "performance"
  | "accessibility"
  | "data_integrity"
  | "unknown";

export interface FlowAnalysis {
  flowName: string;
  status: "working" | "broken" | "partial";
  completedSteps: number;
  totalSteps: number;
  failurePoint?: string;
  errors: ErrorAnalysis[];
  recommendations: string[];
}

// ============================================
// REPORT TYPES
// ============================================

export interface QAReport {
  projectName: string;
  version: string;
  generatedAt: Date;
  summary: ExecutionSummary;
  projectStructure: ProjectStructure;
  flowAnalysis: FlowAnalysis[];
  errorAnalysis: ErrorAnalysis[];
  recommendations: Recommendation[];
  healthScore: number;
  criticalIssues: CriticalIssue[];
}

export interface Recommendation {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  area: string;
  title: string;
  description: string;
  impact: string;
  effort: "low" | "medium" | "high";
  codeExample?: string;
}

export interface CriticalIssue {
  id: string;
  title: string;
  description: string;
  affectedFeature: string;
  businessImpact: string;
  reproduction: string[];
  suggestedFix: string;
}

// ============================================
// CONFIGURATION TYPES
// ============================================

export interface QAConfig {
  projectPaths: {
    frontend: string;
    backend: string;
  };
  urls: {
    frontend: string;
    backend: string;
  };
  auth: {
    adminCredentials: { email: string; password: string };
    candidateCredentials: { email: string; password: string };
  };
  execution: {
    headless: boolean;
    slowMo: number;
    timeout: number;
    retries: number;
    parallel: boolean;
  };
  reporting: {
    outputDir: string;
    screenshotOnFailure: boolean;
    videoOnFailure: boolean;
    formats: ("html" | "json" | "pdf")[];
  };
  ai: {
    provider: "openai" | "google";
    model: string;
    maxTokens: number;
  };
}

// ============================================
// CTRL SPECIFIC TYPES
// ============================================

export interface CTRLFlows {
  candidateFlows: CandidateFlow[];
  adminFlows: AdminFlow[];
}

export interface CandidateFlow {
  name: string;
  description: string;
  steps: string[];
  criticalPath: boolean;
}

export interface AdminFlow {
  name: string;
  description: string;
  steps: string[];
  permissions: string[];
}

export interface AssessmentModule {
  name: "typing" | "call-simulation" | "situational-judgement";
  route: string;
  hasPractice: boolean;
  hasTimer: boolean;
  hasProgress: boolean;
  autoSave: boolean;
}
