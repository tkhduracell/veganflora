export default {
	preset: "ts-jest/presets/default-esm",
	testEnvironment: "node",
	// Suites share one emulator collection and clear it between tests, so parallel
	// workers race each other. Run serially.
	maxWorkers: 1,
	extensionsToTreatAsEsm: [".ts"],
	moduleNameMapper: {
		"^(\\.{1,2}/.*)\\.js$": "$1",
	},
	transform: {
		"^.+\\.tsx?$": ["ts-jest", { useESM: true }],
	},
}
