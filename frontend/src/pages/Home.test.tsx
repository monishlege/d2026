import { render, screen, waitFor } from "@testing-library/react";

import Home from "@/pages/Home";

vi.mock("@/utils/api", () => ({
  fetchSchemes: vi.fn().mockResolvedValue({
    schemes: [
      {
        name: "PM-KISAN",
        description: "Farmer income support",
        benefit_summary: "Rs. 6000 annual support",
      },
    ],
  }),
  submitSpeech: vi.fn(),
  askChat: vi.fn(),
  checkEligibility: vi.fn(),
  fetchDigiLocker: vi.fn(),
  scanUrl: vi.fn(),
}));

describe("Home", () => {
  it("renders the main hero and loads schemes", async () => {
    render(<Home />);

    expect(screen.getByText(/JanSahayak AI/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/PM-KISAN/i)).toBeInTheDocument();
    });
  });
});
