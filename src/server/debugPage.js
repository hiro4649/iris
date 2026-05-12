export function renderDebugPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>IRIS Debug Console</title>
  <style>
    :root {
      color-scheme: light;
      font-family: "Segoe UI", Arial, sans-serif;
      background: #f6f7f4;
      color: #1d2527;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: #f6f7f4;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 22px;
      border-bottom: 1px solid #d8ddd6;
      background: #ffffff;
    }
    h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 650;
      letter-spacing: 0;
    }
    nav {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    nav a, button {
      min-height: 36px;
      border: 1px solid #b8c2bc;
      border-radius: 6px;
      background: #ffffff;
      color: #1d2527;
      padding: 8px 12px;
      font: inherit;
      text-decoration: none;
      cursor: pointer;
    }
    button.primary {
      background: #28666e;
      border-color: #28666e;
      color: #ffffff;
    }
    main {
      display: grid;
      grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
      gap: 18px;
      padding: 18px;
    }
    section {
      min-width: 0;
      border: 1px solid #d8ddd6;
      border-radius: 8px;
      background: #ffffff;
    }
    section h2 {
      margin: 0;
      padding: 14px 16px;
      border-bottom: 1px solid #e2e6e0;
      font-size: 15px;
      letter-spacing: 0;
    }
    form {
      display: grid;
      gap: 10px;
      padding: 14px 16px 16px;
    }
    label {
      display: grid;
      gap: 5px;
      font-size: 12px;
      color: #53605b;
    }
    input, textarea {
      width: 100%;
      border: 1px solid #b8c2bc;
      border-radius: 6px;
      padding: 9px 10px;
      font: inherit;
      color: #1d2527;
      background: #fbfcfa;
    }
    textarea {
      min-height: 82px;
      resize: vertical;
    }
    .stack {
      display: grid;
      gap: 18px;
    }
    .state-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(120px, 1fr));
      gap: 10px;
      padding: 14px 16px;
    }
    .metric {
      border: 1px solid #e2e6e0;
      border-radius: 6px;
      padding: 10px;
      background: #fbfcfa;
      min-height: 70px;
    }
    .metric span {
      display: block;
      color: #60706a;
      font-size: 11px;
      margin-bottom: 6px;
    }
    .metric strong {
      display: block;
      font-size: 16px;
      overflow-wrap: anywhere;
      letter-spacing: 0;
    }
    .bars {
      display: grid;
      gap: 9px;
      padding: 0 16px 16px;
    }
    .bar-row {
      display: grid;
      grid-template-columns: 86px 1fr 48px;
      gap: 10px;
      align-items: center;
      font-size: 12px;
      color: #53605b;
    }
    progress {
      width: 100%;
      height: 12px;
      accent-color: #28666e;
    }
    .output {
      padding: 14px 16px;
      border-top: 1px solid #e2e6e0;
      display: grid;
      gap: 10px;
    }
    .timeline {
      display: grid;
      gap: 8px;
      padding: 0 16px 16px;
    }
    .timeline-row {
      display: grid;
      grid-template-columns: 74px 1fr;
      gap: 10px;
      align-items: center;
      font-size: 12px;
      color: #53605b;
    }
    .timeline-track {
      position: relative;
      height: 24px;
      border: 1px solid #e2e6e0;
      border-radius: 6px;
      background: #f4f7f5;
      overflow: hidden;
    }
    .timeline-event {
      position: absolute;
      top: 3px;
      bottom: 3px;
      min-width: 4px;
      border-radius: 4px;
      background: #28666e;
    }
    .timeline-event.mouth { background: #8b5a2b; }
    .timeline-event.breath { background: #5b8c85; }
    .timeline-event.expression { background: #7d6aa5; }
    .timeline-event.expression-breath { background: #3f7d63; }
    .timeline-event.motion { background: #b75954; }
    .spoken {
      min-height: 62px;
      font-size: 18px;
      line-height: 1.45;
    }
    pre {
      margin: 0;
      max-height: 280px;
      overflow: auto;
      border: 1px solid #e2e6e0;
      border-radius: 6px;
      background: #192325;
      color: #edf5f2;
      padding: 12px;
      font-size: 12px;
      line-height: 1.45;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .history {
      padding: 0 16px 16px;
      display: grid;
      gap: 8px;
    }
    .history-row {
      display: grid;
      grid-template-columns: 120px 120px 1fr;
      gap: 10px;
      align-items: start;
      padding: 9px 0;
      border-bottom: 1px solid #edf0eb;
      font-size: 12px;
    }
    .status {
      color: #60706a;
      font-size: 12px;
      padding: 0 16px 14px;
      min-height: 30px;
    }
    @media (max-width: 900px) {
      main { grid-template-columns: 1fr; }
      .state-grid { grid-template-columns: repeat(2, minmax(120px, 1fr)); }
      .history-row { grid-template-columns: 88px 88px 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <h1>IRIS Debug Console</h1>
    <nav>
      <a href="/overlay" target="_blank">Overlay</a>
      <a href="/overlay/status" target="_blank">Overlay Status</a>
      <a href="/overlay/event" target="_blank">Overlay Event</a>
      <a href="/overlay/events/status" target="_blank">Overlay Stream</a>
      <a href="/obs/browser-source" target="_blank">OBS Config</a>
      <a href="/state" target="_blank">State JSON</a>
      <a href="/capabilities" target="_blank">Capabilities</a>
      <a href="/languages" target="_blank">Languages</a>
      <a href="/readiness" target="_blank">Readiness</a>
      <a href="/production/live-readiness" target="_blank">Production Live</a>
      <a href="/production/next-task" target="_blank">Next Task</a>
      <a href="/production/runtime-handoff-status" target="_blank">Runtime Handoff</a>
      <a href="/production/scheduler-enablement" target="_blank">Scheduler Enablement</a>
      <a href="/production/foundation-preflight" target="_blank">Foundation Preflight</a>
      <a href="/production/foundation-launch-plan" target="_blank">Foundation Launch</a>
      <a href="/production/foundation-startup-checklist" target="_blank">Foundation Startup</a>
      <a href="/production/foundation-post-start-health-checklist" target="_blank">Foundation Post-Start Health</a>
      <a href="/production/foundation-env-setup-plan" target="_blank">Foundation Env</a>
      <a href="/production/foundation-local-env-profile" target="_blank">Foundation Local Env</a>
      <a href="/production/foundation-local-env-roundtrip" target="_blank">Foundation Env Check</a>
      <a href="/production/foundation-local-env-apply-plan" target="_blank">Foundation Env Apply</a>
      <a href="/production/foundation-local-env-rehearsal" target="_blank">Foundation Env Rehearsal</a>
      <a href="/production/foundation-connector-handoff" target="_blank">Foundation Connectors</a>
      <a href="/production/foundation-status" target="_blank">Foundation Status</a>
      <a href="/production/foundation-runtime-summary" target="_blank">Foundation Runtime Summary</a>
      <a href="/production/foundation-runtime-status" target="_blank">Foundation Runtime</a>
      <a href="/production/foundation-live-readiness" target="_blank">Foundation Live</a>
      <a href="/production/foundation-readiness-rehearsal" target="_blank">Foundation Rehearsal</a>
      <a href="/production/youtube-preflight" target="_blank">YouTube Preflight</a>
      <a href="/production/youtube-launch-plan" target="_blank">YouTube Launch</a>
      <a href="/production/youtube-local-env-profile" target="_blank">YouTube Local Env</a>
      <a href="/production/youtube-local-env-apply-plan" target="_blank">YouTube Env Apply</a>
      <a href="/production/youtube-env-setup-plan" target="_blank">YouTube Env</a>
      <a href="/production/youtube-source-status" target="_blank">YouTube Source</a>
      <a href="/production/youtube-runtime-status" target="_blank">YouTube Runtime</a>
      <a href="/production/youtube-live-readiness" target="_blank">YouTube Live</a>
      <a href="/production/youtube-readiness-rehearsal" target="_blank">YouTube Rehearsal</a>
      <a href="/production/youtube-post-start-checklist" target="_blank">YouTube Post-Start</a>
      <a href="/production/youtube-relay-startup-checklist" target="_blank">YouTube Relay Startup</a>
      <a href="/production/youtube-relay-readiness-rehearsal" target="_blank">YouTube Relay Rehearsal</a>
      <a href="/production/persistence-preflight" target="_blank">Persistence Preflight</a>
      <a href="/production/persistence-launch-plan" target="_blank">Persistence Launch</a>
      <a href="/production/persistence-local-env-profile" target="_blank">Persistence Local Env</a>
      <a href="/production/persistence-local-env-apply-plan" target="_blank">Persistence Env Apply</a>
      <a href="/production/persistence-env-setup-plan" target="_blank">Persistence Env</a>
      <a href="/production/persistence-startup-checklist" target="_blank">Persistence Startup</a>
      <a href="/production/memory-vector-roundtrip" target="_blank">Memory Vector</a>
      <a href="/production/persistence-runtime-status" target="_blank">Persistence Runtime</a>
      <a href="/production/postgres-admin-save-preflight" target="_blank">Postgres Admin Save Preflight</a>
      <a href="/production/persistence-live-readiness" target="_blank">Persistence Live</a>
      <a href="/production/persistence-readiness-rehearsal" target="_blank">Persistence Rehearsal</a>
      <a href="/production/persistence-post-start-checklist" target="_blank">Persistence Post-Start</a>
      <a href="/production/gameplay-preflight" target="_blank">Gameplay Preflight</a>
      <a href="/production/gameplay-launch-plan" target="_blank">Gameplay Launch</a>
      <a href="/production/gameplay-local-env-profile" target="_blank">Gameplay Local Env</a>
      <a href="/production/gameplay-local-env-apply-plan" target="_blank">Gameplay Env Apply</a>
      <a href="/production/gameplay-env-setup-plan" target="_blank">Gameplay Env</a>
      <a href="/production/gameplay-startup-checklist" target="_blank">Gameplay Startup</a>
      <a href="/production/gameplay-runtime-status" target="_blank">Gameplay Runtime</a>
      <a href="/production/gameplay-live-readiness" target="_blank">Gameplay Live</a>
      <a href="/production/gameplay-post-start-checklist" target="_blank">Gameplay Post-Start</a>
      <a href="/production/gameplay-readiness-rehearsal" target="_blank">Gameplay Rehearsal</a>
      <a href="/production/gameplay-validation-gate-roundtrip" target="_blank">Gameplay Gate</a>
      <a href="/production/operator-policy-settings" target="_blank">Operator Policies</a>
      <a href="/admin" target="_blank">Admin Dashboard</a>
      <a href="/admin/character-voice-settings" target="_blank">Admin Character Voice</a>
      <a href="/admin/character-voice-settings/summary" target="_blank">Admin Character Voice Summary</a>
      <a href="/admin/dashboard" target="_blank">Admin Dashboard JSON</a>
      <a href="/admin/public-report-boundary-audit" target="_blank">Public Boundary Audit</a>
      <a href="/admin/integration-checklist" target="_blank">Admin Integration Checklist</a>
        <a href="/admin/review-queue" target="_blank">Admin Review Queue</a>
        <a href="/admin/review-queue/decision-log-status" target="_blank">Admin Review Decision Log</a>
        <a href="/admin/review-queue/auth-gate" target="_blank">Admin Review Auth Gate</a>
        <a href="/admin/review-queue/validator-handoff" target="_blank">Admin Review Validator Handoff</a>
      <a href="/admin/review-queue/validator-preflight" target="_blank">Admin Review Validator Preflight</a>
      <a href="/admin/review-queue/validator-run-plan" target="_blank">Admin Review Validator Run Plan</a>
      <a href="/admin/safety-controls" target="_blank">Admin Safety Controls</a>
      <a href="/admin/operations-summary" target="_blank">Admin Operations Summary</a>
      <a href="/admin/operator-policy/apply-plan" target="_blank">Operator Policy Apply Plan</a>
      <a href="/admin/operator-policy/async-save-gate" target="_blank">Operator Policy Async Save Gate</a>
      <a href="/production/operator-policy-async-save-gate-roundtrip" target="_blank">Operator Policy Async Roundtrip</a>
      <a href="/production/probe" target="_blank">Production Probe</a>
      <a href="/persistence/status" target="_blank">Persistence</a>
      <a href="/integrations/status" target="_blank">Integrations</a>
      <a href="/integrations/contracts" target="_blank">Contracts</a>
      <a href="/integrations/fixtures" target="_blank">Fixtures</a>
      <a href="/relationships" target="_blank">Relationships</a>
      <a href="/memories" target="_blank">Memories</a>
      <a href="/memory-search?query=game" target="_blank">Memory Search</a>
      <a href="/candidate-reviews" target="_blank">Candidate Reviews</a>
      <a href="/replay" target="_blank">Replay JSON</a>
      <button id="idle-tick" type="button">Idle Tick</button>
      <button id="idle-start" type="button">Idle Start</button>
      <button id="idle-stop" type="button">Idle Stop</button>
      <button id="ingest-tick" type="button">Ingest Tick</button>
      <button id="ingest-start" type="button">Ingest Start</button>
      <button id="ingest-stop" type="button">Ingest Stop</button>
      <button id="production-probe" type="button">Production Probe</button>
      <button id="integration-probe" type="button">Probe Bridges</button>
      <button id="refresh" type="button">Refresh</button>
    </nav>
  </header>
  <main>
    <div class="stack">
      <section>
        <h2>Comment</h2>
        <form id="comment-form">
          <label>Display name
            <input name="display_name" value="local_viewer" />
          </label>
          <label>Author channel id
            <input name="author_channel_id" value="debug-viewer" />
          </label>
          <label>Text
            <textarea name="text">IRIS, funny lol</textarea>
          </label>
          <button class="primary" type="submit">Send Comment</button>
        </form>
        <div class="status" id="comment-status"></div>
      </section>
      <section>
        <h2>Game Observation</h2>
        <form id="game-form">
          <label>Game title
            <input name="game_title" value="Minecraft" />
          </label>
          <label>Scene summary
            <textarea name="scene_summary">The player finds diamonds while a skeleton approaches.</textarea>
          </label>
          <label>Detected events
            <input name="detected_events" value="diamonds visible, skeleton nearby" />
          </label>
          <label>Player state
            <input name="player_state" value="iron pickaxe equipped" />
          </label>
          <label>Screen confidence
            <input name="screen_confidence" type="number" min="0" max="1" step="0.01" value="0.91" />
          </label>
          <button class="primary" type="submit">Send Observation</button>
        </form>
        <div class="status" id="game-status"></div>
      </section>
      <section>
        <h2>Donation</h2>
        <form id="donation-form">
          <label>Display name
            <input name="display_name" value="Hiro" />
          </label>
          <label>Author channel id
            <input name="author_channel_id" value="debug-donor" />
          </label>
          <label>Message
            <textarea name="message_text">応援してるよ、イリス！</textarea>
          </label>
          <label>Amount tier
            <input name="amount_tier" value="medium" />
          </label>
          <label>Currency
            <input name="currency" value="JPY" />
          </label>
          <button class="primary" type="submit">Send Donation</button>
        </form>
        <div class="status" id="donation-status"></div>
      </section>
      <section>
        <h2>Media Watch</h2>
        <form id="media-form">
          <label>Media kind
            <input name="media_kind" value="youtube" />
          </label>
          <label>Media title
            <input name="media_title" value="Shared clip" />
          </label>
          <label>Observation summary
            <textarea name="observation_summary">A surprising scene happens and chat reacts.</textarea>
          </label>
          <label>Detected mood
            <input name="detected_mood" value="surprise" />
          </label>
          <label>Confidence
            <input name="confidence" type="number" min="0" max="1" step="0.01" value="0.82" />
          </label>
          <label>Rights risk note
            <input name="rights_risk_note" value="summary_only" />
          </label>
          <button class="primary" type="submit">Send Media Observation</button>
        </form>
        <div class="status" id="media-status"></div>
      </section>
      <section>
        <h2>External Topic</h2>
        <form id="topic-form">
          <label>Topic title
            <input name="topic_title" value="Today topic" />
          </label>
          <label>Topic summary
            <textarea name="topic_summary">A light entertainment trend is being discussed online.</textarea>
          </label>
          <label>Source URL
            <input name="source_url" value="https://example.com/topic" />
          </label>
          <label>Freshness score
            <input name="freshness_score" type="number" min="0" max="1" step="0.01" value="0.72" />
          </label>
          <label>Source trust score
            <input name="source_trust_score" type="number" min="0" max="1" step="0.01" value="0.62" />
          </label>
          <label>Risk category
            <input name="risk_category" value="general" />
          </label>
          <button class="primary" type="submit">Send Topic</button>
        </form>
        <div class="status" id="topic-status"></div>
      </section>
      <section>
        <h2>Scenario</h2>
        <form id="scenario-form">
          <label>Scenario JSON
            <textarea name="scenario_json">{
  "name": "debug-basic",
  "steps": [
    { "kind": "comment", "display_name": "Hiro", "author_channel_id": "debug-hiro", "text": "IRIS, hello" },
    { "kind": "comment", "display_name": "Hiro", "author_channel_id": "debug-hiro", "text": "IRIS, funny lol" },
    { "kind": "game_observation", "game_title": "Minecraft", "scene_summary": "The player finds diamonds while a skeleton approaches.", "detected_events": ["diamonds visible", "skeleton nearby"], "player_state": "iron pickaxe equipped", "screen_confidence": 0.91 },
    { "kind": "idle", "idle_reason": "debug_scenario_pause" }
  ]
}</textarea>
          </label>
          <button class="primary" type="submit">Run Scenario</button>
        </form>
        <div class="status" id="scenario-status"></div>
      </section>
    </div>
    <div class="stack">
      <section>
        <h2>Live State</h2>
        <div class="state-grid">
          <div class="metric"><span>Status</span><strong id="status">idle</strong></div>
          <div class="metric"><span>Decision</span><strong id="decision">none</strong></div>
          <div class="metric"><span>Source</span><strong id="source">none</strong></div>
          <div class="metric"><span>Payload</span><strong id="payload">none</strong></div>
          <div class="metric"><span>Persona</span><strong id="persona">none</strong></div>
          <div class="metric"><span>Prosody</span><strong id="prosody">none</strong></div>
          <div class="metric"><span>Speech Rate</span><strong id="speech-rate">none</strong></div>
          <div class="metric"><span>Language</span><strong id="language-profile">none</strong></div>
          <div class="metric"><span>Subtitle</span><strong id="subtitle-status">none</strong></div>
          <div class="metric"><span>Subtitle Bridge</span><strong id="subtitle-bridge">none</strong></div>
          <div class="metric"><span>Motion</span><strong id="motion">none</strong></div>
          <div class="metric"><span>Body</span><strong id="body">none</strong></div>
          <div class="metric"><span>Camera</span><strong id="camera-proximity">none</strong></div>
          <div class="metric"><span>Rhythm</span><strong id="rhythm">none</strong></div>
          <div class="metric"><span>Affective</span><strong id="affective">none</strong></div>
          <div class="metric"><span>Habit</span><strong id="habit">none</strong></div>
          <div class="metric"><span>Expression</span><strong id="expression-profile">none</strong></div>
          <div class="metric"><span>Autonomous</span><strong id="autonomous-expression">none</strong></div>
          <div class="metric"><span>Relationship</span><strong id="relationship">none</strong></div>
          <div class="metric"><span>Donation</span><strong id="donation-reaction">none</strong></div>
          <div class="metric"><span>Media</span><strong id="media-reaction">none</strong></div>
          <div class="metric"><span>Topic</span><strong id="topic-reaction">none</strong></div>
          <div class="metric"><span>Memory Recall</span><strong id="memory-recall">none</strong></div>
          <div class="metric"><span>Game Risk</span><strong id="game-risk">none</strong></div>
          <div class="metric"><span>Commentary</span><strong id="game-commentary">none</strong></div>
          <div class="metric"><span>Game Goal</span><strong id="game-goal">none</strong></div>
          <div class="metric"><span>Game Action</span><strong id="game-action">none</strong></div>
          <div class="metric"><span>Game Control</span><strong id="game-control">none</strong></div>
          <div class="metric"><span>Embodiment</span><strong id="game-embodiment">none</strong></div>
          <div class="metric"><span>Session</span><strong id="session-phase">none</strong></div>
          <div class="metric"><span>Human Score</span><strong id="human-score">none</strong></div>
          <div class="metric"><span>Boundary Audit</span><strong id="boundary-audit">none</strong></div>
          <div class="metric"><span>Candidate Validation</span><strong id="candidate-validation">none</strong></div>
          <div class="metric"><span>Candidate Persistence</span><strong id="candidate-persistence">0</strong></div>
          <div class="metric"><span>Readiness</span><strong id="readiness">none</strong></div>
          <div class="metric"><span>Next Readiness</span><strong id="next-readiness">none</strong></div>
          <div class="metric"><span>Readiness Counts</span><strong id="readiness-counts">none</strong></div>
          <div class="metric"><span>Integration Probe</span><strong id="integration-probe-readiness">none</strong></div>
          <div class="metric"><span>Review Items</span><strong id="review-items">0</strong></div>
          <div class="metric"><span>Affect</span><strong id="affect">none</strong></div>
          <div class="metric"><span>Duration</span><strong id="duration">0 ms</strong></div>
          <div class="metric"><span>Sync</span><strong id="sync">none</strong></div>
          <div class="metric"><span>Idle Scheduler</span><strong id="idle-scheduler">off</strong></div>
          <div class="metric"><span>HTTP Ingest</span><strong id="http-ingest">off</strong></div>
        </div>
        <div class="bars">
          <div class="bar-row"><span>Energy</span><progress id="energy" max="1" value="0"></progress><span id="energy-v">0.00</span></div>
          <div class="bar-row"><span>Amusement</span><progress id="amusement" max="1" value="0"></progress><span id="amusement-v">0.00</span></div>
          <div class="bar-row"><span>Focus</span><progress id="focus" max="1" value="0"></progress><span id="focus-v">0.00</span></div>
          <div class="bar-row"><span>Warmth</span><progress id="warmth" max="1" value="0"></progress><span id="warmth-v">0.00</span></div>
        </div>
        <div class="output">
          <div class="spoken" id="spoken"></div>
          <pre id="cue-json">{}</pre>
        </div>
      </section>
      <section>
        <h2>Performance Timeline</h2>
        <div class="timeline" id="timeline"></div>
      </section>
      <section>
        <h2>History</h2>
        <div class="history" id="history"></div>
      </section>
    </div>
  </main>
  <script>
    const $ = (id) => document.getElementById(id);
    let latestState = null;

    $("refresh").addEventListener("click", refresh);
    $("idle-tick").addEventListener("click", async () => {
      await postJson("/idle-tick", { idle_reason: "manual_debug_tick" }, "comment-status");
    });
    $("idle-start").addEventListener("click", async () => {
      await postJson("/idle/start", {}, "comment-status");
    });
    $("idle-stop").addEventListener("click", async () => {
      await postJson("/idle/stop", {}, "comment-status");
    });
    $("ingest-tick").addEventListener("click", async () => {
      await postJson("/ingest/tick", { reason: "manual_debug_ingest_tick" }, "comment-status");
    });
    $("ingest-start").addEventListener("click", async () => {
      await postJson("/ingest/start", {}, "comment-status");
    });
    $("ingest-stop").addEventListener("click", async () => {
      await postJson("/ingest/stop", {}, "comment-status");
    });
    $("production-probe").addEventListener("click", async () => {
      await postJson("/production/probe", { mode: "dry_run" }, "comment-status");
    });
    $("integration-probe").addEventListener("click", async () => {
      await postJson("/integrations/probe", { mode: "dry_run" }, "comment-status");
    });
    $("comment-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      await postJson("/comment", data, "comment-status");
    });
    $("game-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      data.detected_events = String(data.detected_events || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      data.screen_confidence = Number(data.screen_confidence || 0.5);
      await postJson("/game-observation", data, "game-status");
    });
    $("donation-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      await postJson("/donation", data, "donation-status");
    });
    $("media-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      data.confidence = Number(data.confidence || 0.5);
      await postJson("/media-watch", data, "media-status");
    });
    $("topic-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      data.freshness_score = Number(data.freshness_score || 0.5);
      data.source_trust_score = Number(data.source_trust_score || 0.5);
      await postJson("/external-topic", data, "topic-status");
    });
    $("scenario-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        const scenario = JSON.parse(data.scenario_json || "{}");
        await postJson("/scenario/run", scenario, "scenario-status");
      } catch (error) {
        $("scenario-status").textContent = error.message;
      }
    });

    async function postJson(path, data, statusId) {
      $(statusId).textContent = "sending";
      try {
        const response = await fetch(path, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data),
        });
        const body = await response.json();
        $(statusId).textContent = response.ok ? "sent" : body.error || "failed";
        if (body.state) renderState(body.state);
        await refresh();
      } catch (error) {
        $(statusId).textContent = error.message;
      }
    }

    async function refresh() {
      const [response, idleResponse, ingestResponse, reviewResponse, readinessResponse] = await Promise.all([
        fetch("/state", { cache: "no-store" }),
        fetch("/idle/status", { cache: "no-store" }),
        fetch("/ingest/status", { cache: "no-store" }),
        fetch("/candidate-reviews", { cache: "no-store" }),
        fetch("/readiness", { cache: "no-store" }),
      ]);
      const state = await response.json();
      const idle = await idleResponse.json();
      const ingest = await ingestResponse.json();
      const reviews = await reviewResponse.json();
      const readiness = await readinessResponse.json();
      $("idle-scheduler").textContent = idle.idle_scheduler?.running
        ? "running"
        : idle.idle_scheduler
          ? "stopped"
          : "unavailable";
      $("http-ingest").textContent = ingest.http_ingest_scheduler?.running
        ? "running"
        : ingest.http_ingest_scheduler
          ? "stopped"
          : "unavailable";
      $("review-items").textContent = String(reviews.stats?.total_items || 0);
      $("readiness").textContent = readiness.report?.readiness_status || "none";
      $("next-readiness").textContent = readiness.report?.next_readiness_state || "none";
      $("readiness-counts").textContent = formatReadinessCounts(
        readiness.report?.readiness_state_counts
      );
      $("integration-probe-readiness").textContent =
        readiness.report?.integration_probe_readiness_summary?.next_readiness_state || "none";
      renderState(state);
    }

    function formatReadinessCounts(counts) {
      if (!counts || typeof counts !== "object") return "none";
      const keys = [
        "configuration_waiting",
        "runtime_waiting",
        "real_device_waiting",
        "operator_review_required",
        "ready",
      ];
      return keys
        .filter((key) => Number(counts[key] || 0) > 0)
        .map((key) => key + ":" + String(Number(counts[key] || 0)))
        .join(" ") || "ready:0";
    }

    function renderState(state) {
      latestState = state;
      $("status").textContent = state.status || "idle";
      $("decision").textContent = state.last_decision || "none";
      $("source").textContent = state.last_source || "none";
      $("payload").textContent = state.last_payload_kind || "none";
      $("persona").textContent = state.last_persona_profile?.profile_id || "none";
      $("prosody").textContent = state.last_speech_cue?.prosody_style || "none";
      $("speech-rate").textContent = state.last_speech_rate_profile?.base_rate || "none";
      $("language-profile").textContent = state.last_language_profile?.response_language || "none";
      $("subtitle-status").textContent = state.last_subtitle_cue?.subtitle_language
        ? state.last_subtitle_cue.subtitle_language + ":" + (state.last_subtitle_cue.reading_speed_guard?.guard_status || "unknown")
        : "none";
      $("subtitle-bridge").textContent = state.last_subtitle_adapter_summary?.bridge_status || "none";
      $("motion").textContent = state.last_motion_cue?.motion_style || "none";
      $("body").textContent = state.last_body_continuity?.body_state_id || "none";
      $("camera-proximity").textContent = state.last_camera_proximity?.camera_proximity_profile || "none";
      $("rhythm").textContent = state.last_turn_rhythm?.rhythm_state_id || "none";
      $("affective").textContent = state.last_affective_continuity?.affective_state_id || "none";
      $("habit").textContent = state.last_personality_habit?.selected_habit || "none";
      $("expression-profile").textContent = state.last_expression_profile?.expression_profile_id || "none";
      $("autonomous-expression").textContent = state.last_autonomous_expression?.autonomous_state_id || "none";
      $("relationship").textContent = state.last_relationship_deepening?.familiarity_level || "none";
      $("donation-reaction").textContent = state.last_donation_reaction?.reaction_style || "none";
      $("media-reaction").textContent = state.last_media_watch_reaction?.reaction_mode || "none";
      $("topic-reaction").textContent = state.last_external_topic_reaction?.reaction_mode || "none";
      $("memory-recall").textContent = state.last_memory_recall?.recall_decision || "none";
      $("game-risk").textContent = state.last_game_perception?.danger_level || "none";
      $("game-commentary").textContent = state.last_game_commentary?.commentary_mode || "none";
      $("game-goal").textContent = state.last_game_player?.game_goal || "none";
      $("game-action").textContent = state.last_game_action_validation?.validation_status || "none";
      $("game-control").textContent = state.last_game_control_result?.control_status || "none";
      $("game-embodiment").textContent = state.last_game_embodiment?.game_embodied_state || "none";
      $("session-phase").textContent = state.last_stream_lifecycle?.stream_lifecycle_state?.session_phase || "none";
      $("human-score").textContent = state.last_human_likeness_evaluation?.total_human_likeness_score?.toFixed?.(2) || "none";
      $("boundary-audit").textContent = state.last_boundary_audit?.audit_status || "none";
      $("candidate-validation").textContent = state.last_candidate_validation?.validation_status || "none";
      $("candidate-persistence").textContent = String(state.last_candidate_persistence?.memory_committed_count || 0);
      $("review-items").textContent = String(state.last_candidate_review_items?.length || $("review-items").textContent || 0);
      $("affect").textContent = state.last_affect_snapshot?.affect_label || "none";
      $("duration").textContent = String(state.last_performance_plan?.total_duration_ms || state.last_speech_cue?.estimated_duration_ms || 0) + " ms";
      $("sync").textContent = state.last_performance_plan?.sync_mode || "none";
      $("spoken").textContent = state.last_text || "";
      setBar("energy", state.last_affect_snapshot?.energy || 0);
      setBar("amusement", state.last_affect_snapshot?.amusement || 0);
      setBar("focus", state.last_affect_snapshot?.focus || 0);
      setBar("warmth", state.last_affect_snapshot?.warmth || 0);
      $("cue-json").textContent = JSON.stringify({
        speech_cue: state.last_speech_cue,
        speech_rate_profile: state.last_speech_rate_profile,
        language_profile: state.last_language_profile,
        subtitle_cue: state.last_subtitle_cue,
        tongue_twister_mode: state.last_tongue_twister_mode,
        persona_profile: state.last_persona_profile,
        motion_cue: state.last_motion_cue,
        performance_plan: state.last_performance_plan,
        body_continuity: state.last_body_continuity,
        camera_proximity: state.last_camera_proximity,
        turn_rhythm: state.last_turn_rhythm,
        affective_continuity: state.last_affective_continuity,
        personality_habit: state.last_personality_habit,
        expression_profile: state.last_expression_profile,
        autonomous_expression: state.last_autonomous_expression,
        relationship_deepening: state.last_relationship_deepening,
        donation_reaction: state.last_donation_reaction,
        media_watch_reaction: state.last_media_watch_reaction,
        external_topic_reaction: state.last_external_topic_reaction,
        memory_recall: state.last_memory_recall,
        game_perception: state.last_game_perception,
        game_commentary: state.last_game_commentary,
        game_player: state.last_game_player,
        game_action_validation: state.last_game_action_validation,
        game_control_result: state.last_game_control_result,
        game_embodiment: state.last_game_embodiment,
        stream_lifecycle: state.last_stream_lifecycle,
        human_likeness_evaluation: state.last_human_likeness_evaluation,
        boundary_audit: state.last_boundary_audit,
        candidate_validation: state.last_candidate_validation,
        candidate_persistence: state.last_candidate_persistence,
        candidate_review_items: state.last_candidate_review_items,
        game_context: state.last_game_context,
      }, null, 2);
      renderTimeline(state.last_performance_plan, state.last_expression_profile);
      renderHistory(state.history || []);
    }

    function setBar(id, value) {
      const fixed = Number(value || 0).toFixed(2);
      $(id).value = Number(fixed);
      $(id + "-v").textContent = fixed;
    }

    function renderHistory(history) {
      $("history").replaceChildren(...history.slice().reverse().map((item) => {
        const row = document.createElement("div");
        row.className = "history-row";
        const source = document.createElement("div");
        source.textContent = item.source || "source";
        const style = document.createElement("div");
        style.textContent = item.candidate_review_count ? "reviews:" + item.candidate_review_count : item.human_likeness_score ? String(item.human_likeness_score.toFixed?.(2) || item.human_likeness_score) : item.session_phase || item.game_embodied_state || item.game_goal || item.commentary_mode || item.commentary_trigger || item.media_watch_reaction_mode || item.donation_reaction_style || item.memory_recall_decision || item.relationship_candidate_status || item.camera_proximity_profile || item.expression_profile_id || item.selected_habit || item.affective_state_id || item.rhythm_state_id || item.body_state_id || item.motion_style || item.prosody_style || "style";
        const text = document.createElement("div");
        text.textContent = item.text || "";
        row.append(source, style, text);
        return row;
      }));
    }

    function renderTimeline(plan, expressionProfile) {
      const container = $("timeline");
      if (!plan?.tracks) {
        container.textContent = "No performance plan yet.";
        return;
      }
      const total = Math.max(1, plan.total_duration_ms || 1);
      const rows = [
        ["speech", plan.tracks.speech || []],
        ["mouth", (plan.tracks.mouth || []).slice(0, 48)],
        ["breath", plan.tracks.breath || []],
        ["expression", plan.tracks.expression || []],
        ["expression-breath", expressionProfile?.breath_event_plan || []],
        ["motion", plan.tracks.motion || []],
      ].map(([name, events]) => {
        const row = document.createElement("div");
        row.className = "timeline-row";
        const label = document.createElement("div");
        label.textContent = name;
        const track = document.createElement("div");
        track.className = "timeline-track";
        for (const event of events) {
          const bar = document.createElement("div");
          bar.className = "timeline-event " + name;
          const start = Math.max(0, Number(event.start_ms || 0));
          const end = Math.max(start + 1, Number(event.end_ms || start + 1));
          bar.style.left = String(Math.min(100, (start / total) * 100)) + "%";
          bar.style.width = String(Math.max(0.5, Math.min(100, ((end - start) / total) * 100))) + "%";
          bar.title = event.kind || name;
          track.append(bar);
        }
        row.append(label, track);
        return row;
      });
      container.replaceChildren(...rows);
    }

    refresh();
    setInterval(refresh, 1200);
  </script>
</body>
</html>`;
}
