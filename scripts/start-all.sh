#!/bin/bash
# ComfyStudio + ComfyUI unified start script
# Starts ComfyUI backend and ComfyStudio frontend together

set -e

COMFYSTUDIO_PATH="$(cd "$(dirname "$0")/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting ComfyStudio + ComfyUI...${NC}"

# Check if comfy CLI is available
if ! command -v comfy &> /dev/null; then
    echo -e "${RED}Error: 'comfy' CLI not found${NC}"
    echo -e "${YELLOW}Install it with: pip install comfy-cli${NC}"
    exit 1
fi

cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    kill $COMFYUI_PID 2>/dev/null || true
    kill $COMFYSTUDIO_PID 2>/dev/null || true
    wait
    echo -e "${GREEN}Done${NC}"
}
trap cleanup EXIT

echo -e "${YELLOW}Starting ComfyUI backend...${NC}"
comfy launch -- --enable-cors-header &
COMFYUI_PID=$!

# Wait a moment for ComfyUI to start
sleep 3

# Check if ComfyUI is running
if ! kill -0 $COMFYUI_PID 2>/dev/null; then
    echo -e "${RED}Error: ComfyUI failed to start${NC}"
    exit 1
fi

echo -e "${GREEN}ComfyUI backend started (PID: $COMFYUI_PID)${NC}"

# Start ComfyStudio frontend
echo -e "${YELLOW}Starting ComfyStudio frontend...${NC}"
cd "$COMFYSTUDIO_PATH"
yarn dev &
COMFYSTUDIO_PID=$!

echo -e "${GREEN}ComfyStudio frontend started (PID: $COMFYSTUDIO_PID)${NC}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}ComfyStudio: http://localhost:3000${NC}"
echo -e "${GREEN}ComfyUI API: http://127.0.0.1:8188${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"

# Wait for either process to exit
wait $COMFYUI_PID $COMFYSTUDIO_PID
