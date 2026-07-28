export function parseExactCliOptions(argv, { usage, definitions }) {
  if (!Array.isArray(argv) || !Array.isArray(definitions) || argv.length !== definitions.length * 2) {
    throw new Error(usage);
  }
  const byFlag = new Map(definitions.map((definition) => [definition.flag, definition]));
  if (byFlag.size !== definitions.length) throw new Error("CLI option definitions must use unique flags");
  const observed = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    const definition = byFlag.get(flag);
    if (
      !definition
      || observed.has(flag)
      || typeof value !== "string"
      || value.length === 0
      || value.startsWith("--")
    ) {
      throw new Error(usage);
    }
    definition.validate?.(value);
    observed.set(flag, value);
  }
  if (definitions.some(({ flag }) => !observed.has(flag))) throw new Error(usage);
  return Object.fromEntries(definitions.map(({ flag, key }) => [key, observed.get(flag)]));
}
