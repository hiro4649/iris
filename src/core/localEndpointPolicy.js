const LOCAL_ENDPOINT_OK_SCOPES = new Set(["loopback", "private_network"]);

export function summarizeLocalEndpointScope(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return {
      endpoint_scope: "not_configured",
      local_endpoint_allowed: false,
    };
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return {
      endpoint_scope: "invalid",
      local_endpoint_allowed: false,
    };
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return {
      endpoint_scope: "invalid",
      local_endpoint_allowed: false,
    };
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const endpointScope = classifyEndpointHostScope(hostname);
  return {
    endpoint_scope: endpointScope,
    local_endpoint_allowed: LOCAL_ENDPOINT_OK_SCOPES.has(endpointScope),
  };
}

export function summarizeLocalEndpointPolicyStatus(scopeSummary) {
  if (!scopeSummary || scopeSummary.endpoint_scope === "not_configured") {
    return "not_configured";
  }
  if (scopeSummary.local_endpoint_allowed === true) return "all_allowed";
  return "blocked";
}

function classifyEndpointHostScope(hostname) {
  if (!hostname) return "invalid";
  if (
    hostname === "localhost" ||
    hostname === "host.docker.internal" ||
    hostname.endsWith(".localhost") ||
    hostname === "::1" ||
    hostname === "0:0:0:0:0:0:0:1" ||
    hostname.startsWith("127.")
  ) {
    return "loopback";
  }
  const ipv4 = parseIpv4(hostname);
  if (ipv4) {
    const [a, b] = ipv4;
    if (a === 10) return "private_network";
    if (a === 172 && b >= 16 && b <= 31) return "private_network";
    if (a === 192 && b === 168) return "private_network";
    if (a === 169 && b === 254) return "private_network";
    return "external";
  }
  if (
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".lan")
  ) {
    return "private_network";
  }
  return "external";
}

function parseIpv4(hostname) {
  const parts = hostname.split(".");
  if (parts.length !== 4) return null;
  const numbers = parts.map((part) => Number(part));
  if (
    numbers.some(
      (number, index) =>
        !Number.isInteger(number) ||
        number < 0 ||
        number > 255 ||
        String(number) !== parts[index]
    )
  ) {
    return null;
  }
  return numbers;
}
