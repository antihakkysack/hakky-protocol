const SPECIAL_USE_DOMAIN_SUFFIXES = Object.freeze([
  "alt",
  "arpa",
  "example",
  "example.com",
  "example.net",
  "example.org",
  "invalid",
  "local",
  "localhost",
  "onion",
  "test",
]);

const SPECIAL_USE_IPV4_CIDRS = Object.freeze([
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.31.196.0", 24],
  ["192.52.193.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["192.175.48.0", 24],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
]);

const SPECIAL_USE_IPV6_CIDRS = Object.freeze([
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["2620:4f:8000::", 48],
  ["3ffe::", 16],
  ["3fff::", 20],
]);

function parseIpv4(hostname) {
  const octets = hostname.split(".");
  if (octets.length !== 4 || octets.some((octet) => !/^\d{1,3}$/u.test(octet))) return null;
  const values = octets.map(Number);
  if (values.some((octet) => octet > 255)) return null;
  return values.reduce((value, octet) => value * 256 + octet, 0);
}

function ipv4InCidr(address, network, prefixLength) {
  const blockSize = 2 ** (32 - prefixLength);
  return Math.floor(address / blockSize) === Math.floor(network / blockSize);
}

function parseIpv6(hostname) {
  const address = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
  if (!address || address.includes("%") || address.includes(".")) return null;
  const halves = address.split("::");
  if (halves.length > 2) return null;
  const parseHalf = (half) => half ? half.split(":") : [];
  const left = parseHalf(halves[0]);
  const right = parseHalf(halves[1] ?? "");
  if ([...left, ...right].some((part) => !/^[0-9a-f]{1,4}$/iu.test(part))) return null;
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return null;
  const groups = [...left, ...Array.from({ length: missing }, () => "0"), ...right];
  return groups.reduce((value, group) => (value << 16n) + BigInt(`0x${group}`), 0n);
}

function ipv6InCidr(address, network, prefixLength) {
  const shift = 128n - BigInt(prefixLength);
  return address >> shift === network >> shift;
}

function hasSpecialUseDomainSuffix(hostname) {
  return SPECIAL_USE_DOMAIN_SUFFIXES.some((suffix) => (
    hostname === suffix || hostname.endsWith(`.${suffix}`)
  ));
}

function isValidPublicDomainName(hostname) {
  if (hostname.length > 253 || !hostname.includes(".") || hasSpecialUseDomainSuffix(hostname)) return false;
  return hostname.split(".").every((label) => (
    label.length <= 63
    && /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/iu.test(label)
  ));
}

export function isPublicHostname(hostname) {
  if (typeof hostname !== "string" || !hostname || hostname.endsWith(".")) return false;
  const host = hostname.toLowerCase();
  if (host.startsWith("[") || host.includes(":")) {
    const address = parseIpv6(host);
    if (address === null) return false;
    const globalUnicast = parseIpv6("2000::");
    if (!ipv6InCidr(address, globalUnicast, 3)) return false;
    return !SPECIAL_USE_IPV6_CIDRS.some(([network, prefixLength]) => (
      ipv6InCidr(address, parseIpv6(network), prefixLength)
    ));
  }
  const ipv4 = parseIpv4(host);
  if (ipv4 !== null) {
    return !SPECIAL_USE_IPV4_CIDRS.some(([network, prefixLength]) => (
      ipv4InCidr(ipv4, parseIpv4(network), prefixLength)
    ));
  }
  return isValidPublicDomainName(host);
}
