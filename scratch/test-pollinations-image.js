const apiKey = "sk_3W0bDijmfLwhwIebWPPRKjpwkHegcMWe";
const url1 = `https://image.pollinations.ai/prompt/test_vintage_academic_cover_image?width=100&height=100&seed=123&nologo=true&key=${apiKey}`;
const url2 = `https://image.pollinations.ai/prompt/test_vintage_academic_cover_image?width=100&height=100&seed=123&model=flux&nologo=true&key=${apiKey}`;

console.log("Fetching url1 (default model):", url1);
const start1 = Date.now();
fetch(url1)
  .then((res) => {
    console.log("url1 Status:", res.status, "Time:", Date.now() - start1, "ms");
    return res.arrayBuffer();
  })
  .then((buf) => {
    console.log("url1 Byte length:", buf.byteLength);

    console.log("\nFetching url2 (flux model):", url2);
    const start2 = Date.now();
    return fetch(url2).then((res) => {
      console.log("url2 Status:", res.status, "Time:", Date.now() - start2, "ms");
      return res.arrayBuffer();
    });
  })
  .then((buf) => {
    console.log("url2 Byte length:", buf.byteLength);
  })
  .catch((err) => {
    console.error("Error:", err);
  });
