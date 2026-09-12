import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LanguageProvider } from "@/lib/i18n/provider";

import { Brand } from "./brand";

function renderBrand(ui: React.ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("Brand", () => {
  it("renders the logo artwork with the app name as its alt text", () => {
    renderBrand(<Brand />);
    const logo = screen.getByRole("img", { name: "AgroPlan" });
    expect(logo).toBeInTheDocument();
    expect(logo.getAttribute("src")).toContain("logo-600.png");
    // No Sprout glyph and no text wordmark any more.
    expect(screen.queryByText("AgroPlan")).not.toBeInTheDocument();
  });

  it("switches to the cream lockup on dark grounds", () => {
    renderBrand(<Brand variant="dark" />);
    expect(
      screen.getByRole("img", { name: "AgroPlan" }).getAttribute("src"),
    ).toContain("logo-dark-600.png");
  });

  it("still renders the tagline when asked", () => {
    renderBrand(<Brand showTagline />);
    expect(screen.getByTestId("brand")).toHaveTextContent(/culturile tale/i);
  });
});
