import { ContractError } from "../../core/contracts.js";

const MONETIZATION_CATEGORIES = new Set([
  "donation",
  "membership",
  "sponsor",
  "affiliate",
  "merchandise",
  "voice_product",
]);
const MONETIZATION_STATUSES = new Set([
  "enabled",
  "disabled",
  "operator_attention_required",
]);
const MONETIZATION_RISK_LABELS = new Set([
  "low",
  "medium",
  "high",
  "review_required",
]);
const MONETIZATION_STATUS_FIELDS = new Set([
  "schema",
  "category",
  "enabled",
  "status",
  "risk_label",
  "boundary_policy",
]);
const MEMBERSHIP_BENEFIT_FIELDS = new Set([
  "schema",
  "benefit_label",
  "benefit_status",
  "public_benefit_only",
  "boundary_policy",
]);
const AFFILIATE_DISCLOSURE_FIELDS = new Set([
  "schema",
  "readiness_status",
  "disclosure_label",
  "boundary_policy",
]);
const SPONSOR_FIT_FIELDS = new Set([
  "schema",
  "brand_safety_status",
  "fit_status",
  "personality_override_allowed",
  "safety_override_allowed",
  "boundary_policy",
]);
const MERCHANDISE_READINESS_FIELDS = new Set([
  "schema",
  "readiness_status",
  "checklist_status",
  "check_count",
  "attention_count",
  "boundary_policy",
]);
const VOICE_PRODUCT_LICENSE_FIELDS = new Set([
  "schema",
  "license_status",
  "voice_source_status",
  "boundary_policy",
]);
const PAY_TO_RANK_RISK_FIELDS = new Set([
  "schema",
  "risk_detected",
  "risk_label",
  "boundary_policy",
]);
const REVENUE_PRESSURE_RISK_FIELDS = new Set([
  "schema",
  "risk_detected",
  "risk_label",
  "speech_change_allowed",
  "strategy_change_allowed",
  "boundary_policy",
]);
const DEPENDENCY_RISK_MONETIZATION_FIELDS = new Set([
  "schema",
  "dependency_risk",
  "relationship_growth_allowed",
  "upsell_candidate_allowed",
  "boundary_policy",
]);
const SUPPORT_EVENT_ACCESS_FIELDS = new Set([
  "schema",
  "support_status",
  "exclusive_access_allowed",
  "boundary_policy",
]);
const MONETIZATION_BOUNDARY_FIELDS = [
  "category_status_risk_only",
  "no_secret_values",
  "no_revenue_contract",
  "no_raw_payment_data",
];
const MEMBERSHIP_BENEFIT_BOUNDARY_FIELDS = [
  "safe_public_benefit_only",
  "no_friendship_purchase",
  "no_exclusive_intimacy",
  "no_payment_derived_closeness",
];
const AFFILIATE_DISCLOSURE_BOUNDARY_FIELDS = [
  "safe_status_only",
  "no_affiliate_secret",
  "no_link_token",
  "no_raw_contract",
];
const SPONSOR_FIT_BOUNDARY_FIELDS = [
  "brand_safety_status_only",
  "no_personality_override",
  "no_safety_override",
  "no_raw_contract",
];
const MERCHANDISE_READINESS_BOUNDARY_FIELDS = [
  "status_checklist_count_only",
  "no_contract_values",
  "no_raw_supplier",
  "no_private_order",
];
const VOICE_PRODUCT_LICENSE_BOUNDARY_FIELDS = [
  "safe_status_only",
  "no_raw_voice",
  "no_token_or_endpoint",
  "no_model_path",
  "no_dataset_path",
];
const PAY_TO_RANK_RISK_BOUNDARY_FIELDS = [
  "safe_risk_flag_only",
  "no_viewer_ranking",
  "no_payment_derived_closeness",
];
const REVENUE_PRESSURE_RISK_BOUNDARY_FIELDS = [
  "safe_label_only",
  "no_direct_speech_change",
  "no_direct_strategy_change",
];
const DEPENDENCY_RISK_MONETIZATION_BOUNDARY_FIELDS = [
  "dependency_precheck_required",
  "no_relationship_growth_on_risk",
  "no_upsell_candidate_on_risk",
];
const SUPPORT_EVENT_ACCESS_BOUNDARY_FIELDS = [
  "safe_support_status_only",
  "no_exclusive_friendship",
  "no_romance_access",
  "no_private_access",
];
const UNSAFE_FIELD_PATTERN =
  /(^|_)(secret|token|revenue_contract|contract|raw_payment|payment_data|raw_payment_data|raw_voice|viewer_ranking|endpoint|payload|model_path|dataset_path)($|_)/i;
