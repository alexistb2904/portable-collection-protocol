import { defineConfig } from "vitepress";

export default defineConfig({
	title: "Portable Collection Protocol",
	description: "Signed collectible exports and live ownership authorization",
	cleanUrls: true,
	themeConfig: {
		nav: [
			{ text: "Guide", link: "/quick-start" },
			{ text: "Protocol", link: "/protocol" },
			{ text: "Security", link: "/security" },
			{ text: "AI Prompt", link: "/ai-integration-prompt" },
		],
		sidebar: [
			{
				text: "Getting started",
				items: [
					{ text: "Overview", link: "/" },
					{ text: "Quick Start", link: "/quick-start" },
					{ text: "Integration Guide", link: "/integration-guide" },
					{ text: "Framework Examples", link: "/framework-examples" },
					{ text: "Card Model", link: "/card-model" },
				],
			},
			{
				text: "Reference",
				items: [
					{ text: "Protocol", link: "/protocol" },
					{ text: "SDK Reference", link: "/sdk-reference" },
					{ text: "Conformance", link: "/conformance" },
					{ text: "Security", link: "/security" },
					{ text: "Deployment", link: "/deployment" },
					{ text: "Publishing", link: "/publishing" },
					{ text: "Versioning", link: "/versioning" },
				],
			},
			{
				text: "Partners",
				items: [
					{ text: "Partner Onboarding", link: "/partner-onboarding" },
					{ text: "AI Integration Prompt", link: "/ai-integration-prompt" },
					{ text: "Agent Framework Selection", link: "/agents/framework-selection" },
					{ text: "Node Agent Guide", link: "/agents/node-agent-guide" },
					{ text: "Python Agent Guide", link: "/agents/python-agent-guide" },
					{ text: "Troubleshooting", link: "/troubleshooting" },
					{ text: "FAQ", link: "/faq" },
				],
			},
		],
		socialLinks: [{ icon: "github", link: "https://github.com/alexistb2904" }],
		footer: {
			message: "Portable Collection Protocol reference implementation by WikiCard.",
			copyright: "Protocol documentation v1.0.0",
		},
		search: { provider: "local" },
	},
});
