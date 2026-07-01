const title = 'Test Title';
const promptText = '"' + title + '", vintage academic book cover, cream parchment texture background, elegant serif typography';
const prompt = encodeURIComponent(promptText);
const url = `https://image.pollinations.ai/prompt/${prompt}?width=400&height=560&seed=12345&model=flux&nologo=true`;
console.log('URL:', url);
fetch(url, {method: 'HEAD'}).then(r => console.log(r.status, r.statusText)).catch(console.error);
