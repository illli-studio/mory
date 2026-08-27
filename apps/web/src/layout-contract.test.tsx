import { assertPrimaryLayoutOrder, primaryLayoutRegions } from "./layout-contract";

// This is intentionally dependency-free: the web package has no test runner yet.
// It still executes under any TypeScript-aware test runner and fails loudly if the
// agreed primary path is changed without updating the acceptance contract.
assertPrimaryLayoutOrder(primaryLayoutRegions);
