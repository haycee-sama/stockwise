// src/utils/chunk.js
// Splits an array into chunks of `size`. Used to prevent PostgREST
// URL-length overflow when passing large ID lists via `.in()`.
//
// PostgREST encodes `.in('column', [id1, id2, ...])` as a URL query
// parameter. When the ID list exceeds ~1000 UUIDs (each ~36 chars),
// the request URL can exceed the server's maximum URL length (typically
// 8KB–16KB), causing a silent failure or a 414 URI Too Long error.
//
// Solution: split the ID list into chunks, fetch each chunk separately,
// and merge the results. The chunk size of 500 is a safe default that
// stays well under typical URL-length limits even with long UUIDs.
//
// Usage:
//   const chunks = chunk(saleIds, 500);
//   const allItems = [];
//   for (const chunkIds of chunks) {
//     const { data, error } = await supabase.from('sw_sale_items')
//       .select('...').in('sale_id', chunkIds);
//     if (error) return { data: null, error: ... };
//     allItems.push(...(data ?? []));
//   }

export function chunk(arr, size = 500) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
