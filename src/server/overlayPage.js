export function renderOverlayPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>IRIS Overlay</title>
  <style>
    :root {
      color-scheme: dark;
      font-family: "Segoe UI", sans-serif;
      background: transparent;
    }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: end center;
      background: transparent;
      overflow: hidden;
    }
    #bubble {
      box-sizing: border-box;
      width: min(92vw, 1100px);
      margin: 0 0 5vh;
      padding: 22px 28px;
      border: 2px solid rgba(255,255,255,.35);
      border-radius: 8px;
      background: rgba(12, 16, 24, .78);
      color: #fff;
      font-size: clamp(24px, 3vw, 42px);
      line-height: 1.35;
      text-wrap: balance;
      box-shadow: 0 18px 60px rgba(0,0,0,.35);
      opacity: 0;
      transform: translateY(12px);
      transition: opacity .22s ease, transform .22s ease;
    }
    #bubble.visible {
      opacity: 1;
      transform: translateY(0);
    }
    #bubble.big-laugh {
      animation: big-laugh .72s ease-in-out 2;
      border-color: rgba(255,255,255,.72);
    }
    #bubble.focused-talk {
      border-color: rgba(136, 215, 255, .65);
      box-shadow: 0 18px 60px rgba(0,0,0,.35), 0 0 28px rgba(136,215,255,.22);
    }
    #bubble.soft-motion {
      animation: soft-breath 3.6s ease-in-out infinite;
    }
    #bubble.camera-micro {
      transform: translateY(0) scale(1.035);
    }
    #bubble.camera-close {
      transform: translateY(-8px) scale(1.075);
      border-color: rgba(255,255,255,.68);
    }
    #bubble.camera-face {
      transform: translateY(-14px) scale(1.12);
      border-color: rgba(255,255,255,.78);
      box-shadow: 0 22px 70px rgba(0,0,0,.38), 0 0 32px rgba(255,255,255,.14);
    }
    #bubble.camera-extreme {
      transform: translateY(-18px) scale(1.16);
      border-color: rgba(255,255,255,.86);
      box-shadow: 0 24px 80px rgba(0,0,0,.42), 0 0 44px rgba(255,255,255,.2);
    }
    #bubble.autonomous-scream {
      animation: startle-pop .46s ease-in-out 1;
      border-color: rgba(255, 236, 168, .9);
    }
    #bubble.autonomous-dance {
      animation: tiny-dance .9s ease-in-out 2;
      border-color: rgba(157, 225, 197, .78);
    }
    #bubble.autonomous-hum,
    #bubble.autonomous-sing {
      box-shadow: 0 18px 60px rgba(0,0,0,.35), 0 0 30px rgba(157,225,197,.18);
    }
    body[data-live2d-motion="laugh_big"] #bubble,
    body[data-live2d-motion="surprise_scream"] #bubble {
      border-color: rgba(255, 236, 168, .92);
    }
    body[data-live2d-motion="focused_talk"] #bubble,
    body[data-live2d-motion="screen_focus"] #bubble {
      border-color: rgba(136, 215, 255, .72);
    }
    body[data-live2d-expression="wide_eyes_short_scream"] #bubble {
      box-shadow: 0 20px 72px rgba(0,0,0,.42), 0 0 34px rgba(255,236,168,.22);
    }
    #bubble.subtitle-rtl {
      direction: rtl;
      text-align: right;
    }
    #bubble.rate-fast {
      border-color: rgba(255, 236, 168, .78);
    }
    #bubble.rate-repair {
      border-color: rgba(255, 167, 167, .82);
    }
    #meta {
      display: block;
      margin-bottom: 8px;
      font-size: .42em;
      color: rgba(255,255,255,.68);
      letter-spacing: 0;
    }
    @keyframes big-laugh {
      0%, 100% { transform: translateY(0) scale(1); }
      28% { transform: translateY(-8px) scale(1.018); }
      56% { transform: translateY(3px) scale(.996); }
    }
    @keyframes soft-breath {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-3px) scale(1.004); }
    }
    @keyframes startle-pop {
      0%, 100% { transform: translateY(0) scale(1); }
      32% { transform: translateY(-12px) scale(1.04); }
      62% { transform: translateY(4px) scale(.99); }
    }
    @keyframes tiny-dance {
      0%, 100% { transform: translateX(0) translateY(0) rotate(0deg); }
      25% { transform: translateX(-5px) translateY(-4px) rotate(-1deg); }
      50% { transform: translateX(4px) translateY(-2px) rotate(1deg); }
      75% { transform: translateX(-2px) translateY(-3px) rotate(-.5deg); }
    }
  </style>
