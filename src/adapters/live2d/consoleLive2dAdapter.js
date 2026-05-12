export function sendExpressionToConsole(packet) {
  const envelope = packet.canonical_envelope ?? packet;
  const payload = {
    adapter: "console_live2d",
    packet_schema: packet.schema ?? null,
    action_type: envelope.action_type,
    emotion: envelope.emotion,
    tone: envelope.tone,
    character_tag: envelope.character_tag,
    performance_cue: packet.performance_cue ?? envelope.performance_cue ?? null,
    motion_cue: packet.motion_cue ?? envelope.motion_cue ?? null,
    body_continuity: packet.body_continuity ?? envelope.body_continuity ?? null,
    camera_proximity: packet.camera_proximity ?? envelope.camera_proximity ?? null,
    performance_plan: packet.performance_plan ?? envelope.performance_plan ?? null,
    turn_rhythm: packet.turn_rhythm ?? envelope.turn_rhythm ?? null,
    affective_continuity: packet.affective_continuity ?? envelope.affective_continuity ?? null,
    personality_habit: packet.personality_habit ?? envelope.personality_habit ?? null,
    expression_profile: packet.expression_profile ?? envelope.expression_profile ?? null,
    autonomous_expression: packet.autonomous_expression ?? envelope.autonomous_expression ?? null,
  };
  return {
    ...payload,
    rendered: false,
    handoff_status: "console_adapter_no_render_target",
    response_summary: {
      ok: false,
      response_kind: "omitted",
      response_omitted: true,
      error_kind: "console_adapter_no_render_target",
      bridge_status: "not_rendered",
      artifact_url: "",
      artifact_kind: "",
      duration_ms: null,
    },
  };
}

sendExpressionToConsole.adapterKind = "console_live2d";
