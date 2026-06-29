globalThis.fetch = async (url, options = {}) => {
  const mode = process.env.QA_DRIVE_MODE || 'empty';
  if (String(url).startsWith('https://www.googleapis.com/drive/v3/files')) {
    if (mode === 'error') {
      return new Response(JSON.stringify({ error: { message: 'QA forced Drive failure' } }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ files: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  throw new Error(`Unexpected external fetch in QA fixture: ${url}`);
};
