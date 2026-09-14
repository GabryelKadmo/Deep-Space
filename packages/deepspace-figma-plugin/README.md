# DeepSpace Design Bridge

First-party development plugin for structural interoperability between Figma and
DeepSpace native design documents.

## Install locally

1. In Figma Desktop, open **Plugins > Development > Import plugin from manifest**.
2. Select this folder's `manifest.json`.
3. Open an DeepSpace native design and use **Design systems > Figma > Plugin bridge**.
4. Copy the workspace-scoped loopback connection code and paste it into the plugin.

The plugin rejects non-loopback DeepSpace URLs. The workspace token is stored in
Figma's local `clientStorage`; revoke it by recreating the workspace bridge token.
