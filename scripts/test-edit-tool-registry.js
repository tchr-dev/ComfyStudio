const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

require("tsx/cjs");

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request.startsWith("~/")) {
    const resolved = path.join(
      __dirname,
      "..",
      "packages",
      "comfystudio-ui",
      "src",
      request.slice(2)
    );
    return originalResolveFilename.call(this, resolved, parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const { EditTool } = require("../packages/comfystudio-ui/src/Editor/EditTool");

const tools = EditTool.getEnabled();
assert.ok(Array.isArray(tools));
assert.ok(tools.some((tool) => tool.id === "remove-bg"));
assert.ok(tools.some((tool) => tool.id === "replace-bg"));

console.log("ok");
