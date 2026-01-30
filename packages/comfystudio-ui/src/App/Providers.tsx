import React from "react";

import { Environment } from "~/Environment";
import { Remote } from "~/Remote";
import { Router } from "~/Router";
import { ExecutionServiceProvider } from "~/execution/ui";

export function Providers({ children }: React.PropsWithChildren) {
  return (
    <Environment.Provider>
      <Router.Provider>
        <Remote.Provider>
          <ExecutionServiceProvider>
            {children}
          </ExecutionServiceProvider>
        </Remote.Provider>
      </Router.Provider>
    </Environment.Provider>
  );
}
