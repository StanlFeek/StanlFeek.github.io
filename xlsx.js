'use strict';
/*
 * 极简 .xlsx 读取器（零依赖，只读第一个工作表，返回二维字符串数组）
 * 说明：.xlsx 本质是 zip 包，内含 XML。这里仅解析标准结构：
 * [Content_Types].xml / xl/workbook.xml / xl/_rels/workbook.xml.rels /
 * xl/sharedStrings.xml / xl/worksheets/sheetN.xml
 */
const zlib = require('zlib');

function readZipEntries(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('不是有效的 xlsx 文件（未找到压缩包结构）');
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const list = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error('xlsx 压缩目录损坏');
    const method = buf.readUInt16LE(off + 10);
    const csize = buf.readUInt32LE(off + 20);
    const namelen = buf.readUInt16LE(off + 28);
    const extralen = buf.readUInt16LE(off + 30);
    const commentlen = buf.readUInt16LE(off + 32);
    const lho = buf.readUInt32LE(off + 42);
    const name = buf.slice(off + 46, off + 46 + namelen).toString('utf8');
    list.push({ name: name.replace(/\\/g, '/'), method, csize, lho });
    off += 46 + namelen + extralen + commentlen;
  }
  const find = (want) => list.find(e => {
    const n = e.name.replace(/^\/+/, '');
    const w = want.replace(/^\/+/, '');
    return n === w || n === 'xl/' + w || n.endsWith('/' + w);
  });
  function readEntry(want) {
    const e = find(want);
    if (!e) return null;
    if (buf.readUInt32LE(e.lho) !== 0x04034b50) throw new Error('xlsx 本地文件头损坏');
    const nlen = buf.readUInt16LE(e.lho + 26);
    const elen = buf.readUInt16LE(e.lho + 28);
    const start = e.lho + 30 + nlen + elen;
    const data = buf.slice(start, start + e.csize);
    if (e.method === 0) return data;
    if (e.method === 8) return zlib.inflateRawSync(data);
    throw new Error('不支持的 xlsx 压缩方式: ' + e.method);
  }
  return { readEntry };
}

function decodeXml(s) {
  return String(s == null ? '' : s)
    .replace(/&#x([0-9a-fA-F]+);/g, (m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
}

function sharedStrings(xml) {
  const out = [];
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
  let m;
  while ((m = siRe.exec(xml))) {
    let text = '';
    let t;
    while ((t = tRe.exec(m[1]))) text += decodeXml(t[1]);
    out.push(text);
  }
  return out;
}

function attr(s, name) {
  const re = new RegExp(name + '="([^"]*)"');
  const m = s.match(re);
  return m ? m[1] : '';
}

function parseSheet(sheetXml, shared) {
  const rows = [];
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  const cRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  const vRe = /<v>([\s\S]*?)<\/v>/;
  const isRe = /<is\b[^>]*>([\s\S]*?)<\/is>/;
  const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
  let rm;
  while ((rm = rowRe.exec(sheetXml))) {
    const cells = {};
    let cm;
    while ((cm = cRe.exec(rm[1]))) {
      const cAttrs = cm[1] || '';
      const inner = cm[2] || '';
      const ref = attr(cAttrs, 'r');
      const colMatch = ref.match(/^([A-Z]+)/);
      if (!colMatch) continue;
      const type = attr(cAttrs, 't');
      let val = '';
      if (type === 's') {
        const vm = inner.match(vRe);
        if (vm) val = shared[parseInt(vm[1], 10)] || '';
      } else if (type === 'inlineStr') {
        const im = inner.match(isRe);
        if (im) { let s = ''; let t; while ((t = tRe.exec(im[1]))) s += decodeXml(t[1]); val = s; }
      } else if (type === 'b') {
        const vm = inner.match(vRe);
        val = vm && vm[1] === '1' ? 'TRUE' : 'FALSE';
      } else {
        const vm = inner.match(vRe);
        if (vm) val = decodeXml(vm[1]);
      }
      cells[colToIndex(colMatch[1])] = val.trim();
    }
    if (Object.keys(cells).length) {
      const max = Math.max.apply(null, Object.keys(cells).map(Number));
      const row = [];
      for (let i = 0; i <= max; i++) row.push(cells[i] || '');
      rows.push(row);
    }
  }
  return rows;
}

function colToIndex(letters) {
  let n = 0;
  for (let i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
  return n - 1;
}

function xlsxToRows(buf) {
  const { readEntry } = readZipEntries(buf);
  const wbBuf = readEntry('xl/workbook.xml');
  const relsBuf = readEntry('xl/_rels/workbook.xml.rels');
  if (!wbBuf || !relsBuf) throw new Error('xlsx 缺少 workbook 结构，请确认是标准 xlsx 文件');
  const wb = wbBuf.toString('utf8');
  const rls = relsBuf.toString('utf8');
  const sheetRe = /<sheet\b[^>]*\br:id="([^"]+)"/;
  const sm = wb.match(sheetRe);
  const firstRid = sm ? sm[1] : '';
  let target = '';
  const relRe = /<Relationship\b[^>]*>/g;
  let r;
  while ((r = relRe.exec(rls))) {
    if (attr(r[0], 'Id') === firstRid) { target = attr(r[0], 'Target'); break; }
  }
  if (!target) {
    const fallback = wb.match(/<sheet\b[^>]*>/);
    if (fallback) {
      const relRe2 = /<Relationship\b[^>]*>/g;
      while ((r = relRe2.exec(rls))) if (/sheet/.test(attr(r[0], 'Target'))) { target = attr(r[0], 'Target'); break; }
    }
  }
  if (!target) throw new Error('xlsx 中未找到工作表');
  const sheetPath = target.replace(/^\//, '');
  const sheetBuf = readEntry(sheetPath);
  if (!sheetBuf) throw new Error('xlsx 工作表读取失败');
  let shared = [];
  const ssBuf = readEntry('xl/sharedStrings.xml');
  if (ssBuf) shared = sharedStrings(ssBuf.toString('utf8'));
  return parseSheet(sheetBuf.toString('utf8'), shared);
}
module.exports = { xlsxToRows };
