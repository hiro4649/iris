export function showSubtitleInConsole(packet) {
  const subtitleText = packet.subtitle_text ?? "";
  return {
    displayed: false,
    subtitle_available: subtitleText !== "",
    reason: "console_adapter_no_display_target",
    adapter: "console_subtitle",
    packet_schema: packet.schema ?? null,
    adapter_kind: packet.adapter_kind ?? "subtitle",
    subtitle_language: packet.subtitle_language ?? null,
    script_direction: packet.script_direction ?? "ltr",
    display_end_ms: packet.display_end_ms ?? 0,
    line_count: packet.line_break_plan?.length ?? 0,
    readability_profile: packet.readability_profile ?? null,
    response_summary: {
      ok: false,
      response_kind: "omitted",
      response_omitted: true,
      error_kind: "console_adapter_no_display_target",
      bridge_status: "not_rendered",
      artifact_url: "",
      artifact_kind: "",
      duration_ms: null,
    },
  };
}

showSubtitleInConsole.adapterKind = "console_subtitle";
