import * as StableStudio from "@comfystudio/plugin";

import { Dropdown } from "./Dropdown";

export * from "./Samplers";

export type Sampler = StableStudio.StableDiffusionSampler[];

export declare namespace Sampler {
  export { Dropdown };
}

export namespace Sampler {
  Sampler.Dropdown = Dropdown;
}