</head>
<body>
  <audio id="tts-audio" preload="auto" aria-hidden="true"></audio>
  <div id="bubble"><span id="meta">IRIS</span><span id="text"></span></div>
  <script>
    const bubble = document.getElementById("bubble");
    const text = document.getElementById("text");
    const ttsAudio = document.getElementById("tts-audio");
    let lastDisplayEventKey = null;
    let lastStateEventId = null;
    let lastRenderManifestKey = null;
    let lastVisualRenderManifestKey = null;
    const lastAppliedArtifactManifestIds = {
      tts: null,
      live2d: null,
      subtitle: null,
    };
    const lastAppliedArtifacts = {
      tts: null,
      live2d: null,
      subtitle: null,
    };
    let lastTtsObjectUrl = null;
    let blockedTtsArtifactKey = "";
    let blockedTtsRetryAtMs = 0;
    let lastTtsPlaybackEventKey = "";
    let hideTimer = null;
    let eventStreamActive = false;
    let eventStreamLastMessageAtMs = 0;
    let overlayEvents = null;
    let eventStreamReconnectTimer = null;
    let artifactPollInFlight = false;
    let artifactPollPending = false;
    const overlayFetchTimeoutMs = 2200;
    const overlayRouteParams = new URLSearchParams(window.location.search);
    const overlayRoutes = Object.freeze({
      eventStream: safeLocalRoute(overlayRouteParams.get("event_stream"), "/overlay/events"),
      eventBootstrap: safeLocalRoute(overlayRouteParams.get("event_bootstrap"), "/overlay/event"),
      state: safeLocalRoute(overlayRouteParams.get("state"), "/state"),
      manifest: safeLocalRoute(
        overlayRouteParams.get("manifest"),
        "/event-render-manifests/latest"
      ),
    });
    const artifactRoutes = Object.freeze({
      tts: safeLocalRoute(
        overlayRouteParams.get("artifact_tts"),
        "/event-render-manifests/latest/artifact/tts"
      ),
      live2d: safeLocalRoute(
        overlayRouteParams.get("artifact_live2d"),
        "/event-render-manifests/latest/artifact/live2d"
      ),
      subtitle: safeLocalRoute(
        overlayRouteParams.get("artifact_subtitle"),
        "/event-render-manifests/latest/artifact/subtitle"
      ),
    });
    const expectedArtifactKinds = Object.freeze({
      tts: ["audio_wav", "audio_mpeg", "audio_mp4", "audio_aac", "audio_flac", "audio_ogg", "audio_opus", "audio_webm"],
      live2d: ["live2d_cue_json", "live2d_engine_cue_json"],
      subtitle: ["subtitle_vtt", "subtitle_srt"],
    });
    const expectedArtifactContentTypes = Object.freeze({
      tts: [
        "audio/wav",
        "audio/wave",
        "audio/x-wav",
        "audio/mpeg",
        "audio/mp3",
        "audio/x-mpeg",
        "audio/x-mp3",
        "audio/mpeg3",
        "audio/x-mpeg-3",
        "audio/mp4",
        "audio/m4a",
        "audio/x-m4a",
        "audio/aac",
        "audio/x-aac",
        "audio/flac",
        "audio/x-flac",
        "audio/ogg",
        "audio/opus",
        "audio/webm",
      ],
      live2d: ["application/json", "text/json", "text/plain"],
      subtitle: ["text/vtt", "text/plain", "text/srt", "application/srt", "application/x-subrip", "application/json"],
    });

    function renderOverlayDisplayEvent(event, { fromEventStream = false } = {}) {
      if (!event || event.schema !== "iris_overlay_display_event_v1") return;
      if (fromEventStream) {
        eventStreamActive = true;
        eventStreamLastMessageAtMs = Date.now();
      }
      const displayEventKey = createDisplayEventKey(event);
      if (displayEventKey && displayEventKey === lastDisplayEventKey) {
        refreshLatestArtifacts();
        return;
      }
      lastDisplayEventKey = displayEventKey || String(Date.now());
      const subtitleText = event.display?.subtitle_text || "";
      text.textContent = subtitleText;
      bubble.dir = event.display?.script_direction || "ltr";
      bubble.classList.toggle("visible", subtitleText !== "");
      clearTimeout(hideTimer);
      if (subtitleText) {
        const duration = Math.max(2200, Math.min(14000, Number(event.timing?.planned_visible_ms || 4200)));
        hideTimer = setTimeout(() => {
          bubble.classList.remove("visible");
        }, duration);
      }
      const classHints = new Set(event.class_hints || []);
      bubble.classList.toggle("big-laugh", classHints.has("big_laugh"));
      bubble.classList.toggle("focused-talk", classHints.has("focused_talk"));
      bubble.classList.toggle("soft-motion", classHints.has("soft_motion"));
      bubble.classList.toggle("camera-micro", classHints.has("camera_micro"));
      bubble.classList.toggle("camera-close", classHints.has("camera_close"));
      bubble.classList.toggle("camera-face", classHints.has("camera_face_near"));
      bubble.classList.toggle("camera-extreme", classHints.has("camera_extreme_closeup"));
      bubble.classList.toggle("autonomous-scream", classHints.has("autonomous_surprise_scream"));
      bubble.classList.toggle("autonomous-dance", classHints.has("autonomous_happy_dance"));
      bubble.classList.toggle("autonomous-hum", classHints.has("autonomous_happy_humming"));
      bubble.classList.toggle("autonomous-sing", classHints.has("autonomous_happy_loud_sing"));
      bubble.classList.toggle("subtitle-rtl", event.display?.script_direction === "rtl");
      bubble.classList.toggle(
        "rate-fast",
        ["fast", "tongue_twister_fast"].includes(event.timing?.speech_rate_label)
      );
      bubble.classList.toggle(
        "rate-repair",
        event.timing?.speech_rate_repair_status === "repair_required"
      );
      bubble.classList.toggle("tts-artifact-ready", event.bridge?.tts_artifact_available === true);
      bubble.classList.toggle(
        "live2d-artifact-ready",
        event.bridge?.live2d_artifact_available === true
      );
      bubble.classList.toggle(
        "subtitle-artifact-ready",
        event.bridge?.subtitle_artifact_available === true
      );
      document.body.dataset.ttsArtifact = event.bridge?.tts_artifact_available ? "available" : "missing";
      document.body.dataset.live2dArtifact = event.bridge?.live2d_artifact_available ? "available" : "missing";
      document.body.dataset.subtitleArtifact = event.bridge?.subtitle_artifact_available ? "available" : "missing";
      document.body.dataset.ttsBridgeStatus = safeCueLabel(event.bridge?.tts_bridge_status || "none");
      document.body.dataset.live2dBridgeStatus = safeCueLabel(event.bridge?.live2d_bridge_status || "none");
      document.body.dataset.subtitleBridgeStatus = safeCueLabel(event.bridge?.subtitle_bridge_status || "none");
      document.body.dataset.ttsArtifactKind = safeCueLabel(event.bridge?.tts_artifact_kind || "none");
      document.body.dataset.live2dArtifactKind = safeCueLabel(event.bridge?.live2d_artifact_kind || "none");
      document.body.dataset.subtitleArtifactKind = safeCueLabel(event.bridge?.subtitle_artifact_kind || "none");
      document.body.dataset.ttsDurationMs = safeDatasetNumber(event.bridge?.tts_duration_ms);
      document.body.dataset.live2dDurationMs = safeDatasetNumber(event.bridge?.live2d_duration_ms);
      document.body.dataset.subtitleDurationMs = safeDatasetNumber(event.bridge?.subtitle_duration_ms);
      refreshLatestArtifacts();
    }

    function createDisplayEventKey(event) {
      return [
        event.generated_at_ms ?? "",
        event.payload_kind ?? "",
        event.display?.display_start_ms ?? "",
        event.display?.display_end_ms ?? "",
        event.timing?.planned_visible_ms ?? "",
      ].join(":");
    }

    async function refreshLatestArtifacts() {
      if (artifactPollInFlight) {
        artifactPollPending = true;
        return;
      }
      artifactPollInFlight = true;
      artifactPollPending = false;
      try {
        const response = await fetchNoStoreWithTimeout(overlayRoutes.manifest);
        if (!response.ok) {
          const applied = await applyLatestPartialVisualArtifacts();
          document.body.dataset.artifactGroupApplyStatus = applied
            ? "visuals_applied_manifest_unavailable"
            : "manifest_unavailable";
          return;
        }
        const body = await response.json();
        const report = body.event_render_manifest_report;
        const summary = report?.latest_manifest_summary;
        if (!summary) {
          const applied = await applyLatestPartialVisualArtifacts();
          document.body.dataset.artifactGroupApplyStatus = applied
            ? "visuals_applied_manifest_not_ready"
            : "manifest_not_ready";
          document.body.dataset.artifactGroupBlockingStatus = safeCueLabel(
            summary?.obs_pickup_status ||
            report?.obs_pickup_status ||
            report?.latest_manifest_error_kind ||
            "not_ready"
          );
          return;
        }
        document.body.dataset.artifactGroupBlockingStatus =
          summary.obs_pickup_ready === true
            ? "none"
            : safeCueLabel(
                summary?.obs_pickup_status ||
                report?.obs_pickup_status ||
                report?.latest_manifest_error_kind ||
                "not_ready"
              );
      const manifestKey = createManifestRefreshKey(summary);
      const reportManifestId = summary.manifest_id || "";
      document.body.dataset.artifactGroupManifestId = safeCueLabel(reportManifestId);
      if (manifestKey && manifestKey === lastRenderManifestKey) {
        document.body.dataset.artifactGroupApplyStatus = "already_applied";
        if (reportManifestId) redispatchAppliedArtifactEvents(reportManifestId);
        return;
      }
      if (manifestKey && manifestKey === lastVisualRenderManifestKey) {
        document.body.dataset.artifactGroupApplyStatus = "fetching_audio";
        const ttsArtifact = await fetchExpectedArtifact(
          "tts",
          reportManifestId,
          "blob",
          summary.rendered_at_ms_by_adapter?.tts
        );
        if (!ttsArtifact) {
          document.body.dataset.artifactGroupApplyStatus = "visuals_applied_audio_missing";
          return;
        }
        const audioManifestId = ttsArtifact.manifest_id || reportManifestId;
        await playLatestTtsArtifact(ttsArtifact, audioManifestId);
        if (ttsArtifactReadyForManifestComplete(audioManifestId, ttsArtifact)) {
          lastRenderManifestKey = manifestKey;
          document.body.dataset.artifactGroupApplyStatus = "applied";
          redispatchAppliedArtifactEvents(audioManifestId);
        } else {
          document.body.dataset.artifactGroupApplyStatus = "visuals_applied_audio_pending";
        }
        return;
      }
      document.body.dataset.artifactGroupApplyStatus = "fetching";
      const artifactGroup = await fetchLatestArtifactGroup(summary);
      if (!artifactGroup) {
        document.body.dataset.artifactGroupApplyStatus = "missing";
        return;
      }
      document.body.dataset.artifactGroupApplyStatus = artifactGroup.complete ? "ready" : "incomplete";
      const artifactGroupManifestId = getArtifactGroupManifestId(artifactGroup) || reportManifestId;
      document.body.dataset.artifactGroupManifestId = safeCueLabel(artifactGroupManifestId);
      if (!artifactGroup.complete) {
        if (artifactGroupReadyForVisualApply(artifactGroup)) {
          document.body.dataset.artifactGroupApplyStatus = "applying_visuals";
          const visualApplyTasks = [];
          if (artifactGroup.live2d) {
            visualApplyTasks.push(applyLatestLive2dArtifact(artifactGroup.live2d, artifactGroupManifestId));
          }
          if (artifactGroup.subtitle) {
            visualApplyTasks.push(applyLatestSubtitleArtifact(artifactGroup.subtitle, artifactGroupManifestId));
          }
          const visualResults = await Promise.allSettled(visualApplyTasks);
          document.body.dataset.artifactGroupApplyStatus =
            artifactGroupApplySettled(visualResults) &&
            artifactGroupVisualsApplied(artifactGroupManifestId, artifactGroup)
              ? "visuals_applied_audio_missing"
              : "partial";
          if (
            manifestKey &&
            document.body.dataset.artifactGroupApplyStatus === "visuals_applied_audio_missing"
          ) {
            lastVisualRenderManifestKey = manifestKey;
          }
        }
        return;
      }
      document.body.dataset.artifactGroupApplyStatus = "validating";
      if (!artifactGroupReadyForSynchronizedApply(artifactGroup)) {
        document.body.dataset.artifactGroupApplyStatus = "not_applicable";
        return;
      }
        document.body.dataset.artifactGroupApplyStatus = "applying";
        const applyResults = await Promise.allSettled([
          playLatestTtsArtifact(artifactGroup.tts, artifactGroupManifestId),
          applyLatestLive2dArtifact(artifactGroup.live2d, artifactGroupManifestId),
          applyLatestSubtitleArtifact(artifactGroup.subtitle, artifactGroupManifestId),
        ]);
      if (
        manifestKey &&
        artifactGroupApplySettled(applyResults) &&
        artifactGroupApplied(artifactGroupManifestId, artifactGroup) &&
        ttsArtifactReadyForManifestComplete(artifactGroupManifestId, artifactGroup.tts)
      ) {
        lastRenderManifestKey = manifestKey;
        lastVisualRenderManifestKey = manifestKey;
        document.body.dataset.artifactGroupApplyStatus = "applied";
      } else if (artifactGroupVisualsApplied(artifactGroupManifestId, artifactGroup)) {
        if (manifestKey) lastVisualRenderManifestKey = manifestKey;
        document.body.dataset.artifactGroupApplyStatus = "visuals_applied_audio_pending";
      } else {
        document.body.dataset.artifactGroupApplyStatus = "partial";
      }
      } catch {
        document.body.dataset.artifactGroupApplyStatus = "waiting";
        // OBS Browser Source can run before artifacts exist; absence is a quiet waiting state.
      } finally {
        artifactPollInFlight = false;
        if (artifactPollPending) {
          artifactPollPending = false;
          setTimeout(refreshLatestArtifacts, 0);
        }
      }
    }

    async function applyLatestPartialVisualArtifacts() {
      const [live2d, subtitle] = await Promise.allSettled([
        fetchExpectedArtifact("live2d", "", "json"),
        fetchExpectedArtifact("subtitle", "", "text"),
      ]).then((results) => results.map((result) => (result.status === "fulfilled" ? result.value : null)));
      const artifactGroup = { live2d, subtitle };
      if (!artifactGroupReadyForVisualApply(artifactGroup)) return false;
      const manifestId = live2d?.manifest_id || subtitle?.manifest_id || "";
      const tasks = [];
      if (live2d) tasks.push(applyLatestLive2dArtifact(live2d, manifestId));
      if (subtitle) tasks.push(applyLatestSubtitleArtifact(subtitle, manifestId));
      const results = await Promise.allSettled(tasks);
      return artifactGroupApplySettled(results) && artifactGroupVisualsApplied(manifestId, artifactGroup);
    }

    async function fetchNoStoreWithTimeout(source) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), overlayFetchTimeoutMs);
      try {
        return await fetch(source, { cache: "no-store", signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    }

    async function fetchLatestArtifactGroup(summary) {
      const manifestId = summary?.manifest_id;
      const renderedAtByAdapter = summary?.rendered_at_ms_by_adapter ?? {};
      const [tts, live2d, subtitle] = await Promise.allSettled([
        fetchExpectedArtifact("tts", manifestId, "blob", renderedAtByAdapter.tts),
        fetchExpectedArtifact("live2d", manifestId, "json", renderedAtByAdapter.live2d),
        fetchExpectedArtifact("subtitle", manifestId, "text", renderedAtByAdapter.subtitle),
      ]).then((results) => results.map((result) => (result.status === "fulfilled" ? result.value : null)));
      if (!tts && !live2d && !subtitle) return null;
      return { tts, live2d, subtitle, complete: tts !== null && live2d !== null && subtitle !== null };
    }

    function artifactGroupReadyForSynchronizedApply(artifactGroup) {
      if (!ttsAudio || !artifactGroup?.tts?.blob || artifactGroup.tts.blob.size <= 0) return false;
      if (!artifactGroup?.subtitle) return false;
      return artifactGroup?.live2d?.body != null;
    }

    function artifactGroupReadyForVisualApply(artifactGroup) {
      return artifactGroup?.live2d?.body != null || artifactGroup?.subtitle != null;
    }

    function getArtifactGroupManifestId(artifactGroup) {
      return (
        artifactGroup?.tts?.manifest_id ||
        artifactGroup?.live2d?.manifest_id ||
        artifactGroup?.subtitle?.manifest_id ||
        ""
      );
    }

    function hasApplicableLive2dCue(cue, body) {
      return [
        cue?.motion,
        cue?.expression,
        cue?.animation,
        cue?.applied_motion,
        cue?.motion_style,
        cue?.motion_key,
        cue?.motionKey,
        cue?.motion_id,
        cue?.motionId,
        cue?.motionName,
        cue?.motion_name,
        cue?.gesture,
        cue?.state_key,
        cue?.stateKey,
        cue?.pose,
        cue?.state,
        cue?.expression_key,
        cue?.expressionKey,
        cue?.expression_profile_id,
        cue?.expressionProfileId,
        cue?.expression_id,
        cue?.expressionId,
        cue?.expressionName,
        cue?.expression_name,
        cue?.facial_expression,
        cue?.facialExpression,
        cue?.state_expression_key,
        cue?.stateExpressionKey,
        cue?.emotion,
        cue?.autonomous?.state,
        cue?.expression?.autonomous_state_id,
        cue?.autonomous_state_id,
        body?.motion_style,
        body?.motion_key,
        body?.motionKey,
        body?.motion_id,
        body?.motionId,
        body?.motionName,
        body?.motion_name,
        body?.gesture,
        body?.state_key,
        body?.stateKey,
        body?.pose,
        body?.state,
        body?.expression_profile_id,
        body?.expressionProfileId,
        body?.expression_key,
        body?.expressionKey,
        body?.expression_id,
        body?.expressionId,
        body?.expressionName,
        body?.expression_name,
        body?.facial_expression,
        body?.facialExpression,
        body?.state_expression_key,
        body?.stateExpressionKey,
        body?.emotion,
        body?.autonomous_state_id,
      ].some((value) => value != null && value !== "");
    }

    function artifactGroupApplied(manifestId, artifactGroup) {
      return ["tts", "live2d", "subtitle"].every((kind) => {
        const artifact = artifactGroup?.[kind];
        if (!artifact) return false;
        return lastAppliedArtifactManifestIds[kind] === createArtifactApplicationKey(manifestId, artifact);
      });
    }

    function artifactGroupVisualsApplied(manifestId, artifactGroup) {
      const visualKinds = ["live2d", "subtitle"].filter((kind) => artifactGroup?.[kind]);
      if (visualKinds.length === 0) return false;
      return visualKinds.every((kind) => {
        const artifact = artifactGroup?.[kind];
        return lastAppliedArtifactManifestIds[kind] === createArtifactApplicationKey(manifestId, artifact);
      });
    }

    function ttsArtifactReadyForManifestComplete(manifestId, artifact) {
      const artifactKey = createArtifactApplicationKey(manifestId, artifact);
      if (!artifactKey) return false;
      return (
        lastAppliedArtifactManifestIds.tts === artifactKey &&
        blockedTtsArtifactKey !== artifactKey
      );
    }

    function redispatchAppliedArtifactEvents(manifestId) {
      const ttsArtifact = matchingAppliedArtifact("tts", manifestId);
      if (ttsArtifact) {
        dispatchTtsArtifactEvent({
          artifact: ttsArtifact,
          manifestId: ttsArtifact.manifest_id || manifestId,
          playbackStatus: document.body.dataset.ttsPlayback || "already_applied",
        });
      }
      const live2dArtifact = matchingAppliedArtifact("live2d", manifestId);
      if (live2dArtifact) {
        dispatchLive2dCueEvent({
          artifact: live2dArtifact,
          manifestId: live2dArtifact.manifest_id || manifestId,
          cue: extractLive2dCueBody(live2dArtifact.body),
          motionStyle: document.body.dataset.live2dMotion || "none",
          expressionKey: document.body.dataset.live2dExpression || "none",
          autonomousState: document.body.dataset.live2dAutonomous || "none",
          applyStatus: document.body.dataset.live2dArtifactApplied || "already_applied",
        });
      }
      const subtitleArtifact = matchingAppliedArtifact("subtitle", manifestId);
      if (subtitleArtifact) {
        const subtitleCue = extractFirstSubtitleCue(subtitleArtifact.text);
        dispatchSubtitleArtifactEvent({
          artifact: subtitleArtifact,
          manifestId: subtitleArtifact.manifest_id || manifestId,
          subtitleAvailable: subtitleCue.text !== "",
          displayStatus: document.body.dataset.subtitleArtifactApplied || "already_applied",
          subtitleText: subtitleCue.text,
          durationMs: subtitleCue.duration_ms,
        });
      }
    }

    function matchingAppliedArtifact(kind, manifestId) {
      const artifact = lastAppliedArtifacts[kind];
      if (!artifact) return null;
      return artifact.manifest_id === manifestId ? artifact : null;
    }

    function artifactGroupApplySettled(results) {
      return Array.isArray(results) && results.every((result) => result.status === "fulfilled");
    }

    async function fetchExpectedArtifact(kind, manifestId, bodyKind, expectedRenderedAtMs) {
      const route = artifactRoutes[kind];
      if (!route) return null;
      const source = ["live2d", "subtitle"].includes(kind)
        ? routeWithQueryParam(
            manifestId ? routeWithQueryParam(route, "manifest_id", String(manifestId)) : route,
            "allow_partial_visual",
            "true"
          )
        : manifestId
          ? routeWithQueryParam(route, "manifest_id", String(manifestId))
          : route;
        const response = await fetchNoStoreWithTimeout(source);
        if (!response.ok) return null;
        const responseManifestId = response.headers.get("x-iris-manifest-id");
        if (!responseManifestId) return null;
        if (
          manifestId &&
          responseManifestId !== String(manifestId) &&
          !isAcceptedPartialVisualArtifactManifest(kind, responseManifestId)
        ) return null;
        const responseManifestIdPresent = safeCueLabel(responseManifestId) !== "";
        const expectedRenderedAtNumber = Number(expectedRenderedAtMs);
        const expectedRenderedAtHeader = response.headers.get("x-iris-rendered-at-ms");
      if (Number.isFinite(expectedRenderedAtNumber)) {
        const renderedAtHeaderNumber = Number(expectedRenderedAtHeader);
        if (
          !Number.isFinite(renderedAtHeaderNumber) ||
          renderedAtHeaderNumber !== expectedRenderedAtNumber
        ) {
          return null;
        }
      }
      const renderedAtMs = Number.isFinite(expectedRenderedAtNumber)
        ? expectedRenderedAtNumber
        : Number(expectedRenderedAtHeader || Date.now());
      if (!Number.isFinite(renderedAtMs)) return null;
      const artifactKind = safeCueLabel(response.headers.get("x-iris-artifact-kind") || "");
      if (!isExpectedArtifactKind(kind, artifactKind)) return null;
      const contentType = safeHeaderValue(response.headers.get("content-type") || "");
      if (!isExpectedArtifactContentType(kind, contentType)) return null;
      const headerContentLength = Number(response.headers.get("content-length") || 0) || null;
      const contentHash = safeHeaderValue(response.headers.get("x-iris-artifact-byte-hash") || "");
      if (bodyKind === "blob") {
        const blob = await response.blob();
        return {
          kind,
          artifact_kind: artifactKind,
          content_type: contentType,
          manifest_id_present: responseManifestIdPresent,
          manifest_id: responseManifestId,
          rendered_at_ms: renderedAtMs,
          content_length: headerContentLength ?? blob.size ?? null,
          content_hash: contentHash,
          blob,
        };
      }
      if (bodyKind === "json") {
        const body = await response.json();
        const bodyLength = JSON.stringify(body).length;
        return {
          kind,
          artifact_kind: artifactKind,
          content_type: contentType,
          manifest_id_present: responseManifestIdPresent,
          manifest_id: responseManifestId,
          rendered_at_ms: renderedAtMs,
          content_length: headerContentLength ?? bodyLength,
          content_hash: contentHash,
          body,
        };
      }
      const textBody = await response.text();
      return {
        kind,
        artifact_kind: artifactKind,
        content_type: contentType,
        manifest_id_present: responseManifestIdPresent,
        manifest_id: responseManifestId,
        rendered_at_ms: renderedAtMs,
        content_length: headerContentLength ?? textBody.length,
        content_hash: contentHash,
        text: textBody,
      };
    }

    function isExpectedArtifactContentType(kind, contentType) {
      const normalized = String(contentType || "").toLowerCase();
      if ((kind === "live2d" || kind === "subtitle") && normalized.includes("+json")) return true;
      return expectedArtifactContentTypes[kind]?.some((expected) => normalized.startsWith(expected)) === true;
    }

    function isExpectedArtifactKind(kind, artifactKind) {
      const normalized = safeCueLabel(artifactKind || "");
      return expectedArtifactKinds[kind]?.includes(normalized) === true;
    }

    function isAcceptedPartialVisualArtifactManifest(kind, manifestId) {
      return ["live2d", "subtitle"].includes(kind) && String(manifestId || "").startsWith("partial-");
    }

    async function playLatestTtsArtifact(artifact, manifestId) {
      if (!ttsAudio) return;
      if (!artifact?.blob) return;
      const artifactKey = createArtifactApplicationKey(manifestId, artifact);
      const markTtsPlaybackStatus = (playbackStatus) => {
        const playbackEventKey = [artifactKey, playbackStatus].join(":");
        if (playbackEventKey && lastTtsPlaybackEventKey === playbackEventKey) return;
        lastTtsPlaybackEventKey = playbackEventKey;
        if (["playing", "ended", "blocked"].includes(playbackStatus) && artifactKey) {
          lastAppliedArtifactManifestIds.tts = artifactKey;
        }
        if (playbackStatus === "playing") {
          blockedTtsArtifactKey = "";
          blockedTtsRetryAtMs = 0;
        }
        lastAppliedArtifacts.tts = artifact;
        document.body.dataset.ttsPlayback = playbackStatus;
        dispatchTtsArtifactEvent({ artifact, manifestId, playbackStatus });
      };
      if (
        artifactKey &&
        blockedTtsArtifactKey === artifactKey &&
        Date.now() < blockedTtsRetryAtMs
      ) {
        markTtsPlaybackStatus("blocked_waiting");
        return;
      }
      if (
        artifactKey &&
        lastAppliedArtifactManifestIds.tts === artifactKey &&
        blockedTtsArtifactKey !== artifactKey
      ) {
        lastAppliedArtifacts.tts = artifact;
        dispatchTtsArtifactEvent({ artifact, manifestId, playbackStatus: "already_applied" });
        return;
      }
      if (lastTtsObjectUrl) {
        try {
          URL.revokeObjectURL(lastTtsObjectUrl);
        } catch {}
      }
      lastTtsObjectUrl = URL.createObjectURL(artifact.blob);
      ttsAudio.src = lastTtsObjectUrl;
      lastTtsPlaybackEventKey = "";
      markArtifactDatasetAvailable("tts", artifact);
      document.body.dataset.ttsManifestId = safeCueLabel(manifestId || "");
      document.body.dataset.ttsRenderedAtMs = safeDatasetNumber(artifact.rendered_at_ms);
      document.body.dataset.ttsPlayback = "loading";
      ttsAudio.onplaying = () => markTtsPlaybackStatus("playing");
      ttsAudio.onended = () => markTtsPlaybackStatus("ended");
      ttsAudio.onerror = () => {
        if (manifestId) lastAppliedArtifactManifestIds.tts = "";
        if (
          lastAppliedArtifacts.tts &&
          createArtifactApplicationKey(manifestId, lastAppliedArtifacts.tts) === artifactKey
        ) {
          lastAppliedArtifacts.tts = null;
        }
        if (blockedTtsArtifactKey === artifactKey) {
          blockedTtsArtifactKey = "";
          blockedTtsRetryAtMs = 0;
        }
        document.body.dataset.ttsPlayback = "error";
        dispatchTtsArtifactEvent({ artifact, manifestId, playbackStatus: "error" });
      };
      try {
        ttsAudio.load();
        await ttsAudio.play();
        markTtsPlaybackStatus("playing");
      } catch {
        blockedTtsArtifactKey = artifactKey || "";
        blockedTtsRetryAtMs = Date.now() + 5000;
        markTtsPlaybackStatus("blocked");
        // Some browser hosts require explicit audio permission; subtitles still remain visible.
      }
    }

    function dispatchTtsArtifactEvent({ artifact, manifestId, playbackStatus }) {
      const audioAvailable =
        typeof Blob === "function" &&
        artifact?.blob instanceof Blob &&
        artifact.blob.size > 0;
      window.dispatchEvent(new CustomEvent("iris-tts-artifact", {
        detail: {
          schema: "iris_overlay_tts_artifact_event_v1",
          manifest_id_present: manifestId !== "",
          manifest_id: safeCueLabel(manifestId || ""),
          event_id: safeCueLabel(artifact?.event_id || ""),
          artifact_kind: safeCueLabel(artifact?.artifact_kind || ""),
          content_type: safeHeaderValue(artifact?.content_type || ""),
          rendered_at_ms: artifact?.rendered_at_ms ?? null,
          content_length: artifact?.content_length ?? null,
          content_hash: safeHeaderValue(artifact?.content_hash || ""),
          artifact_application_key: createArtifactApplicationKey(manifestId, artifact),
          audio_available: audioAvailable,
          playback_status: playbackStatus,
        },
      }));
    }

    async function applyLatestLive2dArtifact(artifact, manifestId) {
      const body = artifact?.body;
      if (!body) return;
      const artifactKey = createArtifactApplicationKey(manifestId, artifact);
      if (artifactKey && lastAppliedArtifactManifestIds.live2d === artifactKey) {
        lastAppliedArtifacts.live2d = artifact;
        dispatchLive2dCueEvent({
          artifact,
          manifestId,
          cue: extractLive2dCueBody(body),
          motionStyle: document.body.dataset.live2dMotion || "none",
          expressionKey: document.body.dataset.live2dExpression || "none",
          autonomousState: document.body.dataset.live2dAutonomous || "none",
          applyStatus: "already_applied",
        });
        return;
      }
      markArtifactDatasetAvailable("live2d", artifact);
      document.body.dataset.live2dManifestId = safeCueLabel(manifestId || "");
      document.body.dataset.live2dRenderedAtMs = safeDatasetNumber(artifact.rendered_at_ms);
      document.body.dataset.live2dArtifactApplied = "applying";
      const cue = extractLive2dCueBody(body);
      const firstMotion = firstCueObject(cue?.motions);
      const firstExpression = firstCueObject(cue?.expressions);
      const motionStyle = safeCueLabel(
        cue?.motion?.style ||
        cue?.motion?.name ||
        cue?.motion?.id ||
        cue?.motion?.motion_id ||
        cue?.motion?.motionId ||
        cue?.motion?.motion_key ||
        cue?.motion?.motionKey ||
        cue?.motion?.motion_name ||
        cue?.motion?.motionName ||
        cue?.motion?.state_key ||
        cue?.motion?.stateKey ||
        firstMotion?.style ||
        firstMotion?.name ||
        firstMotion?.id ||
        firstMotion?.motion_id ||
        firstMotion?.motionId ||
        firstMotion?.motion_key ||
        firstMotion?.motionKey ||
        firstMotion?.motion_name ||
        firstMotion?.motionName ||
        firstMotion?.state_key ||
        firstMotion?.stateKey ||
        cue?.applied_motion ||
        cue?.motion_style ||
        cue?.motion_key ||
        cue?.motionKey ||
        cue?.motionId ||
        cue?.motion_id ||
        cue?.motionName ||
        cue?.motion_name ||
        cue?.state_key ||
        cue?.stateKey ||
        cue?.animation?.motion?.style ||
        cue?.animation?.motion?.name ||
        cue?.animation?.motion?.id ||
        cue?.animation?.motion?.motion_id ||
        cue?.animation?.motion?.motionId ||
        cue?.animation?.motion?.motion_key ||
        cue?.animation?.motion?.motionKey ||
        cue?.animation?.motion?.state_key ||
        cue?.animation?.motion?.stateKey ||
        cue?.animation?.motion?.motion_name ||
        cue?.animation?.motion?.motionName ||
        cue?.animation?.motion ||
        cue?.animation?.motion_id ||
        cue?.animation?.motionId ||
        cue?.animation?.motion_key ||
        cue?.animation?.motionKey ||
        cue?.animation?.motion_name ||
        cue?.animation?.motionName ||
        cue?.animation?.state_key ||
        cue?.animation?.stateKey ||
        cue?.animation?.pose ||
        cue?.animation?.state ||
        cue?.gesture ||
        cue?.pose ||
        cue?.state ||
        body?.motion_style ||
        body?.motion_key ||
        body?.motionKey ||
        body?.motion_id ||
        body?.motionId ||
        body?.motionName ||
        body?.motion_name ||
        body?.gesture ||
        body?.state_key ||
        body?.stateKey ||
        body?.pose ||
        body?.state ||
        ""
      );
      const expressionKey = safeCueLabel(
        cue?.expression?.expression_key ||
        cue?.expression?.profile_id ||
        cue?.expression?.id ||
        cue?.expression?.expression_id ||
        cue?.expression?.expressionId ||
        cue?.expression?.expression_key ||
        cue?.expression?.expressionKey ||
        cue?.expression?.state_key ||
        cue?.expression?.stateKey ||
        cue?.expression?.name ||
        firstExpression?.profile_id ||
        firstExpression?.profileId ||
        firstExpression?.id ||
        firstExpression?.expression_id ||
        firstExpression?.expressionId ||
        firstExpression?.expression_key ||
        firstExpression?.expressionKey ||
        firstExpression?.expression_name ||
        firstExpression?.expressionName ||
        firstExpression?.state_key ||
        firstExpression?.stateKey ||
        firstExpression?.name ||
        cue?.expression_key ||
        cue?.expressionKey ||
        cue?.expressionId ||
        cue?.expression_id ||
        cue?.expressionName ||
        cue?.expression_name ||
        cue?.state_expression_key ||
        cue?.stateExpressionKey ||
        cue?.animation?.expression?.expression_key ||
        cue?.animation?.expression?.profile_id ||
        cue?.animation?.expression?.id ||
        cue?.animation?.expression?.expression_id ||
        cue?.animation?.expression?.expressionId ||
        cue?.animation?.expression?.expressionKey ||
        cue?.animation?.expression?.state_key ||
        cue?.animation?.expression?.stateKey ||
        cue?.animation?.expression?.name ||
        cue?.animation?.expression?.expression_name ||
        cue?.animation?.expression?.expressionName ||
        cue?.animation?.expression ||
        cue?.animation?.expression_profile_id ||
        cue?.animation?.expressionProfileId ||
        cue?.animation?.expression_id ||
        cue?.animation?.expressionId ||
        cue?.animation?.expression_key ||
        cue?.animation?.expressionKey ||
        cue?.animation?.expression_name ||
        cue?.animation?.expressionName ||
        cue?.animation?.state_expression_key ||
        cue?.animation?.stateExpressionKey ||
        cue?.animation?.emotion ||
        cue?.emotion ||
        body?.expression_profile_id ||
        body?.expressionProfileId ||
        body?.expression_key ||
        body?.expressionKey ||
        body?.expression_id ||
        body?.expressionId ||
        body?.expressionName ||
        body?.expression_name ||
        body?.facial_expression ||
        body?.facialExpression ||
        body?.state_expression_key ||
        body?.stateExpressionKey ||
        body?.emotion ||
        ""
      );
      const autonomousState = safeCueLabel(
        cue?.autonomous?.state ||
        cue?.expression?.autonomous_state_id ||
        cue?.autonomous_state_id ||
        body?.autonomous_state_id ||
        ""
      );
      if (!motionStyle && !expressionKey && !autonomousState) {
        document.body.dataset.live2dMotion = "none";
        document.body.dataset.live2dExpression = "none";
        document.body.dataset.live2dAutonomous = "none";
        document.body.dataset.live2dArtifactApplied = "empty";
        document.body.dataset.live2dDurationMs = "";
        if (artifactKey) lastAppliedArtifactManifestIds.live2d = artifactKey;
        lastAppliedArtifacts.live2d = artifact;
        dispatchLive2dCueEvent({
          artifact,
          manifestId,
          cue,
          motionStyle,
          expressionKey,
          autonomousState,
          applyStatus: "empty",
        });
        return;
      }
      document.body.dataset.live2dMotion = motionStyle || "none";
      document.body.dataset.live2dExpression = expressionKey || "none";
      document.body.dataset.live2dAutonomous = autonomousState || "none";
      document.body.dataset.live2dArtifactApplied = "applied";
      if (artifactKey) lastAppliedArtifactManifestIds.live2d = artifactKey;
      lastAppliedArtifacts.live2d = artifact;
      dispatchLive2dCueEvent({
        artifact,
        manifestId,
        cue,
        motionStyle,
        expressionKey,
        autonomousState,
        applyStatus: "applied",
      });
    }

    function dispatchLive2dCueEvent({
      artifact,
      manifestId,
      cue,
      motionStyle,
      expressionKey,
      autonomousState,
      applyStatus,
    }) {
      window.dispatchEvent(new CustomEvent("iris-live2d-cue", {
        detail: {
          schema: "iris_overlay_live2d_cue_event_v1",
          manifest_id_present: manifestId !== "",
          manifest_id: safeCueLabel(manifestId || ""),
          event_id: safeCueLabel(artifact?.event_id || ""),
          artifact_kind: safeCueLabel(artifact?.artifact_kind || ""),
          content_type: safeHeaderValue(artifact?.content_type || ""),
          rendered_at_ms: artifact?.rendered_at_ms ?? null,
          content_length: artifact?.content_length ?? null,
          content_hash: safeHeaderValue(artifact?.content_hash || ""),
          artifact_application_key: createArtifactApplicationKey(manifestId, artifact),
          cue,
          motion_style: motionStyle,
          expression_key: expressionKey,
          autonomous_state: autonomousState,
          apply_status: applyStatus,
          renderer_cue_only: !hasApplicableLive2dCue(cue, artifact?.body),
        },
      }));
    }

    function firstCueObject(value) {
      if (value && typeof value === "object" && !Array.isArray(value)) return value;
      if (!Array.isArray(value)) return null;
      return value.find((item) => item && typeof item === "object" && !Array.isArray(item)) || null;
    }

    function live2dCueAliasObject(body) {
      if (!body || typeof body !== "object" || Array.isArray(body)) return null;
      const aliases = [
        "cue",
        "cue_json",
        "cueJson",
        "cueJSON",
        "cueURL",
        "live2d_cue",
        "live2dCue",
        "live2d_cue_json",
        "live2dCueJson",
        "live2dCueJSON",
        "live2dCueURL",
        "renderer_cue",
        "rendererCue",
        "renderer_cue_json",
        "rendererCueJson",
        "rendererCueJSON",
        "rendererCueURL",
        "animation_cue",
        "animationCue",
        "animation_cue_json",
        "animationCueJson",
        "animationCueJSON",
        "animationURL",
        "animationCueURL",
        "motion_cue",
        "motionCue",
        "motionURL",
        "expressionURL",
        "artifact",
        "artifact_url",
        "artifactUrl",
        "artifactURL",
        "file",
        "file_url",
        "fileUrl",
        "fileURL",
      ];
      for (const alias of aliases) {
        const aliasValue = parseLive2dCueAliasValue(body[alias]);
        if (aliasValue) return aliasValue;
      }
      return null;
    }

    function parseLive2dCueAliasValue(value) {
      if (value && typeof value === "object" && !Array.isArray(value)) return value;
      if (typeof value !== "string") return null;
      const text = value.trim();
      if (!text || (!text.startsWith("{") && !text.startsWith("["))) return null;
      try {
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === "object" ? parsed : null;
      } catch {
        return null;
      }
    }

    function extractLive2dCueBody(body) {
      if (!body || typeof body !== "object") return {};
      if (Array.isArray(body)) {
        return {
          motions: body
            .map((item) => (typeof item === "string" ? { motion_key: safeCueLabel(item) } : item))
            .filter((item) => item && typeof item === "object" && !Array.isArray(item)),
        };
      }
      const aliasBody = live2dCueAliasObject(body);
      if (aliasBody) return extractLive2dCueBody(aliasBody);
      if (body.animation && typeof body.animation === "object") return { animation: body.animation };
      if (body.output && typeof body.output === "object") {
        const outputAliasBody = live2dCueAliasObject(body.output);
        if (outputAliasBody) return extractLive2dCueBody(outputAliasBody);
        if (body.output.animation && typeof body.output.animation === "object") return { animation: body.output.animation };
        return body.output.cue && typeof body.output.cue === "object" ? extractLive2dCueBody(body.output.cue) : body.output;
      }
      if (body.result && typeof body.result === "object") {
        const resultAliasBody = live2dCueAliasObject(body.result);
        if (resultAliasBody) return extractLive2dCueBody(resultAliasBody);
        if (body.result.animation && typeof body.result.animation === "object") return { animation: body.result.animation };
        return body.result.cue && typeof body.result.cue === "object" ? extractLive2dCueBody(body.result.cue) : body.result;
      }
      if (body.data && typeof body.data === "object") {
        const dataAliasBody = live2dCueAliasObject(body.data);
        if (dataAliasBody) return extractLive2dCueBody(dataAliasBody);
        if (body.data.animation && typeof body.data.animation === "object") return { animation: body.data.animation };
        if (body.data.output && typeof body.data.output === "object") return extractLive2dCueBody(body.data.output);
        if (body.data.result && typeof body.data.result === "object") return extractLive2dCueBody(body.data.result);
      }
      if (body.payload && typeof body.payload === "object") return extractLive2dCueBody(body.payload);
      if (body.response && typeof body.response === "object") return extractLive2dCueBody(body.response);
      return body;
    }

    async function applyLatestSubtitleArtifact(artifact, manifestId) {
      const subtitleCue = extractFirstSubtitleCue(artifact?.text);
      const artifactKey = createArtifactApplicationKey(manifestId, artifact);
      if (artifactKey && lastAppliedArtifactManifestIds.subtitle === artifactKey) {
        lastAppliedArtifacts.subtitle = artifact;
        dispatchSubtitleArtifactEvent({
          artifact,
          manifestId,
          subtitleAvailable: subtitleCue.text !== "",
          displayStatus: "already_applied",
          subtitleText: subtitleCue.text,
          durationMs: subtitleCue.duration_ms,
        });
        return;
      }
      markArtifactDatasetAvailable("subtitle", artifact);
      document.body.dataset.subtitleManifestId = safeCueLabel(manifestId || "");
      document.body.dataset.subtitleRenderedAtMs = safeDatasetNumber(artifact.rendered_at_ms);
      document.body.dataset.subtitleArtifactApplied = "applying";
      if (!subtitleCue.text) {
        clearTimeout(hideTimer);
        text.textContent = "";
        bubble.classList.remove("visible");
        document.body.dataset.subtitleArtifactApplied = "empty";
        document.body.dataset.subtitleDurationMs = "";
        if (artifactKey) lastAppliedArtifactManifestIds.subtitle = artifactKey;
        lastAppliedArtifacts.subtitle = artifact;
        dispatchSubtitleArtifactEvent({
          artifact,
          manifestId,
          subtitleAvailable: false,
          displayStatus: "empty",
        });
        return;
      }
      text.textContent = subtitleCue.text;
      bubble.classList.add("visible");
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        bubble.classList.remove("visible");
        document.body.dataset.subtitleArtifactApplied = "hidden";
        dispatchSubtitleArtifactEvent({
          artifact,
          manifestId,
          subtitleAvailable: true,
          displayStatus: "hidden",
          subtitleText: subtitleCue.text,
          durationMs: subtitleCue.duration_ms,
        });
      }, subtitleCue.duration_ms);
      document.body.dataset.subtitleArtifactApplied = "applied";
      document.body.dataset.subtitleDurationMs = safeDatasetNumber(subtitleCue.duration_ms);
      if (artifactKey) lastAppliedArtifactManifestIds.subtitle = artifactKey;
      lastAppliedArtifacts.subtitle = artifact;
      dispatchSubtitleArtifactEvent({
        artifact,
        manifestId,
        subtitleAvailable: true,
        displayStatus: "applied",
        subtitleText: subtitleCue.text,
        durationMs: subtitleCue.duration_ms,
      });
    }

    function dispatchSubtitleArtifactEvent({
      artifact,
      manifestId,
      subtitleAvailable,
      displayStatus,
      subtitleText = "",
      durationMs = null,
    }) {
      window.dispatchEvent(new CustomEvent("iris-subtitle-artifact", {
        detail: {
          schema: "iris_overlay_subtitle_artifact_event_v1",
          manifest_id_present: manifestId !== "",
          manifest_id: safeCueLabel(manifestId || ""),
          event_id: safeCueLabel(artifact?.event_id || ""),
          artifact_kind: safeCueLabel(artifact?.artifact_kind || ""),
          content_type: safeHeaderValue(artifact?.content_type || ""),
          rendered_at_ms: artifact?.rendered_at_ms ?? null,
          content_length: artifact?.content_length ?? null,
          content_hash: safeHeaderValue(artifact?.content_hash || ""),
          artifact_application_key: createArtifactApplicationKey(manifestId, artifact),
          duration_ms: durationMs,
          subtitle_text: String(subtitleText || "").slice(0, 700),
          subtitle_available: subtitleAvailable,
          display_status: displayStatus,
        },
      }));
    }

    function createArtifactApplicationKey(manifestId, artifact) {
      if (!manifestId) return "";
      return [
        String(manifestId),
        safeCueLabel(artifact?.kind || ""),
        safeCueLabel(artifact?.artifact_kind || ""),
        safeHeaderValue(artifact?.content_type || ""),
        String(artifact?.rendered_at_ms ?? ""),
        String(artifact?.content_length ?? ""),
        safeHeaderValue(artifact?.content_hash || ""),
      ].join(":");
    }

    function createManifestRefreshKey(summary) {
      if (!summary) return "";
      const renderedAtByAdapter = summary.rendered_at_ms_by_adapter ?? {};
      const artifactByteHashByAdapter = summary.artifact_byte_hash_by_adapter ?? {};
      return String(summary.manifest_id || "") + ":" + [
        renderedAtByAdapter.tts ?? "",
        renderedAtByAdapter.live2d ?? "",
        renderedAtByAdapter.subtitle ?? "",
        safeHeaderValue(artifactByteHashByAdapter.tts || ""),
        safeHeaderValue(artifactByteHashByAdapter.live2d || ""),
        safeHeaderValue(artifactByteHashByAdapter.subtitle || ""),
      ].join(":");
    }

    function extractFirstSubtitleCue(value) {
      const parsed = parseSubtitleJson(value);
      if (parsed && typeof parsed === "object") {
        const firstCue = firstSubtitleJsonCue(parsed);
        if (firstCue) return firstCue;
        const textValue =
          parsed.caption ??
          parsed.caption_text ??
          parsed.captionText ??
          parsed.captionTEXT ??
          parsed.caption_body ??
          parsed.captionBody ??
          parsed.captionBODY ??
          parsed.subtitle ??
          parsed.subtitle_body ??
          parsed.subtitleBody ??
          parsed.subtitleBODY ??
          parsed.subtitle_text ??
          parsed.subtitleText ??
          parsed.subtitleTEXT ??
          parsed.text ??
          parsed.message ??
          parsed.body ??
          parsed.line ??
          parsed.content ??
          parsed.output_text ??
          parsed.outputText ??
          parsed.outputTEXT ??
          parsed.plain_text ??
          parsed.plainText ??
          parsed.plainTEXT ??
          parsed.transcript ??
          parsed.transcript_text ??
          parsed.transcriptText ??
          parsed.transcriptTEXT ??
          parsed.display_caption ??
          parsed.displayCaption ??
          parsed.display_text ??
          parsed.displayText ??
          parsed.displayTEXT ??
          parsed.vtt_text ??
          parsed.vttText ??
          parsed.vttTEXT ??
          parsed.srt_text ??
          parsed.srtText ??
          parsed.srtTEXT ??
          parsed.subtitle_vtt ??
          parsed.subtitleVtt ??
          parsed.subtitleVTT ??
          parsed.subtitle_srt ??
          parsed.subtitleSrt ??
          parsed.subtitleSRT ??
          parsed.caption_vtt ??
          parsed.captionVtt ??
          parsed.captionVTT ??
          parsed.caption_srt ??
          parsed.captionSrt ??
          parsed.captionSRT;
        if (isSubtitleTextScalar(textValue)) {
          const timedCue = extractFirstVttCue(textValue);
          if (timedCue.text) return timedCue;
          return {
            text: String(textValue).replace(/<[^>]+>/g, "").replace(/\\s+/g, " ").trim().slice(0, 700),
            duration_ms: safeSubtitleDurationMs(
              parsed.duration_ms ??
              parsed.durationMs ??
              parsed.display_duration_ms ??
              parsed.displayDurationMs ??
              parsed.duration_seconds ??
              parsed.durationSeconds ??
              parsed.display_duration_seconds ??
              parsed.displayDurationSeconds ??
              parsed.duration
            ),
          };
        }
      }
      return extractFirstVttCue(value);
    }

    function firstSubtitleJsonCue(parsed) {
      const nested =
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? parsed.data ??
            parsed.output ??
            parsed.result ??
            parsed.payload ??
            parsed.response ??
            parsed.artifact ??
            parsed.file ??
            parsed.subtitle ??
            parsed.caption ??
            parsed.transcript ??
            null
          : null;
      if (nested && typeof nested === "object") {
        const nestedCue = firstSubtitleJsonCue(nested);
        if (nestedCue) return nestedCue;
      }
      const cues = Array.isArray(parsed)
        ? parsed
        : parsed.cues ??
          parsed.segments ??
          parsed.utterances ??
          parsed.lines ??
          parsed.subtitle_lines ??
          parsed.subtitleLines ??
          parsed.caption_lines ??
          parsed.captionLines ??
          parsed.display_lines ??
          parsed.displayLines ??
          parsed.transcript_lines ??
          parsed.transcriptLines ??
          parsed.captions ??
          parsed.words ??
          parsed.tokens ??
          parsed.word_timings ??
          parsed.wordTimings ??
          parsed.token_timings ??
          parsed.tokenTimings ??
          parsed.items ??
          parsed.results ??
          [];
      if (!Array.isArray(cues) || cues.length === 0) return null;
      const cue = cues.find((item) => item && (typeof item === "object" || typeof item === "string")) ?? null;
      if (!cue) return null;
      if (typeof cue === "string") {
        return {
          text: cue.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 700),
          duration_ms: safeSubtitleDurationMs(null),
        };
      }
      const textValue =
        cue.caption ??
        cue.caption_text ??
        cue.captionText ??
        cue.captionTEXT ??
        cue.caption_body ??
        cue.captionBody ??
        cue.captionBODY ??
        cue.subtitle ??
        cue.subtitle_body ??
        cue.subtitleBody ??
        cue.subtitleBODY ??
        cue.subtitle_text ??
        cue.subtitleText ??
        cue.subtitleTEXT ??
        cue.text ??
        cue.message ??
        cue.body ??
        cue.line ??
        cue.content ??
        cue.output_text ??
        cue.outputText ??
        cue.outputTEXT ??
        cue.plain_text ??
        cue.plainText ??
        cue.plainTEXT ??
        cue.transcript ??
        cue.transcript_text ??
        cue.transcriptText ??
        cue.transcriptTEXT ??
        cue.display_caption ??
        cue.displayCaption ??
        cue.display_text ??
        cue.displayText ??
        cue.displayTEXT ??
        cue.vtt_text ??
        cue.vttText ??
        cue.vttTEXT ??
        cue.srt_text ??
        cue.srtText ??
        cue.srtTEXT ??
        cue.subtitle_vtt ??
        cue.subtitleVtt ??
        cue.subtitleVTT ??
        cue.subtitle_srt ??
        cue.subtitleSrt ??
        cue.subtitleSRT ??
        cue.caption_vtt ??
        cue.captionVtt ??
        cue.captionVTT ??
        cue.caption_srt ??
        cue.captionSrt ??
        cue.captionSRT ??
        cue.utterance ??
        cue.phrase ??
        cue.word;
      if (!isSubtitleTextScalar(textValue)) return null;
      const timedCue = extractFirstVttCue(textValue);
      if (timedCue.text) return timedCue;
      return {
        text: String(textValue).replace(/<[^>]+>/g, "").replace(/\\s+/g, " ").trim().slice(0, 700),
        duration_ms: safeSubtitleCueDurationMs(cue),
      };
    }

    function isSubtitleTextScalar(value) {
      return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
    }

    function parseSubtitleJson(value) {
      const text = String(value || "").trim();
      if (!text || (!text.startsWith("{") && !text.startsWith("["))) return null;
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    }

    function safeSubtitleDurationMs(value) {
      const number = Number(value);
      if (!Number.isFinite(number) || number <= 0) return 4200;
      return Math.max(1000, Math.min(14000, Math.trunc(number < 100 ? number * 1000 : number)));
    }

    function safeSubtitleCueDurationMs(cue) {
      const explicit =
        cue?.duration_ms ??
        cue?.durationMs ??
        cue?.duration_time_ms ??
        cue?.durationTimeMs ??
        cue?.display_duration_ms ??
        cue?.displayDurationMs ??
        cue?.length_ms ??
        cue?.lengthMs ??
        cue?.duration_seconds ??
        cue?.durationSeconds ??
        cue?.display_duration_seconds ??
        cue?.displayDurationSeconds ??
        cue?.length_seconds ??
        cue?.lengthSeconds ??
        cue?.duration ??
        cue?.length;
      if (explicit !== undefined && explicit !== null && explicit !== "") return safeSubtitleDurationMs(explicit);
      const start =
        cue?.start_ms ??
        cue?.startMs ??
        cue?.start_time_ms ??
        cue?.startTimeMs ??
        cue?.offset_ms ??
        cue?.offsetMs ??
        cue?.from_ms ??
        cue?.fromMs ??
        cue?.begin_ms ??
        cue?.beginMs ??
        cue?.begin_time_ms ??
        cue?.beginTimeMs ??
        cue?.time_ms ??
        cue?.timeMs ??
        cue?.timestamp_ms ??
        cue?.timestampMs ??
        cue?.start ??
        cue?.start_time ??
        cue?.startTime ??
        cue?.start_seconds ??
        cue?.startSeconds ??
        cue?.from ??
        cue?.offset ??
        cue?.begin ??
        cue?.begin_time ??
        cue?.beginTime ??
        cue?.time ??
        cue?.timestamp;
      const end =
        cue?.end_ms ??
        cue?.endMs ??
        cue?.end_time_ms ??
        cue?.endTimeMs ??
        cue?.to_ms ??
        cue?.toMs ??
        cue?.until_ms ??
        cue?.untilMs ??
        cue?.finish_ms ??
        cue?.finishMs ??
        cue?.finish_time_ms ??
        cue?.finishTimeMs ??
        cue?.stop_ms ??
        cue?.stopMs ??
        cue?.stop_time_ms ??
        cue?.stopTimeMs ??
        cue?.end ??
        cue?.end_time ??
        cue?.endTime ??
        cue?.end_seconds ??
        cue?.endSeconds ??
        cue?.to ??
        cue?.until ??
        cue?.finish ??
        cue?.finish_time ??
        cue?.finishTime ??
        cue?.stop ??
        cue?.stop_time ??
        cue?.stopTime;
      const startMs = safeSubtitleTimeMs(start);
      const endMs = safeSubtitleTimeMs(end);
      if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
        return Math.max(1000, Math.min(14000, endMs - startMs));
      }
      return safeSubtitleDurationMs(null);
    }

    function safeSubtitleTimeMs(value) {
      const parsedTimestamp = parseVttTimestampMs(value);
      if (Number.isFinite(parsedTimestamp) && parsedTimestamp >= 0) return parsedTimestamp;
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0) return NaN;
      return number < 100 ? Math.trunc(number * 1000) : Math.trunc(number);
    }

    function extractFirstVttCue(vttText) {
      const rawText = String(vttText || "").replace(/^\\uFEFF/, "").trim();
      const lines = String(vttText || "")
        .replace(/^\\uFEFF/, "")
        .split(/\\r?\\n/)
        .map((line) => line.trim());
      if (rawText && !rawText.includes("-->") && !rawText.startsWith("WEBVTT")) {
        return {
          text: rawText.replace(/<[^>]+>/g, "").replace(/\\s+/g, " ").slice(0, 700),
          duration_ms: 4200,
        };
      }
      const cueLines = [];
      let inCue = false;
      let durationMs = 4200;
      for (const line of lines) {
        if (!line || line === "WEBVTT" || line.startsWith("NOTE")) {
          if (inCue && cueLines.length > 0) break;
          continue;
        }
        if (line.includes("-->")) {
          durationMs = parseVttCueDurationMs(line);
          inCue = true;
          continue;
        }
        if (inCue) cueLines.push(line.replace(/<[^>]+>/g, ""));
      }
      return {
        text: cueLines.join(" ").replace(/\\s+/g, " ").trim().slice(0, 700),
        duration_ms: durationMs,
      };
    }

    function parseVttCueDurationMs(line) {
      const parts = String(line || "").split("-->");
      if (parts.length < 2) return 4200;
      const startMs = parseVttTimestampMs(parts[0]);
      const endMs = parseVttTimestampMs(parts[1]);
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        return 4200;
      }
      return Math.max(1000, Math.min(14000, endMs - startMs));
    }

    function parseVttTimestampMs(value) {
      const match = String(value || "").trim().match(/^(?:(\\d{2,}):)?(\\d{2}):(\\d{2})[.,](\\d{3})/);
      if (!match) return NaN;
      const hours = Number(match[1] || 0);
      const minutes = Number(match[2]);
      const seconds = Number(match[3]);
      const millis = Number(match[4]);
      return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;
    }

    function safeCueLabel(value) {
      const text = String(value || "")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .replace(/_+/g, "_")
        .slice(0, 80);
      return text || "";
    }

    function safeHeaderValue(value) {
      return String(value || "")
        .replace(/[\\r\\n]/g, "")
        .trim()
        .slice(0, 160);
    }

    function safeDatasetNumber(value) {
      const number = Number(value);
      return Number.isFinite(number) && number >= 0 ? String(Math.round(number)) : "";
    }

    function applyBridgeDatasetFromState(state) {
      applyAdapterBridgeDataset("tts", state?.last_tts_adapter_summary);
      applyAdapterBridgeDataset("live2d", state?.last_live2d_adapter_summary);
      applyAdapterBridgeDataset("subtitle", state?.last_subtitle_adapter_summary);
    }

    function applyAdapterBridgeDataset(kind, summary) {
      const artifactAvailable = isExpectedArtifactKind(kind, summary?.artifact_kind || "");
      document.body.dataset[kind + "BridgeStatus"] = safeCueLabel(summary?.bridge_status || "none");
      document.body.dataset[kind + "Artifact"] = artifactAvailable ? "available" : "missing";
      document.body.dataset[kind + "ArtifactKind"] = safeCueLabel(summary?.artifact_kind || "none");
      document.body.dataset[kind + "DurationMs"] = safeDatasetNumber(summary?.duration_ms);
      document.body.dataset[kind + "ManifestId"] = safeCueLabel(summary?.manifest_id || "");
      document.body.dataset[kind + "RenderedAtMs"] = safeDatasetNumber(summary?.rendered_at_ms);
      document.body.dataset[kind + "ArtifactContentType"] = safeHeaderValue(summary?.content_type || "");
      document.body.dataset[kind + "ArtifactLength"] = safeDatasetNumber(
        summary?.content_length ?? summary?.size_bytes
      );
      document.body.dataset[kind + "ArtifactHash"] = safeHeaderValue(
        summary?.byte_hash || summary?.content_hash || ""
      );
      document.body.dataset[kind + "ArtifactApplicationKey"] = createArtifactApplicationKey(
        summary?.manifest_id || "",
        {
          kind,
          artifact_kind: summary?.artifact_kind,
          content_type: summary?.content_type,
          rendered_at_ms: summary?.rendered_at_ms,
          content_length: summary?.content_length ?? summary?.size_bytes,
          content_hash: summary?.byte_hash || summary?.content_hash,
        }
      );
      bubble.classList.toggle(kind + "-artifact-ready", artifactAvailable);
    }

    function markArtifactDatasetAvailable(kind, artifact) {
      const artifactAvailable = isExpectedArtifactKind(kind, artifact?.artifact_kind || "");
      document.body.dataset[kind + "Artifact"] = artifactAvailable ? "available" : "missing";
      document.body.dataset[kind + "ArtifactKind"] = safeCueLabel(artifact?.artifact_kind || "none");
      document.body.dataset[kind + "ArtifactContentType"] = safeHeaderValue(
        artifact?.content_type || ""
      );
      document.body.dataset[kind + "ArtifactLength"] = safeDatasetNumber(artifact?.content_length);
      document.body.dataset[kind + "ArtifactHash"] = safeHeaderValue(artifact?.content_hash || "");
      document.body.dataset[kind + "ArtifactApplicationKey"] = createArtifactApplicationKey(
        artifact?.manifest_id || "",
        artifact
      );
      bubble.classList.toggle(kind + "-artifact-ready", artifactAvailable);
    }

    function safeLocalRoute(value, fallback) {
      const text = String(value || "").trim();
      if (!text || !text.startsWith("/") || text.startsWith("//")) return fallback;
      if (/[\\r\\n]/.test(text)) return fallback;
      try {
        const route = new URL(text, window.location.origin);
        if (route.origin !== window.location.origin) return fallback;
        return route.pathname + route.search;
      } catch {
        return fallback;
      }
    }

    function routeWithQueryParam(route, key, value) {
      try {
        const url = new URL(route, window.location.origin);
        if (url.origin !== window.location.origin) return route;
        url.searchParams.set(key, value);
        return url.pathname + url.search;
      } catch {
        const separator = String(route || "").includes("?") ? "&" : "?";
        return route + separator + encodeURIComponent(key) + "=" + encodeURIComponent(value);
      }
    }

    function connectOverlayEventStream() {
      if (!("EventSource" in window) || overlayEvents) return;
      overlayEvents = new EventSource(overlayRoutes.eventStream);
      overlayEvents.addEventListener("iris_overlay_display_event_v1", (message) => {
        try {
          renderOverlayDisplayEvent(JSON.parse(message.data), { fromEventStream: true });
        } catch {
          eventStreamActive = false;
        }
      });
      overlayEvents.onmessage = (message) => {
        try {
          renderOverlayDisplayEvent(JSON.parse(message.data), { fromEventStream: true });
        } catch {
          eventStreamActive = false;
        }
      };
      overlayEvents.onerror = () => {
        eventStreamActive = false;
        try {
          overlayEvents?.close();
        } catch {}
        overlayEvents = null;
        clearTimeout(eventStreamReconnectTimer);
        eventStreamReconnectTimer = setTimeout(connectOverlayEventStream, 1200);
      };
    }

    async function bootstrapOverlayEvent() {
      try {
        const response = await fetchNoStoreWithTimeout(overlayRoutes.eventBootstrap);
        if (!response.ok) return;
        const body = await response.json();
        renderOverlayDisplayEvent(body.overlay_event);
      } catch {
        eventStreamActive = false;
      }
    }

    async function tick() {
      if (eventStreamActive) {
        if (Date.now() - eventStreamLastMessageAtMs <= 5000) return;
        eventStreamActive = false;
      }
      try {
        const response = await fetchNoStoreWithTimeout(overlayRoutes.state);
        const state = await response.json();
        if (
          state.last_event_id &&
          state.last_event_id !== lastStateEventId
        ) {
          lastStateEventId = state.last_event_id;
          const subtitle = state.last_subtitle_cue;
          const subtitleText = subtitle?.subtitle_text || state.last_text || "";
          text.textContent = subtitleText;
          bubble.dir = subtitle?.script_direction || "ltr";
          bubble.classList.toggle("visible", subtitleText !== "");
          clearTimeout(hideTimer);
          if (subtitleText) {
            const plannedDuration =
              subtitle?.display_end_ms ??
              state.last_performance_plan?.total_duration_ms ??
              state.last_speech_cue?.estimated_duration_ms ??
              4200;
            const rhythmSilence = state.last_turn_rhythm?.response_timing_plan?.post_response_silence_ms ?? 900;
            const duration = Math.max(2200, Math.min(14000, plannedDuration));
            hideTimer = setTimeout(() => {
              bubble.classList.remove("visible");
            }, duration + rhythmSilence);
          }
          bubble.classList.toggle(
            "big-laugh",
            String(state.last_expression_profile?.expression_profile_id || "").includes("laugh") ||
            state.last_motion_cue?.motion_style === "laugh_big" ||
              state.last_body_continuity?.body_state_id === "body_burst_laugh_recovery"
          );
          bubble.classList.toggle(
            "focused-talk",
            state.last_expression_profile?.expression_profile_id === "expression_game_focus" ||
              state.last_expression_profile?.expression_profile_id === "expression_game_tension" ||
            state.last_motion_cue?.motion_style === "focused_talk" ||
              state.last_body_continuity?.body_state_id === "body_screen_focus_talk"
          );
          bubble.classList.toggle(
            "soft-motion",
            state.last_expression_profile?.expression_profile_id === "expression_steady_talk" ||
              state.last_expression_profile?.expression_profile_id === "expression_idle_breath" ||
            state.last_motion_cue?.motion_style === "talk" ||
              state.last_body_continuity?.body_state_id === "body_soft_talk"
          );
          const proximity = state.last_camera_proximity?.proximity_level || "neutral";
          bubble.classList.toggle("camera-micro", proximity === "micro");
          bubble.classList.toggle("camera-close", proximity === "close");
          bubble.classList.toggle("camera-face", proximity === "face_near");
          bubble.classList.toggle("camera-extreme", proximity === "extreme_closeup");
          const autonomousState = state.last_autonomous_expression?.autonomous_state_id || "quiet_presence";
          bubble.classList.toggle("autonomous-scream", autonomousState === "surprise_scream");
          bubble.classList.toggle("autonomous-dance", autonomousState === "happy_dance");
          bubble.classList.toggle("autonomous-hum", autonomousState === "happy_humming");
          bubble.classList.toggle("autonomous-sing", autonomousState === "happy_loud_sing");
          bubble.classList.toggle("subtitle-rtl", subtitle?.script_direction === "rtl");
          bubble.classList.toggle(
            "rate-fast",
            ["fast", "tongue_twister_fast"].includes(state.last_speech_rate_profile?.base_rate)
          );
          bubble.classList.toggle(
            "rate-repair",
            state.last_speech_rate_profile?.slow_speech_guard?.rate_repair_required === true
          );
          applyBridgeDatasetFromState(state);
          refreshLatestArtifacts();
        }
      } catch {
        clearTimeout(hideTimer);
        bubble.classList.remove("visible");
        bubble.classList.remove("big-laugh");
        bubble.classList.remove("focused-talk");
        bubble.classList.remove("soft-motion");
        bubble.classList.remove("camera-micro");
        bubble.classList.remove("camera-close");
        bubble.classList.remove("camera-face");
        bubble.classList.remove("camera-extreme");
        bubble.classList.remove("autonomous-scream");
        bubble.classList.remove("autonomous-dance");
        bubble.classList.remove("autonomous-hum");
        bubble.classList.remove("autonomous-sing");
        bubble.classList.remove("subtitle-rtl");
        bubble.classList.remove("rate-fast");
        bubble.classList.remove("rate-repair");
      }
    }

    connectOverlayEventStream();
    bootstrapOverlayEvent();
    tick();
    refreshLatestArtifacts();
    window.addEventListener("pageshow", () => {
      connectOverlayEventStream();
      bootstrapOverlayEvent();
      refreshLatestArtifacts();
    });
    window.addEventListener("focus", () => {
      connectOverlayEventStream();
      refreshLatestArtifacts();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      connectOverlayEventStream();
      refreshLatestArtifacts();
    });
    setInterval(tick, 650);
    setInterval(refreshLatestArtifacts, 1200);
  </script>
</body>
</html>`;
}
