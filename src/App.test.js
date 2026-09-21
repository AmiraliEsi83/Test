import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders HARSI landing", () => {
  render(<App />);
  expect(screen.getByText("HARSI")).toBeInTheDocument();
  expect(screen.getByText(/Trade the London/i)).toBeInTheDocument();
});