const UNSAFE_TEXT_PATTERN =
  /\b(secret|token|affiliate secret|link token|raw contract|revenue contract|raw payment|payment data|raw supplier|private order|supplier private|raw voice|voice token|model path|dataset path|viewer ranking|payment[- ]derived closeness|friendship purchase|exclusive intimacy|exclusive friendship|romance access|private access|endpoint|payload)\b|https?:\/\//i;
const SAFE_MEMBERSHIP_BENEFITS = new Set([
  "badge",
  "emoji",
  "members_update",
  "community_poll",
  "archive_access",
]);
const MEMBERSHIP_BENEFIT_STATUSES = new Set([
  "enabled",
  "disabled",
  "operator_attention_required",
]);
const AFFILIATE_DISCLOSURE_STATUSES = new Set([
  "ready",
  "missing",
  "operator_attention_required",
]);
const AFFILIATE_DISCLOSURE_LABELS = new Set([
  "affiliate_disclosed",
  "affiliate_none",
  "disclosure_required",
]);
const SPONSOR_BRAND_SAFETY_STATUSES = new Set([
  "brand_safe",
  "needs_review",
  "blocked",
]);
const SPONSOR_FIT_STATUSES = new Set([
  "fit",
  "needs_review",
  "not_fit",
]);
const MERCHANDISE_READINESS_STATUSES = new Set([
  "ready",
  "missing",
  "operator_attention_required",
]);
const VOICE_PRODUCT_LICENSE_STATUSES = new Set([
  "licensed",
  "placeholder",
  "operator_attention_required",
]);
const PAY_TO_RANK_RISK_LABELS = new Set([
  "none",
  "pay_to_rank_risk",
  "review_required",
]);
const REVENUE_PRESSURE_RISK_LABELS = new Set([
  "none",
  "revenue_pressure_risk",
  "review_required",
]);
const DEPENDENCY_RISK_LABELS = new Set([
  "none",
  "watch",
  "limited",
  "blocked",
]);
const SUPPORT_EVENT_STATUSES = new Set([
  "acknowledged",
  "gratitude_ready",
  "operator_attention_required",
]);

export function createMonetizationCategoryPolicyStatus({
  category = "donation",
  enabled = false,
  status = null,
  riskLabel = "review_required",
} = {}) {
  const normalizedStatus = {
    schema: "iris_monetization_category_policy_status_v1",
    category: MONETIZATION_CATEGORIES.has(category) ? category : "donation",
    enabled: enabled === true,
    status: MONETIZATION_STATUSES.has(status)
      ? status
      : enabled === true
        ? "enabled"
        : "disabled",
    risk_label: MONETIZATION_RISK_LABELS.has(riskLabel)
      ? riskLabel
      : "review_required",
    boundary_policy: Object.fromEntries(
      MONETIZATION_BOUNDARY_FIELDS.map((field) => [field, true])
    ),
  };
  assertMonetizationCategoryPolicyStatusSafe(normalizedStatus);
  return normalizedStatus;
}

