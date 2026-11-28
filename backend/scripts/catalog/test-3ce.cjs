async function test() {
  const query = 'Son Kem 3CE Hazy Lip Clay review';
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
    },
  });
  console.log('Status:', res.status);
  const html = await res.text();
  const m2 = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1]);
  console.log('m2 videoIds:', m2.slice(0, 5));
}
test();
