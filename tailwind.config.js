/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["src/component/**/*.svelte"],
	theme: {
		backgroundColor: {
			transparent: "transparent",
			current: "currentColor",
			primary: "var(--background-primary)",
			"primary-alt": "var(--background-primary-alt)",
			secondary: "var(--background-secondary)",
			"secondary-alt": "var(--background-secondary-alt)",
			error: "var(--background-modifier-error)",
			success: "var(--background-modifier-success)",
			"form-field": "var(--background-modifier-form-field)",
			hover: "var(--background-modifier-hover)",
			interactive: "var(--interactive-normal)",
			"interactive-hover": "var(--interactive-hover)",
			"interactive-accent": "var(--interactive-accent)",
			"interactive-accent-hover": "var(--interactive-accent-hover)",
		},
		extend: {
			colors: {
				accent: "var(--text-accent)",
				muted: "var(--text-muted)",
				faint: "var(--text-faint)",
				error: "var(--text-error)",
				"on-accent": "var(--text-on-accent)",
			},
			fontSize: {
				xs: ["var(--font-ui-smaller)", { lineHeight: "var(--line-height-tight)" }],
				sm: ["var(--font-ui-small)", { lineHeight: "var(--line-height-tight)" }],
				base: ["var(--font-ui-medium)", { lineHeight: "var(--line-height-normal)" }],
				lg: ["var(--font-ui-large)", { lineHeight: "var(--line-height-normal)" }],
			},
		},
	},

	//   https://tailwindcss.com/docs/configuration#core-plugins
	corePlugins: [
		"alignItems",
		"alignSelf",
		"backgroundColor",
		"borderRadius",
		"boxShadow",
		"cursor",
		"display",
		"flex",
		"flexBasis",
		"flexDirection",
		"flexGrow",
		"flexShrink",
		"flexWrap",
		"fontFamily",
		"fontSize",
		"fontWeight",
		"fontStyle",
		"gap",
		"gridTemplateColumns",
		"gridTemplateColumns",
		"gridAutoColumns",
		"gridAutoFlow",
		"gridAutoRows",
		"height",
		"inset", // top, right, bottom, left
		"justifyContent",
		"margin",
		"minHeight",
		"minWidth",
		"maxHeight",
		"maxWidth",
		"opacity",
		"padding",
		"position",
		"resize",
		"screens",
		"size",
		"space",
		"textAlign",
		"textColor",
		"textTransform",
		"userSelect",
		"visibility",
		"width",
	],
	plugins: [],
}
