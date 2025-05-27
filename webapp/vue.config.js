const { execSync } = require("node:child_process")
const { EnvironmentPlugin } = require("webpack")

function git(command) {
	return execSync(`git ${command}`, { encoding: "utf8" }).trim()
}
process.env.VUE_APP_BUILD_TIMESTAMP = new Date().toISOString()
process.env.VUE_APP_GIT_VERSION = git("describe --always")
process.env.VUE_APP_GIT_AUTHOR_DATE = git("log -1 --format=%aI")

module.exports = {
	configureWebpack: {
		plugins: [
			new EnvironmentPlugin({
				VUE_APP_BUILD_TIMESTAMP: new Date().toISOString(),
				VUE_APP_GIT_VERSION: git("describe --always"),
				VUE_APP_GIT_AUTHOR_DATE: git("log -1 --format=%aI"),
			}),
		],
	},
	chainWebpack: (config) => {
		config.plugin("html").tap((args) => {
			args[0].title = process.env.NODE_ENV === "production" ? "Veganflora" : `Veganflora - ${process.env.NODE_ENV}`
			return args
		})
	},
}
