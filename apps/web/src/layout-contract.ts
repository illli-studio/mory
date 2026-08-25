export const primaryLayoutRegions = ["capture-stage", "search-stage", "feed-stage", "utility-rail"] as const;

export function assertPrimaryLayoutOrder(actual: readonly string[]): void {
  const expected = [...primaryLayoutRegions];
  if (actual.length !== expected.length || actual.some((region, index) => region !== expected[index])) {
    throw new Error(`Expected ${expected.join(" → ")}, received ${actual.join(" → ")}`);
  }
}
