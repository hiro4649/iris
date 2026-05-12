export function renderAdminDashboardPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>IRIS Admin Dashboard</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #101214;
      --panel: #171b1f;
      --panel-2: #1e2429;
      --line: #303942;
      --text: #eef3f2;
      --muted: #a9b5b2;
      --ok: #56c596;
      --warn: #f0b45b;
      --bad: #e36b6b;
      --info: #7db7e8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 22px;
      border-bottom: 1px solid var(--line);
      background: #121619;
      position: sticky;
      top: 0;
      z-index: 2;
    }
    h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 650;
    }
    main {
      max-width: 1180px;
      margin: 0 auto;
      padding: 22px;
    }
    button, a.button, select {
      border: 1px solid var(--line);
      background: var(--panel-2);
      color: var(--text);
      min-height: 34px;
      padding: 7px 11px;
      border-radius: 6px;
      text-decoration: none;
      cursor: pointer;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }
    .metric, .widget, .module {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px;
    }
    .metric span, .widget span, .module span {
      color: var(--muted);
      display: block;
      font-size: 12px;
      line-height: 1.4;
    }
    .metric strong {
      display: block;
      margin-top: 6px;
      font-size: 22px;
      line-height: 1.2;
    }
    .notice {
      border-left: 4px solid var(--info);
      background: var(--panel);
      padding: 14px 16px;
      margin-bottom: 18px;
      color: var(--text);
    }
    .toolbar {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    .modules {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 18px;
    }
    .checklist {
      margin-top: 18px;
      display: grid;
      gap: 8px;
    }
    .safety {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin: 18px 0;
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }
    .danger {
      border-color: #7a3333;
      background: #3a1717;
    }
    .check {
      display: grid;
      grid-template-columns: minmax(160px, 1.2fr) minmax(110px, 0.8fr) minmax(140px, 1fr) minmax(160px, 1.2fr);
      gap: 10px;
      align-items: center;
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 10px 12px;
    }
    .settings, .review-queue {
      margin-top: 18px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    .setting, .review-item {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 12px;
    }
    .review-item p {
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }
    .review-item strong {
      overflow-wrap: anywhere;
    }
    .widget strong, .module strong {
      display: block;
      margin-top: 4px;
      font-size: 15px;
      overflow-wrap: anywhere;
    }
    .script-list {
      margin: 8px 0 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 5px;
    }
    .script-list li {
      color: var(--muted);
      font-family: "Cascadia Mono", Consolas, monospace;
      font-size: 12px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .status {
      display: inline-block;
      margin-top: 10px;
      padding: 3px 7px;
      border-radius: 999px;
      border: 1px solid var(--line);
      font-size: 12px;
    }
    .ready, .configured { color: var(--ok); }
    .attention_required, .operator_attention_required, .degraded_safe { color: var(--warn); }
    .blocked { color: var(--bad); }
    pre {
      overflow: auto;
      background: #0c0e10;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px;
      max-height: 360px;
    }
    @media (max-width: 860px) {
      header { align-items: flex-start; flex-direction: column; }
      .summary, .grid, .modules { grid-template-columns: 1fr; }
      .settings, .review-queue { grid-template-columns: 1fr; }
      .check { grid-template-columns: 1fr; }
      main { padding: 14px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>IRIS Admin Dashboard</h1>
    <div class="toolbar">
      <a class="button" href="/debug">Debug</a>
      <a class="button" href="/readiness" target="_blank">Readiness JSON</a>
      <a class="button" href="/admin/public-report-boundary-audit" target="_blank">Boundary Audit</a>
      <select id="admin-review-actor" aria-label="Admin review actor role">
        <option value="operator">Operator</option>
        <option value="admin">Admin</option>
        <option value="owner">Owner</option>
      </select>
      <button id="refresh">Refresh</button>
    </div>
  </header>
  <main>
    <section class="summary">
      <div class="metric"><span>Dashboard</span><strong id="dashboard-status">loading</strong></div>
      <div class="metric"><span>Widgets Needing Attention</span><strong id="attention-widgets">0</strong></div>
      <div class="metric"><span>Ready Modules</span><strong id="ready-modules">0</strong></div>
      <div class="metric"><span>Next Step</span><strong id="next-step">loading</strong></div>
    </section>
    <div class="notice" id="operator-note">Loading dashboard...</div>
    <section class="grid" id="widgets"></section>
    <section class="modules" id="modules"></section>
    <h2>Low Output Restart</h2>
    <section class="settings" id="low-output-restart"></section>
    <h2>Safety Controls</h2>
    <section class="safety">
      <strong id="safety-status">loading</strong>
      <span id="safety-pauses">paused: 0</span>
      <button class="danger" id="emergency-stop">Emergency Stop</button>
      <button id="resume-safe">Resume Safe Local</button>
      <button id="pause-tts">Pause TTS</button>
      <button id="pause-live2d">Pause Live2D</button>
      <button id="pause-youtube">Pause YouTube</button>
    </section>
    <h2>Integration Checklist</h2>
    <section class="checklist" id="integration-checklist"></section>
    <h2>Runtime Engine Connections</h2>
    <section class="settings" id="runtime-engine-settings"></section>
    <h2>Character And Voice Settings</h2>
    <section class="settings" id="character-voice-settings"></section>
    <h2>Anime Performance Matching</h2>
    <section class="settings" id="anime-performance-settings"></section>
    <h2>Anime IP Governance</h2>
    <section class="settings" id="anime-ip-governance-settings"></section>
    <h2>Growth Business Operations</h2>
    <section class="settings" id="growth-business-settings"></section>
    <h2>Public Report Boundary Audit</h2>
    <section class="settings" id="public-boundary-audit"></section>
    <h2>Memory And Relationship Review Queue</h2>
    <section class="review-queue" id="review-queue"></section>
    <h2>Safe JSON</h2>
    <pre id="raw-json">{}</pre>
  </main>
  <script>
    const $ = (id) => document.getElementById(id);
    const VOICE_LICENSE_USE_CATEGORY_SETTING_IDS = Object.freeze([
      "voice_license_stream_use_status",
      "voice_license_prerecorded_line_use_status",
      "voice_license_voice_product_use_status",
      "voice_license_sponsor_campaign_use_status",
    ]);

    async function loadDashboard() {
      let payload;
      let checklistPayload;
      let safetyPayload;
      let settingsPayload;
      let reviewQueuePayload;
      let reviewDecisionLogPayload;
      let reviewHandoffPayload;
      let reviewPreflightPayload;
      let reviewAuthGatePayload;
      let reviewRunPlanPayload;
      let publicBoundaryAuditPayload;
      const actorRole = getAdminReviewActorRole();
      const actorRoleQuery = "?actor_role=" + encodeURIComponent(actorRole);
      try {
        const response = await fetch("/admin/dashboard", { cache: "no-store" });
        const checklistResponse = await fetch("/admin/integration-checklist", { cache: "no-store" });
        const safetyResponse = await fetch("/admin/safety-controls", { cache: "no-store" });
        const settingsResponse = await fetch("/admin/character-voice-settings", { cache: "no-store" });
        const reviewQueueResponse = await fetch("/admin/review-queue", { cache: "no-store" });
        const reviewDecisionLogResponse = await fetch("/admin/review-queue/decision-log-status", { cache: "no-store" });
        const reviewHandoffResponse = await fetch("/admin/review-queue/validator-handoff", { cache: "no-store" });
        const reviewPreflightResponse = await fetch("/admin/review-queue/validator-preflight", { cache: "no-store" });
        const reviewAuthGateResponse = await fetch("/admin/review-queue/auth-gate" + actorRoleQuery, { cache: "no-store" });
        const reviewRunPlanResponse = await fetch("/admin/review-queue/validator-run-plan" + actorRoleQuery, { cache: "no-store" });
        const publicBoundaryAuditResponse = await fetch("/admin/public-report-boundary-audit", { cache: "no-store" });
        payload = await response.json();
        checklistPayload = await checklistResponse.json();
        safetyPayload = await safetyResponse.json();
        settingsPayload = await settingsResponse.json();
        reviewQueuePayload = await reviewQueueResponse.json();
        reviewDecisionLogPayload = await reviewDecisionLogResponse.json();
        reviewHandoffPayload = await reviewHandoffResponse.json();
        reviewPreflightPayload = await reviewPreflightResponse.json();
        reviewAuthGatePayload = await reviewAuthGateResponse.json();
        reviewRunPlanPayload = await reviewRunPlanResponse.json();
        publicBoundaryAuditPayload = await publicBoundaryAuditResponse.json();
      } catch {
        renderDashboardLoadFailure();
        return;
      }
      const dashboard = payload.admin_dashboard;
      const checklist = checklistPayload.admin_integration_checklist;
      const safety = safetyPayload.admin_safety_controls;
      const settings = settingsPayload.admin_character_voice_settings;
      const reviewQueue = reviewQueuePayload.admin_review_queue;
      const reviewDecisionLog = reviewDecisionLogPayload.admin_review_decision_log_status;
      const reviewHandoff = reviewHandoffPayload.admin_review_validator_handoff;
      const reviewPreflight = reviewPreflightPayload.admin_review_validator_preflight;
      const reviewAuthGate = reviewAuthGatePayload.admin_review_auth_gate;
      const reviewRunPlan = reviewRunPlanPayload.admin_review_validator_run_plan;
      const publicBoundaryAudit = publicBoundaryAuditPayload.public_report_boundary_audit;
      $("admin-review-actor").value = actorRole;
      $("dashboard-status").textContent = dashboard.dashboard_status;
      $("dashboard-status").className = dashboard.dashboard_status;
      $("attention-widgets").textContent = dashboard.attention_widget_count;
      $("ready-modules").textContent =
        dashboard.module_summary.ready_module_count + "/" + dashboard.module_summary.module_count;
      $("next-step").textContent = dashboard.module_summary.next_operator_action_id || "none";
      $("operator-note").textContent =
        dashboard.operator_language.summary_label + " " + dashboard.operator_language.next_step_label;
      $("widgets").innerHTML = dashboard.widgets.map(renderWidget).join("");
      $("modules").innerHTML = renderModuleSummary(
        dashboard.module_summary,
        dashboard.verification_surfaces
      );
      $("low-output-restart").innerHTML = renderLowOutputRestart(
        dashboard.low_output_restart_summary,
        dashboard.verification_surfaces,
        publicBoundaryAudit
      );
      $("integration-checklist").innerHTML = checklist.checks.map(renderCheck).join("");
      $("runtime-engine-settings").innerHTML = renderRuntimeEngineSettings(settings);
      $("character-voice-settings").innerHTML = settings.settings.map(renderSetting).join("");
      $("anime-performance-settings").innerHTML = renderAnimePerformanceSettings(settings);
      $("anime-ip-governance-settings").innerHTML = renderAnimeIpGovernanceSettings(settings);
      $("growth-business-settings").innerHTML = renderGrowthBusinessSettings(settings);
      $("public-boundary-audit").innerHTML = renderPublicBoundaryAudit(publicBoundaryAudit);
      $("review-queue").innerHTML = renderReviewQueue(
        reviewQueue,
        reviewDecisionLog,
        reviewHandoff,
        reviewPreflight,
        reviewAuthGate,
        reviewRunPlan
      );
      $("safety-status").textContent = safety.control_status;
      $("safety-status").className = safety.control_status;
      $("safety-pauses").textContent = "paused: " + safety.active_pause_count;
      $("raw-json").textContent = JSON.stringify(sanitizeAdminDashboardPayloadForRawJson({ dashboard: payload, checklist: checklistPayload, safety: safetyPayload, settings: settingsPayload, publicBoundaryAudit: publicBoundaryAuditPayload, reviewQueue: reviewQueuePayload, reviewDecisionLog: reviewDecisionLogPayload, reviewHandoff: reviewHandoffPayload, reviewPreflight: reviewPreflightPayload, reviewAuthGate: reviewAuthGatePayload, reviewRunPlan: reviewRunPlanPayload }), null, 2);
    }

    function renderDashboardLoadFailure() {
      $("dashboard-status").textContent = "degraded_safe";
      $("dashboard-status").className = "degraded_safe";
      $("operator-note").textContent = "Admin data refresh failed; retry refresh.";
      $("review-queue").innerHTML =
        '<article class="review-item"><span>Status</span><strong>dashboard_load_failed</strong></article>';
      $("raw-json").textContent = JSON.stringify({
        ok: false,
        schema: "iris_admin_dashboard_load_failure_v1",
        error_kind: "dashboard_load_failed",
        boundary_policy: {
          no_endpoint_values: true,
          no_secret_values: true,
          no_payloads: true
        }
      }, null, 2);
    }

    function renderWidget(widget) {
      return '<article class="widget">' +
        '<span>' + escapeHtml(widget.title) + '</span>' +
        '<strong>' + escapeHtml(widget.safe_summary_label) + '</strong>' +
        '<div class="status ' + escapeHtml(widget.widget_status) + '">' +
        escapeHtml(widget.widget_status) +
        '</div>' +
        '</article>';
    }

    function renderModuleSummary(summary, verificationSurfaces = {}) {
      const cards = [
        ["Modules", summary.module_count],
        ["Ready", summary.ready_module_count],
        ["Attention", summary.attention_module_count],
        ["Next Module", summary.next_module_id || "none"],
        ["Next Attention Area", summary.next_attention_area_id || "none"],
        [
          "Next Attention Missing Settings",
          summary.next_attention_area_missing_setting_count,
        ],
        ["Next Script", summary.next_safe_script || "none"],
        [
          "Boundary Audit Script",
          verificationSurfaces.public_report_boundary_audit_script ||
            "npm run dev:public-report-boundary-audit",
        ],
        [
          "Foundation Runtime Summary",
          verificationSurfaces.foundation_runtime_summary_script ||
            "npm run dev:foundation:runtime-summary",
        ],
        [
          "Production Attention Digest",
          verificationSurfaces.production_attention_digest_script ||
            "npm run dev:production:attention-digest",
        ],
        [
          "Blocked Worker Check",
          verificationSurfaces.foundation_blocked_worker_roundtrip_script ||
            "npm run dev:foundation:blocked-worker-roundtrip",
        ],
      ].map(([label, value]) =>
        '<article class="module"><span>' + escapeHtml(label) + '</span><strong>' +
        escapeHtml(String(value)) + '</strong></article>'
      );
      const scriptCatalog = Array.isArray(summary.next_safe_script_catalog)
        ? summary.next_safe_script_catalog.slice(0, 6)
        : [];
      cards.push(
        '<article class="module"><span>Safe Script Catalog</span><strong>' +
        escapeHtml(String(summary.next_safe_script_catalog_count ?? 0)) +
        '</strong><ul class="script-list">' +
        scriptCatalog.map((script) => '<li>' + escapeHtml(script) + '</li>').join("") +
        '</ul></article>'
      );
      return cards.join("");
    }

    function renderLowOutputRestart(summary = {}, verificationSurfaces = {}, audit = {}) {
      const cards = [
        [
          "Start Here",
          summary.entry_check_script ||
          verificationSurfaces.admin_operations_summary_script ||
            "npm run dev:admin:operations-summary",
        ],
        [
          "First Check",
          summary.first_check_script ||
          verificationSurfaces.production_attention_digest_script ||
            "npm run dev:production:attention-digest",
        ],
        [
          "Focus Check",
          summary.focus_check_script ||
          verificationSurfaces.foundation_runtime_summary_script ||
            "npm run dev:foundation:runtime-summary",
        ],
        [
          "Secondary Check",
          summary.secondary_check_script ||
            "npm run dev:foundation:status",
        ],
        [
          "Worker Drilldown",
          verificationSurfaces.foundation_blocked_worker_roundtrip_script ||
            "npm run dev:foundation:blocked-worker-roundtrip",
        ],
        [
          "Boundary Check",
          summary.public_boundary_check_script ||
          verificationSurfaces.public_report_boundary_audit_script ||
            "npm run dev:public-report-boundary-audit",
        ],
        [
          "Full Preflight",
          summary.full_preflight_script || "npm run preflight",
        ],
        [
          "Required Lightweight Scripts",
          summary.required_lightweight_script_count ??
            audit.required_lightweight_script_count ??
            0,
        ],
        [
          "Missing Lightweight Scripts",
          summary.missing_required_lightweight_script_count ??
            audit.missing_required_lightweight_script_count ??
            0,
        ],
      ];
      return cards.map(([label, value]) =>
        '<article class="setting"><span>' + escapeHtml(label) + '</span><strong>' +
        escapeHtml(String(value)) + '</strong></article>'
      ).join("");
    }

    function renderCheck(check) {
      const scriptCatalog = Array.isArray(check.safe_script_catalog)
        ? check.safe_script_catalog.slice(0, 6)
        : [];
      return '<article class="check">' +
        '<strong>' + escapeHtml(check.title) + '</strong>' +
        '<span class="' + escapeHtml(check.check_status) + '">' + escapeHtml(check.check_status) + '</span>' +
        '<span>missing env: ' + escapeHtml(String(check.missing_env_count)) + '</span>' +
        '<span>' + escapeHtml(check.next_safe_script || "none") + '</span>' +
        '<ul class="script-list">' +
        scriptCatalog.map((script) => '<li>' + escapeHtml(script) + '</li>').join("") +
        '</ul>' +
        '</article>';
    }

    function renderSetting(setting) {
      return '<article class="setting">' +
        '<span>' + escapeHtml(setting.setting_group) + '</span>' +
        '<strong>' + escapeHtml(setting.setting_id) + '</strong>' +
        '<div class="status ' + escapeHtml(setting.setting_status) + '">' +
        escapeHtml(setting.setting_status) +
        '</div>' +
        '</article>';
    }

    function renderRuntimeEngineSettings(settings) {
      const runtimeSettings = filterSettingsByIds(settings.settings, [
        "runtime_tts_bridge_connection",
        "runtime_live2d_bridge_connection",
        "runtime_subtitle_bridge_connection",
        "runtime_tts_engine_connection",
        "runtime_live2d_engine_connection",
        "runtime_subtitle_engine_connection",
      ]);
      const configured = countConfiguredSettings(runtimeSettings);
      const cards = [
        ["Runtime Engine Settings", runtimeSettings.length],
        ["Configured", configured],
        ["Missing", runtimeSettings.length - configured],
        ["TTS Bridge", settingStatusLabel(runtimeSettings, "runtime_tts_bridge_connection")],
        ["Live2D Bridge", settingStatusLabel(runtimeSettings, "runtime_live2d_bridge_connection")],
        ["Subtitle Bridge", settingStatusLabel(runtimeSettings, "runtime_subtitle_bridge_connection")],
        ["TTS Engine", settingStatusLabel(runtimeSettings, "runtime_tts_engine_connection")],
        ["Live2D Engine", settingStatusLabel(runtimeSettings, "runtime_live2d_engine_connection")],
        ["Subtitle Engine", settingStatusLabel(runtimeSettings, "runtime_subtitle_engine_connection")],
      ].map(([label, value]) =>
        '<article class="setting"><span>' + escapeHtml(label) + '</span><strong>' +
        escapeHtml(String(value)) + '</strong></article>'
      );
      return cards.concat(runtimeSettings.map(renderSetting)).join("");
    }

    function renderAnimePerformanceSettings(settings) {
      const performanceSettings = settings.settings.filter(
        (setting) => setting.setting_group === "performance"
      );
      const referenceSettings = filterSettingsByIds(performanceSettings, [
        "anime_performance_reference_profile",
      ]);
      const expressionMotionSettings = filterSettingsByIds(performanceSettings, [
        "anime_expression_match_profile",
        "anime_gaze_blink_match_profile",
        "anime_mouth_lipsync_match_profile",
        "anime_posture_gesture_match_profile",
        "anime_idle_breathing_motion_profile",
      ]);
      const voiceSpeechSettings = filterSettingsByIds(performanceSettings, [
        "anime_voice_quality_match_profile",
        "anime_intonation_accent_match_profile",
        "anime_catchphrase_policy",
        "anime_speech_timing_profile",
        "anime_subtitle_pacing_profile",
        "anime_performance_approval_status",
      ]);
      const voiceLicenseSettings = filterSettingsByIds(
        settings.settings,
        VOICE_LICENSE_USE_CATEGORY_SETTING_IDS
      );
      const governanceSettings = settings.settings.filter(
        (setting) => setting.setting_group === "ip_governance"
      );
      const animeIdentitySurfaces = [
        referenceSettings,
        expressionMotionSettings,
        voiceSpeechSettings,
        governanceSettings,
        voiceLicenseSettings,
      ];
      const animeIdentitySurfaceCount = animeIdentitySurfaces.length;
      const animeIdentityReadyCount = animeIdentitySurfaces.filter(
        (surface) => surface.length > 0 && countConfiguredSettings(surface) === surface.length
      ).length;
      const configured = performanceSettings.filter(
        (setting) => setting.setting_status === "configured"
      ).length;
      const cards = [
        ["Performance Settings", performanceSettings.length],
        ["Configured", configured],
        ["Missing", performanceSettings.length - configured],
        ["Anime Identity Surfaces Ready", animeIdentityReadyCount + "/" + animeIdentitySurfaceCount],
        ["Reference Ready", countConfiguredSettings(referenceSettings) + "/" + referenceSettings.length],
        ["Expression And Motion Ready", countConfiguredSettings(expressionMotionSettings) + "/" + expressionMotionSettings.length],
        ["Voice And Speech Ready", countConfiguredSettings(voiceSpeechSettings) + "/" + voiceSpeechSettings.length],
        ["IP Governance Ready", countConfiguredSettings(governanceSettings) + "/" + governanceSettings.length],
        ["Voice License Ready", countConfiguredSettings(voiceLicenseSettings) + "/" + voiceLicenseSettings.length],
        ["Summary Script", "npm run dev:admin:character-voice-settings:summary"],
        ["Summary API", "/admin/character-voice-settings/summary"],
      ].map(([label, value]) =>
        '<article class="setting"><span>' + escapeHtml(label) + '</span><strong>' +
        escapeHtml(String(value)) + '</strong></article>'
      );
      return cards.concat(performanceSettings.map(renderSetting)).join("");
    }

    function renderAnimeIpGovernanceSettings(settings) {
      const governanceSettings = settings.settings.filter(
        (setting) => setting.setting_group === "ip_governance"
      );
      const configured = countConfiguredSettings(governanceSettings);
      const voiceLicenseSettings = filterSettingsByIds(
        settings.settings,
        VOICE_LICENSE_USE_CATEGORY_SETTING_IDS
      );
      const cards = [
        ["Governance Settings", governanceSettings.length],
        ["Configured", configured],
        ["Missing", governanceSettings.length - configured],
        ["Canon Bible", settingStatusLabel(governanceSettings, "anime_canon_bible_profile")],
        ["Spoiler Release", settingStatusLabel(governanceSettings, "anime_spoiler_release_policy")],
        ["Non Canon Label", settingStatusLabel(governanceSettings, "anime_non_canon_label_policy")],
        ["Owner Approval", settingStatusLabel(governanceSettings, "anime_ip_owner_approval_status")],
        ["Canon Layer", settingStatusLabel(governanceSettings, "anime_canon_layer_policy")],
        ["Stream Mode", settingStatusLabel(governanceSettings, "anime_stream_mode_policy")],
        ["Release Mode", settingStatusLabel(governanceSettings, "anime_release_mode_schedule")],
        ["Character Communication", settingStatusLabel(governanceSettings, "anime_character_communication_mode_policy")],
        ["Voice License Use Categories", countConfiguredSettings(voiceLicenseSettings) + "/" + voiceLicenseSettings.length],
        ["Stream Voice License", settingStatusLabel(voiceLicenseSettings, "voice_license_stream_use_status")],
        ["Prerecorded Line License", settingStatusLabel(voiceLicenseSettings, "voice_license_prerecorded_line_use_status")],
        ["Voice Product License", settingStatusLabel(voiceLicenseSettings, "voice_license_voice_product_use_status")],
        ["Sponsor Campaign Voice License", settingStatusLabel(voiceLicenseSettings, "voice_license_sponsor_campaign_use_status")],
      ].map(([label, value]) =>
        '<article class="setting"><span>' + escapeHtml(label) + '</span><strong>' +
        escapeHtml(String(value)) + '</strong></article>'
      );
      return cards.concat(governanceSettings.map(renderSetting)).join("");
    }

    function renderGrowthBusinessSettings(settings) {
      const growthSettings = settings.settings.filter(
        (setting) => setting.setting_group === "growth_business"
      );
      const configured = countConfiguredSettings(growthSettings);
      const cards = [
        ["Growth Business Settings", growthSettings.length],
        ["Configured", configured],
        ["Missing", growthSettings.length - configured],
        ["Fan Growth", settingStatusLabel(growthSettings, "fan_growth_lifecycle_policy")],
        ["Community Ritual", settingStatusLabel(growthSettings, "community_ritual_review_policy")],
        ["AI Transparency", settingStatusLabel(growthSettings, "ai_transparency_disclosure_policy")],
        ["Monetization Safety", settingStatusLabel(growthSettings, "monetization_safety_policy")],
        ["Public Analytics", settingStatusLabel(growthSettings, "public_analytics_export_policy")],
      ].map(([label, value]) =>
        '<article class="setting"><span>' + escapeHtml(label) + '</span><strong>' +
        escapeHtml(String(value)) + '</strong></article>'
      );
      return cards.concat(growthSettings.map(renderSetting)).join("");
    }

    function filterSettingsByIds(settings, settingIds) {
      const allowed = new Set(settingIds);
      return settings.filter((setting) => allowed.has(setting.setting_id));
    }

    function countConfiguredSettings(settings) {
      return settings.filter((setting) => setting.setting_status === "configured").length;
    }

    function settingStatusLabel(settings, settingId) {
      return settings.find((setting) => setting.setting_id === settingId)?.setting_status ||
        "not_configured";
    }

    function renderPublicBoundaryAudit(audit) {
      const missingTotal =
        Number(audit.missing_allowlist_count ?? 0) +
        Number(audit.missing_run_boundary_count ?? 0) +
        Number(audit.missing_dev_service_allowlist_count ?? 0) +
        Number(audit.missing_server_allowlist_count ?? 0) +
        Number(audit.missing_required_lightweight_script_count ?? 0);
      const cards = [
        ["Audit Status", audit.ok ? "ready" : "attention_required"],
        ["Missing Items", missingTotal],
        ["Dev Scripts", audit.scanned_script_count],
        ["Dev Services", audit.scanned_dev_service_count],
        ["Server Files", audit.scanned_server_file_count],
        ["Required Lightweight Scripts", audit.required_lightweight_script_count],
        ["Audit API", "/admin/public-report-boundary-audit"],
        ["Audit Script", "npm run dev:public-report-boundary-audit"],
      ].map(([label, value]) =>
        '<article class="setting"><span>' + escapeHtml(label) + '</span><strong>' +
        escapeHtml(String(value)) + '</strong></article>'
      );
      const requiredScripts = Array.isArray(audit.required_lightweight_scripts)
        ? audit.required_lightweight_scripts.slice(0, 8)
        : [];
      const scriptList = requiredScripts.length > 0
        ? '<article class="setting"><span>Required Script Catalog</span><strong>' +
          escapeHtml(requiredScripts.join(", ")) + '</strong></article>'
        : "";
      return cards.concat(scriptList).join("");
    }

    function renderReviewQueue(queue, decisionLog, handoff, preflight, authGate, runPlan) {
      const summary = [
        ["Status", queue.queue_status],
        ["Actionable", queue.actionable_item_count],
        ["Memory", queue.memory_review_count],
        ["Relationship", queue.relationship_review_count],
        ["Next Action", queue.next_recommended_action_id || "none"],
        ["Decision Log", decisionLog.health],
        ["Decisions", decisionLog.entry_count],
        ["Handoff", handoff.handoff_status],
        ["Preflight", preflight.preflight_status],
        ["Auth Gate", authGate.auth_gate_status],
        ["Private Runner", runPlan.run_plan_status],
        ["Runner Items", runPlan.planned_private_runner_item_count],
        ["Blocked Items", runPlan.blocked_runner_item_count],
        ["Next Validator Script", runPlan.next_safe_script || "none"],
      ].map(([label, value]) =>
        '<article class="review-item"><span>' + escapeHtml(label) + '</span><strong>' +
        escapeHtml(String(value)) + '</strong></article>'
      ).join("");
      const items = queue.items.slice(0, 6).map((item) =>
        '<article class="review-item">' +
        '<span>' + escapeHtml(item.review_group) + '</span>' +
        '<strong>' + escapeHtml(item.status) + '</strong>' +
        '<p>' + escapeHtml(item.public_summary || item.review_id) + '</p>' +
        '<div class="status ' + escapeHtml(item.actionable_by_admin ? "attention_required" : "ready") + '">' +
        escapeHtml(item.recommended_action_id || "summary_only") +
        '</div>' +
        renderReviewActions(item) +
        '</article>'
      ).join("");
      return summary + items;
    }

    function renderReviewActions(item) {
      if (!item.actionable_by_admin) return "";
      const rejectAction = item.review_group === "memory"
        ? "reject_memory_candidate"
        : "reject_relationship_candidate";
      return '<div class="toolbar">' +
        '<button data-review-action="' + escapeHtml(item.recommended_action_id) + '" data-review-id="' + escapeHtml(item.review_id) + '">Approve</button>' +
        '<button data-review-action="' + escapeHtml(rejectAction) + '" data-review-id="' + escapeHtml(item.review_id) + '">Reject</button>' +
        '</div>';
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[char]);
    }

    const ADMIN_DASHBOARD_RAW_JSON_FORBIDDEN_KEYS = new Set([
      "endpoint",
      "host",
      "hostname",
      "port",
      "address",
      "addr",
      "api_key",
      "apikey",
      "url",
      "uri",
      "auth",
      "authorization",
      "bearer",
      "certificate",
      "cert",
      "cookie",
      "connection_string",
      "connectionstring",
      "credentials",
      "credential",
      "password",
      "passwd",
      "passphrase",
      "dsn",
      "pem",
      "private_key",
      "privatekey",
      "signing_key",
      "signingkey",
      "secret",
      "token",
      "refresh_token",
      "refreshtoken",
      "event_id",
      "eventid",
      "trace_id",
      "traceid",
      "subtitle_text",
      "subtitletext",
      "input_action_candidate",
      "inputactioncandidate",
      "approvedgameinputaction",
      "approved_game_input_action"
    ]);
    const ADMIN_DASHBOARD_RAW_JSON_FORBIDDEN_SUFFIXES = [
      "endpoint",
      "host",
      "hostname",
      "port",
      "address",
      "addr",
      "event_id",
      "trace_id",
      "subtitle_text",
      "input_action_candidate",
      "approved_game_input_action",
      "url",
      "uri",
      "webhook",
      "callback",
      "redirect",
      "return_to",
      "next",
      "target",
      "destination",
      "route",
      "link",
      "href",
      "location",
      "path",
      "file",
      "dir",
      "directory",
      "folder",
      "authorization",
      "bearer",
      "certificate",
      "cert",
      "cookie",
      "connectionstring",
      "credentials",
      "credential",
      "password",
      "passwd",
      "passphrase",
      "dsn",
      "pem",
      "privatekey",
      "signingkey",
      "secret",
      "token",
      "apikey",
      "api_key",
      "connection_string",
      "private_key",
      "signing_key"
    ];

    function sanitizeAdminDashboardPayloadForRawJson(value) {
      if (
        typeof value === "string" &&
        (
          /(?:https?|wss?|postgres(?:ql)?|redis|amqps?|mysql|mariadb|mongo(?:db)?|smtps?|sftp|ftps?|nats|kafka|unix|file):\/\//i.test(value) ||
          /\b[A-Za-z]:\\[^\s]+/.test(value) ||
          /(?:^|\s)\/(?:var|tmp|home|Users|opt|run|etc)\/[^\s]+/.test(value) ||
          /\b[\w.-]+@[\w.-]+:[^\s]+/.test(value) ||
          /(?:^|\s)(?:localhost|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|0\.0\.0\.0|\[?::1\]?):\d{2,5}(?:\b|\/)/i.test(value) ||
          /(?:^|\s)\[(?:f[cd][0-9a-f:]*|fe80:[0-9a-f:]*)\]:\d{2,5}(?:\b|\/)/i.test(value) ||
          /(?:^|\s)[A-Za-z0-9.-]+\.[A-Za-z]{2,}:\d{2,5}(?:\b|\/)/.test(value) ||
          /(?:^|\s)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\/[^\s]+/.test(value) ||
          /^(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}$/.test(value) ||
          /(?:^|\s)(?:10|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}:\d{2,5}(?:\b|\/)/.test(value) ||
          /(?:^|\s)169\.254\.\d{1,3}\.\d{1,3}:\d{2,5}(?:\b|\/)/.test(value) ||
          /(?:server|host|database|user\s+id|username|uid|password|pwd)\s*=\s*[^;]+(?:;|$)/i.test(value) ||
          /(?:proxy[\s_-]?)?authorization\s*:\s*(?:basic|bearer)\s+\S+/i.test(value) ||
          /(?:x[\s_-])?api[\s_-]?key\s*:\s*\S+/i.test(value) ||
          /(?:client[\s_-]?secret|access[\s_-]?token|refresh[\s_-]?token)\s*[:=]\s*\S+/i.test(value) ||
          /cookie\s*:\s*\S+=\S+/i.test(value) ||
          /(?:^|;\s*)(?:session|sid|csrf|xsrf)[_-]?(?:id|token)?=\S+/i.test(value) ||
          /^(?:basic|bearer)\s+\S+/i.test(value) ||
          /-----BEGIN [A-Z ]+-----/.test(value) ||
          /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/.test(value) ||
          /\bAIza[0-9A-Za-z_-]{35}\b/.test(value) ||
          /\b(?:gh[pousr]_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]{80,})\b/.test(value) ||
          /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/.test(value) ||
          /\b[rs]k_(?:live|test)_[A-Za-z0-9]{16,}\b/.test(value) ||
          /\bnpm_[A-Za-z0-9]{36}\b/.test(value) ||
          /\bsk-[A-Za-z0-9_-]{20,}\b/.test(value) ||
          /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/.test(value) ||
          /\bkey-[0-9a-f]{32}\b/i.test(value) ||
          /\b(?:AC|SK)[0-9a-f]{32}\b/i.test(value) ||
          /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value) ||
          /(?:api[_-]?key|secret|token|password|passwd|passphrase)\s*[:=]\s*\S+/i.test(value)
        )
      ) {
        return "[redacted]";
      }
      if (Array.isArray(value)) {
        return value.map(sanitizeAdminDashboardPayloadForRawJson);
      }
      if (!value || typeof value !== "object") {
        return value;
      }
      const safe = {};
      for (const [key, childValue] of Object.entries(value)) {
        const normalizedKey = key.toLowerCase().replace(/[\s.\-\\/:()[\]{}<>]+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
        if (
          ADMIN_DASHBOARD_RAW_JSON_FORBIDDEN_KEYS.has(normalizedKey) ||
          ADMIN_DASHBOARD_RAW_JSON_FORBIDDEN_SUFFIXES.some(
            (suffix) => normalizedKey === suffix || normalizedKey.endsWith("_" + suffix) || normalizedKey.endsWith(suffix)
          )
        ) {
          continue;
        }
        safe[key] = sanitizeAdminDashboardPayloadForRawJson(childValue);
      }
      return safe;
    }

    function getAdminReviewActorRole() {
      const selectedRole = $("admin-review-actor").value;
      const role = selectedRole || "operator";
      return ["operator", "admin", "owner"].includes(role) ? role : "operator";
    }

    function initializeAdminReviewActorRole() {
      const queryRole = new URLSearchParams(window.location.search).get("actor_role");
      if (["operator", "admin", "owner"].includes(queryRole)) {
        $("admin-review-actor").value = queryRole;
      }
    }

    initializeAdminReviewActorRole();
    $("refresh").addEventListener("click", loadDashboard);
    $("admin-review-actor").addEventListener("change", loadDashboard);
    $("emergency-stop").addEventListener("click", () => postSafety("emergency_stop", true));
    $("resume-safe").addEventListener("click", () => postSafety("resume_safe_local_operation", true));
    $("pause-tts").addEventListener("click", () => postSafety("pause_tts", false));
    $("pause-live2d").addEventListener("click", () => postSafety("pause_live2d", false));
    $("pause-youtube").addEventListener("click", () => postSafety("pause_youtube_ingest", false));
    $("review-queue").addEventListener("click", async (event) => {
      const button = event.target.closest("[data-review-action]");
      if (!button) return;
      await postReviewDecision(button.dataset.reviewAction, button.dataset.reviewId);
    });

    async function postSafety(action, confirmed) {
      await fetch("/admin/safety-controls/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, confirmed, actor_role: "operator" })
      });
      await loadDashboard();
    }

    async function postReviewDecision(action, reviewId) {
      await fetch("/admin/review-queue/decision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, review_id: reviewId, confirmed: true, actor_role: getAdminReviewActorRole() })
      });
      await loadDashboard();
    }

    loadDashboard().catch((error) => {
      $("operator-note").textContent = "Dashboard failed to load.";
      $("raw-json").textContent = JSON.stringify({
        ok: false,
        schema: "iris_admin_dashboard_load_error_v1",
        error_kind: "dashboard_load_failed",
        boundary_policy: {
          no_endpoint_values: true,
          no_secret_values: true,
          no_payloads: true
        }
      }, null, 2);
    });
  </script>
</body>
</html>`;
}
