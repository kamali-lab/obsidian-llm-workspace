import esbuild from "esbuild"
import process from "process"
import builtins from "builtin-modules"
import esbuildSvelte from "esbuild-svelte"
import sveltePreprocess from "svelte-preprocess"
import fs from 'node:fs'
import tailwindcss from "tailwindcss"

const banner = `/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/
`

const prod = process.argv[2] === "production"

const commonOptions = {
	plugins: [
		esbuildSvelte({
			compilerOptions: { css: "injected" },
			preprocess: sveltePreprocess({
				postcss: {
					plugins: [
						tailwindcss,
					],
				}
			}),
		}),
	],
	banner: {
		js: banner,
	},
	conditions: ["svelte"], // because of svelte-markdown
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: [
		"node:https",
		"node:stream",
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtins,
	],
	format: "cjs",
	target: "esnext",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	outfile: "main.js",
	minify: prod,
	metafile: true,
}

if (prod) {
	let result = await esbuild.build(commonOptions)
	fs.mkdirSync('out', { recursive: true })
	fs.writeFileSync('out/meta.json', JSON.stringify(result.metafile))
	process.exit(0)
} else {
	const ctx = await esbuild.context(commonOptions)
	await ctx.watch()
}
