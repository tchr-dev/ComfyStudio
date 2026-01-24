<div align="center" style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 1em; margin: 4em 0;">

<img src="./misc/Banner.png" />
<img src="./misc/GenerateScreenshot.png" style="width: 400px; max-width: 600px; flex-grow: 1;" />
<img src="./misc/EditScreenshot.png" style="width: 400px; max-width: 600px; flex-grow: 1;" />

<h3>👋 Welcome to ComfyStudio, a ComfyUI-focused fork of <a href="https://github.com/Stability-AI/StableStudio" target="_blank">StableStudio</a>!</h3>

**🗺 Contents – [🚀 Quick Start](#quick-start) · [ℹ️ About](#about) · [🙋 FAQ](#faq) · [🧑‍💻 Contributing](#contributing)**

**📚 Documentation – [🎨 UI](./packages/comfystudio-ui/README.md) · [🔌 Plugins](./packages/comfystudio-plugin/README.md) · <a href="https://github.com/comfyanonymous/ComfyUI" target="_blank">⚡️ ComfyUI</a>**

**🔗 Links – <a href="https://discord.com/channels/1002292111942635562/1108055793674227782" target="_blank">🎮 Discord</a> · <a href="https://dreamstudio.ai" target="_blank">🌈 DreamStudio</a> · <a href="https://github.com/Stability-AI/StableStudio/issues">🛟 Bugs & Support</a> · <a href="https://github.com/Stability-AI/StableStudio/discussions">💬 Discussion</a>**

<br />
<br />

</div>

# <a id="quick-start" href="#quick-start">🚀 Quick Start</a>

You'll need to have [Node.js](https://nodejs.org/en/) and [Yarn](https://yarnpkg.com/) installed. Then run the following commands to install dependencies and launch StableStudio.

```bash
git clone https://github.com/Stability-AI/StableStudio.git
```

```bash
cd StableStudio
```

```bash
yarn
```

```bash
# Starts both ComfyUI (if configured) and ComfyStudio
yarn start
```

_**That's it! 🎉**_

ComfyStudio will be running at [localhost:3000](http://localhost:3000) by default.

> Make sure your ComfyUI is installed and the `COMFYUI_PATH` environment variable is set if it's not in `~/srv/ComfyUI`.

# <a id="about" href="#about">About</a>

<div style="display: flex; justify-content: center; align-items: center; gap: 1em; margin: 0 0 2em 0;">
  <img src="./misc/PainterWithRobot.png" style="flex-grow: 1; flex-shrink: 1;" />
</div>

ComfyStudio is a fork of [StableStudio](https://github.com/Stability-AI/StableStudio) designed to be the best frontend for [ComfyUI](https://github.com/comfyanonymous/ComfyUI). It brings the polished user interface of DreamStudio to the powerful node-based backend of ComfyUI.

# <a id="faq" href="#faq">FAQ</a>

### What's the difference between ComfyStudio and StableStudio?

ComfyStudio is pre-configured to work with ComfyUI out of the box. It uses the `comfystudio-plugin-comfyui` by default and includes scripts to manage the local ComfyUI server.

- **Default Local Inference**: We prioritize local execution via ComfyUI.
- **Unified Startup**: One command to launch everything.
- **Rebranded**: To avoid confusion with the official Stability AI project.

### Will [DreamStudio](https://dreamstudio.ai) still be supported?

_Yes!_ Stability's hosted deployment of StableStudio will remain [DreamStudio](https://dreamstudio.ai). It will continue to get updates and stay up-to-date with StableStudio whenever possible.

# <a id="contributing" href="#contributing">🧑‍💻 Contributing</a>

<div style="display: flex; justify-content: center; align-items: center; gap: 1em; margin: 0 0 2em 0;">
  <img src="./misc/ProgrammingRobots.png" style="flex-grow: 1; flex-shrink: 1;" />
</div>

_**Community contributions are encouraged!**_

**The UI package's [README](./packages/comfystudio-ui/README.md) is a great place to start.** Bug fixes, documentation, general clean-up, new features, etc. are all welcome.

Here are some useful links...

- [Discussion](https://github.com/Stability-AI/StableStudio/discussions)
- [Open Issues](https://github.com/Stability-AI/StableStudio/issues)
- [Open Pull Requests](https://github.com/Stability-AI/StableStudio/pulls)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
