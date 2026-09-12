import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LanguageProvider } from "@/lib/i18n/provider";

import { Brand } from "./brand";

function renderBrand(props: Parameters<typeof Brand>[0] = {}) {
  return render(
    <LanguageProvider>
      <Brand {...props} />
    </LanguageProvider>,
  );
}

describe("Brand", () => {
  it("renders the inline AgroPlan mark", () => {
    const { container } = renderBrand();
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // Decorative: the wordmark next to it already names the app.
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("splits the wordmark, colouring the 'Plan' half amber", () => {
    renderBrand();
    expect(screen.getByText("Agro")).toBeInTheDocument();
    expect(screen.getByText("Plan")).toHaveClass("text-brand-amber");
  });

  it("passes iconClassName through to the mark", () => {
    const { container } = renderBrand({ iconClassName: "size-7" });
    expect(container.querySelector("svg")).toHaveClass("size-7");
  });
});
