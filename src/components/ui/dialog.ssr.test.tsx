import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "node:test";

import { Dialog, DialogContent, DialogTrigger } from "./dialog";

describe("dialog SSR safety", () => {
  it("renders the trigger during SSR without mounting the portal content on the server", () => {
    assert.doesNotThrow(() => {
      const html = renderToString(
        React.createElement(
          Dialog,
          null,
          React.createElement(
            DialogTrigger,
            { asChild: true },
            React.createElement("button", { type: "button" }, "Abrir"),
          ),
          React.createElement(DialogContent, null, "Conteúdo do modal"),
        ),
      );

      assert.match(html, /Abrir/);
      assert.doesNotMatch(html, /Conteúdo do modal/);
    });
  });
});
