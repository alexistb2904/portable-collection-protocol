import DefaultTheme from "vitepress/theme";
import ExportViewerFrame from "./ExportViewerFrame.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("ExportViewerFrame", ExportViewerFrame);
  },
};
