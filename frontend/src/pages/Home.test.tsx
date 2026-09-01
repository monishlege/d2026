import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import Home from "@/pages/Home";
import { useAssistantStore } from "@/store/useAssistantStore";

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
  beforeEach(() => {
    useAssistantStore.setState({
      transcript: "",
      detectedIntent: null,
      chatResult: null,
      isProcessingVoice: false,
    });
  });

  it("renders the main hero and loads schemes", async () => {
    render(<Home />);

    expect(screen.getByText(/JanRakshak AI/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText(/PM-KISAN Samman Nidhi/i).length).toBeGreaterThan(0);
    });
  });

  it("shows the kiosk mode toggle and the listen-to-response action when guidance exists", () => {
    useAssistantStore.setState({
      transcript: "Check my eligibility",
      detectedIntent: "eligibility_check",
      chatResult: {
        answer: "You are eligible for PM-KISAN.",
        confidence: "high",
        references: ["PM-KISAN"],
      },
    });

    render(<Home />);

    const kioskToggle = screen.getByRole("button", { name: /kiosk|low-data mode/i });
    expect(kioskToggle).toBeInTheDocument();

    fireEvent.click(kioskToggle);
    expect(screen.getByText(/Kiosk mode enabled/i)).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /listen to response/i })).toBeInTheDocument();
  });
});
