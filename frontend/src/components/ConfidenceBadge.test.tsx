import { render, screen } from "@testing-library/react";

import ConfidenceBadge from "@/components/ConfidenceBadge";

describe("ConfidenceBadge", () => {
  it("shows escalate guidance for low confidence", () => {
    render(<ConfidenceBadge confidence="low" />);

    expect(screen.getByLabelText(/confidence low/i)).toBeInTheDocument();
    expect(screen.getByText(/escalate to human officer/i)).toBeInTheDocument();
  });

  it("shows auto guidance for high confidence", () => {
    render(<ConfidenceBadge confidence="high" />);

    expect(screen.getByText(/auto/i)).toBeInTheDocument();
  });
});
