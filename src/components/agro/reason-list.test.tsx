import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReasonList, type Reasons } from "./reason-list";

const reasons: Reasons = {
  soil: "Sol potrivit",
  window: "Fereastră largă",
  weather: "Prognoza îi priește",
};

const withCaution: Reasons = { ...reasons, caution: "Iernile aspre" };

/** The rendered rows, in DOM order (the icons contribute no text). */
function rows(container: HTMLElement) {
  const list = container.firstElementChild;
  return Array.from(list?.children ?? []).map((el) => el.textContent);
}

describe("ReasonList", () => {
  it("renders the three reasons in the fixed soil → window → weather order", () => {
    const { container } = render(<ReasonList reasons={reasons} />);
    expect(rows(container)).toEqual([
      "Sol potrivit",
      "Fereastră largă",
      "Prognoza îi priește",
    ]);
  });

  it("renders no fourth line when there is no caution", () => {
    const { container } = render(<ReasonList reasons={reasons} />);
    expect(rows(container)).toHaveLength(3);
    expect(container.querySelectorAll("svg")).toHaveLength(3);
  });

  it("renders the caution last when one is given", () => {
    const { container } = render(<ReasonList reasons={withCaution} />);
    expect(rows(container)).toEqual([
      "Sol potrivit",
      "Fereastră largă",
      "Prognoza îi priește",
      "Iernile aspre",
    ]);
    expect(screen.getByText("Iernile aspre")).toBeInTheDocument();
  });

  it("hides its icons from assistive tech", () => {
    const bare = render(<ReasonList reasons={reasons} />);
    expect(bare.container.querySelectorAll("svg")).toHaveLength(3);

    const { container } = render(<ReasonList reasons={withCaution} />);
    const svgs = Array.from(container.querySelectorAll("svg"));
    expect(svgs).toHaveLength(4);
    for (const svg of svgs) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("emits only spans and svgs, because it lives inside a <button>", () => {
    const { container } = render(<ReasonList reasons={withCaution} />);
    // Phrasing content only: a <div>/<p>/<ul> inside a button is invalid HTML.
    expect(
      container.querySelectorAll("div, p, ul, ol, li, h1, h2, h3, h4, h5, h6"),
    ).toHaveLength(0);
    const htmlTags = new Set(
      Array.from(container.querySelectorAll("*"))
        .filter((el) => el.namespaceURI === "http://www.w3.org/1999/xhtml")
        .map((el) => el.tagName.toLowerCase()),
    );
    expect([...htmlTags]).toEqual(["span"]);
  });
});
