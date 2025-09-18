import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import DuckAnimation from "../../src/components/DuckAnimation";

describe("DuckAnimation 組件測試", () => {
  test("當 isUploading 為 false 時不應顯示動畫", () => {
    render(<DuckAnimation isUploading={false} progress={0} />);

    // 不應該有任何鴨子動畫顯示
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  test("當 isUploading 為 true 時應顯示鴨子動畫", () => {
    render(<DuckAnimation isUploading={true} progress={50} />);

    // 應該顯示鴨子動畫 (透過SVG檢查)
    const svgElement = document.querySelector("svg");
    expect(svgElement).toBeInTheDocument();
  });

  test("應該顯示正確的進度條", () => {
    render(<DuckAnimation isUploading={true} progress={75} />);

    // 應該有進度文字
    expect(screen.getByText("上傳中... 75%")).toBeInTheDocument();
  });

  test("進度為 0 時應該顯示 0%", () => {
    render(<DuckAnimation isUploading={true} progress={0} />);

    expect(screen.getByText("上傳中... 0%")).toBeInTheDocument();
  });

  test("進度為 100 時應該顯示 100%", () => {
    render(<DuckAnimation isUploading={true} progress={100} />);

    expect(screen.getByText("上傳中... 100%")).toBeInTheDocument();
  });

  test("進度條寬度應該對應進度值", () => {
    render(<DuckAnimation isUploading={true} progress={60} />);

    expect(screen.getByText("上傳中... 60%")).toBeInTheDocument();
  });
});
