<div align="center">

# ComfyUI Plugin

**[ComfyUI](https://github.com/comfyanonymous/ComfyUI) Plugin for ComfyStudio**

**[Top-Level README](../../README.md)**

</div>

## About

This plugin connects ComfyStudio to a local [ComfyUI](https://github.com/comfyanonymous/ComfyUI) installation, enabling image generation using ComfyUI's powerful node-based workflow system.

## Features

- Text-to-image generation
- Image-to-image generation  
- Inpainting with masks
- Dynamic model selection (loads available checkpoints from ComfyUI)
- Dynamic sampler selection
- Real-time generation progress via WebSocket
- Configurable ComfyUI server URL

## Setup

### 1. Start ComfyUI with CORS enabled

ComfyUI needs to allow cross-origin requests from ComfyStudio.

```bash
cd ~/srv/ComfyUI
python main.py --enable-cors-header
```

Or add `--enable-cors-header=*` for any origin.

### 2. Start ComfyStudio with ComfyUI plugin

```bash
yarn dev:use-comfyui-plugin
```

### 3. Configure the plugin

1. Open ComfyStudio at [http://localhost:3000](http://localhost:3000)
2. Go to Settings
3. Set the ComfyUI URL (default: `http://127.0.0.1:8188`)
4. The status should show "Connected" when ready

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| ComfyUI URL | `http://127.0.0.1:8188` | URL of your ComfyUI server |
| Default Model | (auto-detected) | Default checkpoint model |
| Default Sampler | `euler` | Default sampler for generation |

## Architecture

The plugin uses a direct TypeScript client to communicate with ComfyUI:

- **REST API**: Queue workflows, fetch history, retrieve images
- **WebSocket**: Real-time progress updates during generation
- **Workflow Builder**: Constructs ComfyUI workflow graphs from ComfyStudio inputs

### Workflow Types

| Type | ComfyUI Nodes Used |
|------|-------------------|
| txt2img | CheckpointLoader, CLIPTextEncode, EmptyLatentImage, KSampler, VAEDecode, SaveImage |
| img2img | + LoadImage, ImageScale, VAEEncode, RepeatLatentBatch |
| inpainting | + ImageToMask, InvertMask, VAEEncodeForInpaint |

## Troubleshooting

### "Not connected to ComfyUI"

1. Ensure ComfyUI is running with `--enable-cors-header`
2. Check the ComfyUI URL in settings matches your server
3. Verify no firewall is blocking port 8188

### Images not generating

1. Check ComfyUI console for errors
2. Ensure you have at least one checkpoint model in `ComfyUI/models/checkpoints/`
3. Try a simple prompt first to verify connection

### Model/Sampler not appearing

The plugin fetches available options from ComfyUI's `/object_info` endpoint. Restart ComfyStudio after adding new models.
