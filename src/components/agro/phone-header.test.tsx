import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LanguageProvider } from "@/lib/i18n/provider";

import { PhoneHeader } from "./phone-header";

function renderHeader(ui: React.ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("PhoneHeader", () => {
  it("sticks to the top of the phone column on an opaque background", () => {
    renderHeader(<PhoneHeader />);
    const header = screen.getByRole("banner");
    expect(header).toHaveClass("sticky", "top-0", "z-20", "bg-background");
  });

  it("keeps its bottom hairline", () => {
    renderHeader(<PhoneHeader />);
    expect(screen.getByRole("banner")).toHaveClass("border-b");
  });

  it("still renders the title and the step dots", () => {
    renderHeader(<PhoneHeader title="Planul tău" step="rezumat" />);
    expect(screen.getByText("Planul tău")).toBeInTheDocument();
    expect(screen.getByRole("banner")).toHaveClass("sticky");
  });
});
