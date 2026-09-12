import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StickyBar } from "./sticky-bar";

/** The bar element itself (the only child the component renders). */
function bar(container: HTMLElement) {
  const el = container.firstElementChild;
  if (!(el instanceof HTMLElement))
    throw new Error("StickyBar rendered nothing");
  return el;
}

describe("StickyBar", () => {
  it("renders its children", () => {
    render(
      <StickyBar>
        <button type="button">Continuă</button>
      </StickyBar>,
    );
    expect(
      screen.getByRole("button", { name: "Continuă" }),
    ).toBeInTheDocument();
  });

  it("sticks to the bottom of the phone column above the content", () => {
    const { container } = render(<StickyBar>x</StickyBar>);
    expect(bar(container)).toHaveClass("sticky", "bottom-0", "z-20");
  });

  it("is a solid bar with a top hairline and the Screen gutter", () => {
    const { container } = render(<StickyBar>x</StickyBar>);
    // Opaque in both themes: the content scrolls underneath it.
    expect(bar(container)).toHaveClass("bg-background", "border-t", "px-5");
  });

  it("pads its bottom past the home indicator", () => {
    const { container } = render(<StickyBar>x</StickyBar>);
    expect(bar(container)).toHaveClass(
      "pb-[calc(14px+env(safe-area-inset-bottom))]",
    );
  });

  it("takes extra classes from the caller", () => {
    const { container } = render(<StickyBar className="gap-2">x</StickyBar>);
    expect(bar(container)).toHaveClass("gap-2", "sticky");
  });
});
