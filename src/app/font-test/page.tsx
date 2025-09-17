export default function FontTest() {
  return (
    <div
      style={{
        padding: "2rem",
        minHeight: "100vh",
        background: "#111",
        color: "#fff",
      }}
    >
      <h1
        style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "1rem" }}
      >
        字型測試頁面
      </h1>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
        LINESeedTW 字型測試
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p style={{ fontSize: "1.125rem" }}>
          這是使用 LINESeedTW 字型的中文文字測試。
        </p>

        <p style={{ fontSize: "1.125rem" }}>
          English text with LINESeedTW font test.
        </p>

        <p style={{ fontSize: "1.125rem" }}>數字測試：1234567890</p>

        <p style={{ fontSize: "1.125rem" }}>
          標點符號測試：！？。，；：「」『』（）【】
        </p>

        <div style={{ fontSize: "0.875rem", color: "#999", marginTop: "2rem" }}>
          <p>如果你看到此文字使用了 LINESeedTW 字型，則表示字型載入成功。</p>
          <p>
            可以檢查瀏覽器開發者工具的 Network 標籤確認字型檔案是否成功載入。
          </p>
          <p>也可以在開發者工具的 Elements 標籤中檢查 font-family 屬性。</p>
        </div>

        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            border: "1px solid #333",
            borderRadius: "8px",
          }}
        >
          <h3 style={{ marginBottom: "0.5rem" }}>測試不同字重和樣式：</h3>
          <p style={{ fontWeight: "normal" }}>正常字重文字</p>
          <p style={{ fontWeight: "bold" }}>粗體文字（如果字型支援）</p>
          <p style={{ fontStyle: "italic" }}>斜體文字（如果字型支援）</p>
        </div>
      </div>
    </div>
  );
}
