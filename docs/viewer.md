---
layout: page
title: Export Viewer
description: Inspect a Portable Collection Protocol export without uploading it anywhere.
---

<div class="viewer-page-heading">
  <span>STATIC PROTOCOL DEMO</span>
  <h1>Export Viewer</h1>
  <p>
    Inspect the issuer, subject, proof metadata and cards contained in a portable collection export.
    Open a local JSON file to preview it entirely in your browser.
  </p>
</div>

<ExportViewerFrame />

<style>
.viewer-page-heading {
  max-width: 900px;
  margin: 28px auto 0;
  padding: 0 24px;
}

.viewer-page-heading > span {
  color: var(--vp-c-brand-1);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .12em;
}

.viewer-page-heading h1 {
  margin: 8px 0 0;
  font-size: clamp(34px, 5vw, 58px);
  line-height: 1;
  letter-spacing: -.04em;
}

.viewer-page-heading p {
  max-width: 760px;
  margin: 18px 0 0;
  color: var(--vp-c-text-2);
  line-height: 1.65;
}

.VPPage .VPContent {
  padding-bottom: 0;
}

.VPPage .container {
  max-width: 1548px !important;
}
</style>