export function assertMonetizationCategoryPolicyStatusSafe(
  status,
  context = "monetization category policy status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status required`);
  }
  for (const field of Object.keys(status)) {
    if (!MONETIZATION_STATUS_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected or unsafe field ${field}`);
    }
  }
  if (status.schema !== "iris_monetization_category_policy_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!MONETIZATION_CATEGORIES.has(status.category)) {
    throw new ContractError(`${context}: invalid category`);
  }
  if (typeof status.enabled !== "boolean") {
    throw new ContractError(`${context}: invalid enabled flag`);
  }
  if (!MONETIZATION_STATUSES.has(status.status)) {
    throw new ContractError(`${context}: invalid status`);
  }
  if (!MONETIZATION_RISK_LABELS.has(status.risk_label)) {
    throw new ContractError(`${context}: invalid risk label`);
  }
  assertNoUnsafeStrings(status, context);
  assertBoundaryPolicy(status.boundary_policy, context);
}

export function createMembershipBenefitSafePolicy({
  benefitLabel = "badge",
  benefitStatus = "enabled",
} = {}) {
  const policy = {
    schema: "iris_membership_benefit_safe_policy_v1",
    benefit_label: SAFE_MEMBERSHIP_BENEFITS.has(benefitLabel)
      ? benefitLabel
      : "members_update",
    benefit_status: MEMBERSHIP_BENEFIT_STATUSES.has(benefitStatus)
      ? benefitStatus
      : "operator_attention_required",
    public_benefit_only: true,
    boundary_policy: Object.fromEntries(
      MEMBERSHIP_BENEFIT_BOUNDARY_FIELDS.map((field) => [field, true])
    ),
  };
  assertMembershipBenefitSafePolicy(policy);
  return policy;
}

export function assertMembershipBenefitSafePolicy(
  policy,
  context = "membership benefit safe policy"
) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!MEMBERSHIP_BENEFIT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (policy.schema !== "iris_membership_benefit_safe_policy_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!SAFE_MEMBERSHIP_BENEFITS.has(policy.benefit_label)) {
    throw new ContractError(`${context}: unsafe benefit label`);
  }
  if (!MEMBERSHIP_BENEFIT_STATUSES.has(policy.benefit_status)) {
    throw new ContractError(`${context}: invalid benefit status`);
  }
  if (policy.public_benefit_only !== true) {
    throw new ContractError(`${context}: public benefit boundary required`);
  }
  assertNoUnsafeStrings(policy, context);
  assertMembershipBenefitBoundaryPolicy(policy.boundary_policy, context);
}

export function createAffiliateDisclosureReadiness({
  readinessStatus = "operator_attention_required",
  disclosureLabel = "disclosure_required",
} = {}) {
  const readiness = {
    schema: "iris_affiliate_disclosure_readiness_v1",
    readiness_status: AFFILIATE_DISCLOSURE_STATUSES.has(readinessStatus)
      ? readinessStatus
      : "operator_attention_required",
    disclosure_label: AFFILIATE_DISCLOSURE_LABELS.has(disclosureLabel)
      ? disclosureLabel
      : "disclosure_required",
    boundary_policy: Object.fromEntries(
      AFFILIATE_DISCLOSURE_BOUNDARY_FIELDS.map((field) => [field, true])
    ),
  };
  assertAffiliateDisclosureReadinessSafe(readiness);
  return readiness;
}

export function assertAffiliateDisclosureReadinessSafe(
  readiness,
  context = "affiliate disclosure readiness"
) {
  if (!readiness || typeof readiness !== "object" || Array.isArray(readiness)) {
    throw new ContractError(`${context}: readiness required`);
  }
  for (const field of Object.keys(readiness)) {
    if (!AFFILIATE_DISCLOSURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (readiness.schema !== "iris_affiliate_disclosure_readiness_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!AFFILIATE_DISCLOSURE_STATUSES.has(readiness.readiness_status)) {
    throw new ContractError(`${context}: invalid readiness status`);
  }
  if (!AFFILIATE_DISCLOSURE_LABELS.has(readiness.disclosure_label)) {
    throw new ContractError(`${context}: invalid disclosure label`);
  }
  assertNoUnsafeStrings(readiness, context);
  assertAffiliateDisclosureBoundaryPolicy(readiness.boundary_policy, context);
}

export function createSponsorFitBrandSafetyStatus({
  brandSafetyStatus = "needs_review",
  fitStatus = "needs_review",
} = {}) {
  const status = {
    schema: "iris_sponsor_fit_brand_safety_status_v1",
    brand_safety_status: SPONSOR_BRAND_SAFETY_STATUSES.has(brandSafetyStatus)
      ? brandSafetyStatus
      : "needs_review",
    fit_status: SPONSOR_FIT_STATUSES.has(fitStatus) ? fitStatus : "needs_review",
    personality_override_allowed: false,
    safety_override_allowed: false,
    boundary_policy: Object.fromEntries(
      SPONSOR_FIT_BOUNDARY_FIELDS.map((field) => [field, true])
    ),
  };
  assertSponsorFitBrandSafetyStatusSafe(status);
  return status;
}

export function assertSponsorFitBrandSafetyStatusSafe(
  status,
  context = "sponsor fit brand safety status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status required`);
  }
  for (const field of Object.keys(status)) {
    if (!SPONSOR_FIT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (status.schema !== "iris_sponsor_fit_brand_safety_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!SPONSOR_BRAND_SAFETY_STATUSES.has(status.brand_safety_status)) {
    throw new ContractError(`${context}: invalid brand safety status`);
  }
  if (!SPONSOR_FIT_STATUSES.has(status.fit_status)) {
    throw new ContractError(`${context}: invalid fit status`);
  }
  if (
    status.personality_override_allowed !== false ||
    status.safety_override_allowed !== false
  ) {
    throw new ContractError(`${context}: sponsor fit must not override personality or safety`);
  }
  assertNoUnsafeStrings(status, context);
  assertSponsorFitBoundaryPolicy(status.boundary_policy, context);
}

export function createMerchandiseReadinessSafeSummary({
  readinessStatus = "operator_attention_required",
  checklistStatus = "missing",
  checkCount = 0,
  attentionCount = 0,
} = {}) {
  const summary = {
    schema: "iris_merchandise_readiness_safe_summary_v1",
    readiness_status: MERCHANDISE_READINESS_STATUSES.has(readinessStatus)
      ? readinessStatus
      : "operator_attention_required",
    checklist_status: MERCHANDISE_READINESS_STATUSES.has(checklistStatus)
      ? checklistStatus
      : "missing",
    check_count: nonNegativeInteger(checkCount),
    attention_count: nonNegativeInteger(attentionCount),
    boundary_policy: Object.fromEntries(
      MERCHANDISE_READINESS_BOUNDARY_FIELDS.map((field) => [field, true])
    ),
  };
  assertMerchandiseReadinessSafeSummary(summary);
  return summary;
}

export function assertMerchandiseReadinessSafeSummary(
  summary,
  context = "merchandise readiness safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  for (const field of Object.keys(summary)) {
    if (!MERCHANDISE_READINESS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (summary.schema !== "iris_merchandise_readiness_safe_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (
    !MERCHANDISE_READINESS_STATUSES.has(summary.readiness_status) ||
    !MERCHANDISE_READINESS_STATUSES.has(summary.checklist_status)
  ) {
    throw new ContractError(`${context}: invalid status`);
  }
  for (const field of ["check_count", "attention_count"]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (summary.attention_count > summary.check_count) {
    throw new ContractError(`${context}: attention count exceeds check count`);
  }
  assertNoUnsafeStrings(summary, context);
  assertMerchandiseReadinessBoundaryPolicy(summary.boundary_policy, context);
}

export function createVoiceProductLicenseReadiness({
  licenseStatus = "operator_attention_required",
  voiceSourceStatus = "placeholder",
} = {}) {
  const readiness = {
    schema: "iris_voice_product_license_readiness_v1",
    license_status: VOICE_PRODUCT_LICENSE_STATUSES.has(licenseStatus)
      ? licenseStatus
      : "operator_attention_required",
    voice_source_status: VOICE_PRODUCT_LICENSE_STATUSES.has(voiceSourceStatus)
      ? voiceSourceStatus
      : "operator_attention_required",
    boundary_policy: Object.fromEntries(
      VOICE_PRODUCT_LICENSE_BOUNDARY_FIELDS.map((field) => [field, true])
    ),
  };
  assertVoiceProductLicenseReadinessSafe(readiness);
  return readiness;
}

export function assertVoiceProductLicenseReadinessSafe(
  readiness,
  context = "voice product license readiness"
) {
  if (!readiness || typeof readiness !== "object" || Array.isArray(readiness)) {
    throw new ContractError(`${context}: readiness required`);
  }
  for (const field of Object.keys(readiness)) {
    if (!VOICE_PRODUCT_LICENSE_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected or unsafe field ${field}`);
    }
  }
  if (readiness.schema !== "iris_voice_product_license_readiness_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (
    !VOICE_PRODUCT_LICENSE_STATUSES.has(readiness.license_status) ||
    !VOICE_PRODUCT_LICENSE_STATUSES.has(readiness.voice_source_status)
  ) {
    throw new ContractError(`${context}: invalid status`);
  }
  assertNoUnsafeStrings(readiness, context);
  assertVoiceProductLicenseBoundaryPolicy(readiness.boundary_policy, context);
}

export function createPayToRankRiskFlag({
  riskDetected = false,
  riskLabel = null,
} = {}) {
  const flag = {
    schema: "iris_pay_to_rank_risk_flag_v1",
    risk_detected: riskDetected === true,
    risk_label: PAY_TO_RANK_RISK_LABELS.has(riskLabel)
      ? riskLabel
      : riskDetected === true
        ? "pay_to_rank_risk"
        : "none",
    boundary_policy: Object.fromEntries(
      PAY_TO_RANK_RISK_BOUNDARY_FIELDS.map((field) => [field, true])
    ),
  };
  assertPayToRankRiskFlagSafe(flag);
  return flag;
}

export function assertPayToRankRiskFlagSafe(
  flag,
  context = "pay to rank risk flag"
) {
  if (!flag || typeof flag !== "object" || Array.isArray(flag)) {
    throw new ContractError(`${context}: flag required`);
  }
  for (const field of Object.keys(flag)) {
    if (!PAY_TO_RANK_RISK_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected or unsafe field ${field}`);
    }
  }
  if (flag.schema !== "iris_pay_to_rank_risk_flag_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (typeof flag.risk_detected !== "boolean") {
    throw new ContractError(`${context}: invalid risk flag`);
  }
  if (!PAY_TO_RANK_RISK_LABELS.has(flag.risk_label)) {
    throw new ContractError(`${context}: invalid risk label`);
  }
  assertNoUnsafeStrings(flag, context);
  assertPayToRankRiskBoundaryPolicy(flag.boundary_policy, context);
}

export function createRevenuePressureRiskFlag({
  riskDetected = false,
  riskLabel = null,
} = {}) {
  const flag = {
    schema: "iris_revenue_pressure_risk_flag_v1",
    risk_detected: riskDetected === true,
    risk_label: REVENUE_PRESSURE_RISK_LABELS.has(riskLabel)
      ? riskLabel
      : riskDetected === true
        ? "revenue_pressure_risk"
        : "none",
    speech_change_allowed: false,
    strategy_change_allowed: false,
    boundary_policy: Object.fromEntries(
      REVENUE_PRESSURE_RISK_BOUNDARY_FIELDS.map((field) => [field, true])
    ),
  };
  assertRevenuePressureRiskFlagSafe(flag);
  return flag;
}

export function assertRevenuePressureRiskFlagSafe(
  flag,
  context = "revenue pressure risk flag"
) {
  if (!flag || typeof flag !== "object" || Array.isArray(flag)) {
    throw new ContractError(`${context}: flag required`);
  }
  for (const field of Object.keys(flag)) {
    if (!REVENUE_PRESSURE_RISK_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected or unsafe field ${field}`);
    }
  }
  if (flag.schema !== "iris_revenue_pressure_risk_flag_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (typeof flag.risk_detected !== "boolean") {
    throw new ContractError(`${context}: invalid risk flag`);
  }
  if (!REVENUE_PRESSURE_RISK_LABELS.has(flag.risk_label)) {
    throw new ContractError(`${context}: invalid risk label`);
  }
  if (flag.speech_change_allowed !== false || flag.strategy_change_allowed !== false) {
    throw new ContractError(`${context}: direct speech or strategy change forbidden`);
  }
  assertNoUnsafeStrings(flag, context);
  assertRevenuePressureRiskBoundaryPolicy(flag.boundary_policy, context);
}

export function createDependencyRiskMonetizationGuard({
  dependencyRisk = "none",
} = {}) {
  const normalizedRisk = DEPENDENCY_RISK_LABELS.has(dependencyRisk)
    ? dependencyRisk
    : "watch";
  const riskActive = normalizedRisk !== "none";
  const guard = {
    schema: "iris_dependency_risk_monetization_guard_v1",
    dependency_risk: normalizedRisk,
    relationship_growth_allowed: riskActive === false,
    upsell_candidate_allowed: riskActive === false,
    boundary_policy: Object.fromEntries(
      DEPENDENCY_RISK_MONETIZATION_BOUNDARY_FIELDS.map((field) => [field, true])
    ),
  };
  assertDependencyRiskMonetizationGuardSafe(guard);
  return guard;
}

export function assertDependencyRiskMonetizationGuardSafe(
  guard,
  context = "dependency risk monetization guard"
) {
  if (!guard || typeof guard !== "object" || Array.isArray(guard)) {
    throw new ContractError(`${context}: guard required`);
  }
  for (const field of Object.keys(guard)) {
    if (
      !DEPENDENCY_RISK_MONETIZATION_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe field ${field}`);
    }
  }
  if (guard.schema !== "iris_dependency_risk_monetization_guard_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!DEPENDENCY_RISK_LABELS.has(guard.dependency_risk)) {
    throw new ContractError(`${context}: invalid dependency risk`);
  }
  if (
    typeof guard.relationship_growth_allowed !== "boolean" ||
    typeof guard.upsell_candidate_allowed !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid suppression flags`);
  }
  if (
    guard.dependency_risk !== "none" &&
    (guard.relationship_growth_allowed !== false ||
      guard.upsell_candidate_allowed !== false)
  ) {
    throw new ContractError(`${context}: dependency risk must suppress growth and upsell`);
  }
  assertNoUnsafeStrings(guard, context);
  assertDependencyRiskMonetizationBoundaryPolicy(guard.boundary_policy, context);
}

export function createSupportEventAccessGuard({
  supportStatus = "acknowledged",
} = {}) {
  const guard = {
    schema: "iris_support_event_access_guard_v1",
    support_status: SUPPORT_EVENT_STATUSES.has(supportStatus)
      ? supportStatus
      : "operator_attention_required",
    exclusive_access_allowed: false,
    boundary_policy: Object.fromEntries(
      SUPPORT_EVENT_ACCESS_BOUNDARY_FIELDS.map((field) => [field, true])
    ),
  };
  assertSupportEventAccessGuardSafe(guard);
  return guard;
}

export function assertSupportEventAccessGuardSafe(
  guard,
  context = "support event access guard"
) {
  if (!guard || typeof guard !== "object" || Array.isArray(guard)) {
    throw new ContractError(`${context}: guard required`);
  }
  for (const field of Object.keys(guard)) {
    if (!SUPPORT_EVENT_ACCESS_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected or unsafe field ${field}`);
    }
  }
  if (guard.schema !== "iris_support_event_access_guard_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!SUPPORT_EVENT_STATUSES.has(guard.support_status)) {
    throw new ContractError(`${context}: invalid support status`);
  }
  if (guard.exclusive_access_allowed !== false) {
    throw new ContractError(`${context}: exclusive access forbidden`);
  }
  assertNoUnsafeStrings(guard, context);
  assertSupportEventAccessBoundaryPolicy(guard.boundary_policy, context);
}

function assertBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!MONETIZATION_BOUNDARY_FIELDS.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of MONETIZATION_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertMerchandiseReadinessBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!MERCHANDISE_READINESS_BOUNDARY_FIELDS.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of MERCHANDISE_READINESS_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertVoiceProductLicenseBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!VOICE_PRODUCT_LICENSE_BOUNDARY_FIELDS.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of VOICE_PRODUCT_LICENSE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertPayToRankRiskBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!PAY_TO_RANK_RISK_BOUNDARY_FIELDS.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of PAY_TO_RANK_RISK_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertRevenuePressureRiskBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!REVENUE_PRESSURE_RISK_BOUNDARY_FIELDS.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of REVENUE_PRESSURE_RISK_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertDependencyRiskMonetizationBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!DEPENDENCY_RISK_MONETIZATION_BOUNDARY_FIELDS.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of DEPENDENCY_RISK_MONETIZATION_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertSupportEventAccessBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!SUPPORT_EVENT_ACCESS_BOUNDARY_FIELDS.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of SUPPORT_EVENT_ACCESS_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertSponsorFitBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!SPONSOR_FIT_BOUNDARY_FIELDS.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of SPONSOR_FIT_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertAffiliateDisclosureBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!AFFILIATE_DISCLOSURE_BOUNDARY_FIELDS.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of AFFILIATE_DISCLOSURE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertMembershipBenefitBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!MEMBERSHIP_BENEFIT_BOUNDARY_FIELDS.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of MEMBERSHIP_BENEFIT_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function assertNoUnsafeStrings(value, context) {
  if (typeof value === "string") {
    if (UNSAFE_TEXT_PATTERN.test(value)) {
      throw new ContractError(`${context}: unsafe text`);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => assertNoUnsafeStrings(item, context));
    return;
  }
  for (const child of Object.values(value)) {
    assertNoUnsafeStrings(child, context);
  }
}
