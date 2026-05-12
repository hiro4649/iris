export function speakToConsole(packet) {
  const text = packet.final_text ?? packet.text ?? "";
  if (!text) {
    return { spoken: false, reason: "empty_final_text" };
  }
  const payload = {
    adapter: "console_tts",
    packet_schema: packet.schema ?? null,
    text,
    status: packet.status ?? packet.final_normalized_status,
    performance_cue: packet.performance_cue ?? null,
    speech_cue: packet.speech_cue ?? null,
    performance_plan: packet.performance_plan ?? null,
    turn_rhythm: packet.turn_rhythm ?? null,
    affective_continuity: packet.affective_continuity ?? null,
    personality_habit: packet.personality_habit ?? null,
    expression_profile: packet.expression_profile ?? null,
    autonomous_expression: packet.autonomous_expression ?? null,
    speech_rate_profile: packet.speech_rate_profile ?? null,
    language_profile: packet.language_profile ?? null,
    subtitle_cue: packet.subtitle_cue ?? null,
    tongue_twister_mode: packet.tongue_twister_mode ?? null,
  };
  return {
    spoken: false,
    reason: "console_adapter_no_audio_target",
    payload,
    response_summary: {
      ok: false,
      response_kind: "omitted",
      response_omitted: true,
      error_kind: "console_adapter_no_audio_target",
      bridge_status: "not_rendered",
      artifact_url: "",
      artifact_kind: "",
      duration_ms: null,
    },
  };
}

speakToConsole.adapterKind = "console_tts";
