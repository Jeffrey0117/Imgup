import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import QRCode from "../../src/components/QRCode";

// Mock QRCode library
jest.mock("qrcode", () => ({
  toCanvas: jest.fn((canvas, text, options, callback) => {
    // Mock successful QR code generation
    if (callback) callback(null);
  }),
}));

describe("QRCode 組件測試", () => {
  test("應該正確渲染 QRCode 組件", () => {
    render(<QRCode value="https://example.com" size={120} />);

    // 應該有 canvas 元素
    const canvas = screen.getByRole("img");
    expect(canvas).toBeInTheDocument();
  });

  test("應該設定正確的 QR Code 尺寸", () => {
    render(<QRCode value="https://example.com" size={150} />);

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", expect.stringContaining("150x150"));
  });

  test("當沒有提供 size 時應該使用預設尺寸", () => {
    render(<QRCode value="https://example.com" />);

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", expect.stringContaining("150x150"));
  });

  test("應該有正確的 alt 文字", () => {
    render(<QRCode value="https://example.com" size={120} />);

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("alt", "QR Code");
  });

  test("當 value 變更時應該重新生成 QR Code", () => {
    const { rerender } = render(
      <QRCode value="https://example1.com" size={120} />
    );

    // 重新渲染不同的 value
    rerender(<QRCode value="https://example2.com" size={120} />);

    // 應該仍然顯示圖片
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      "src",
      expect.stringContaining("https%3A%2F%2Fexample2.com")
    );
  });
});
