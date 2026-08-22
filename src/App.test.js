import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("./components/Particle", () => () => null);
window.scrollTo = jest.fn();

test("renders home introduction", () => {
  render(<App />);
  expect(screen.getAllByText(/Amir Ali Eslami/i).length).toBeGreaterThan(0);
});
