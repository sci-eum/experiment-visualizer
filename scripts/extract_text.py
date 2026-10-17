#!/usr/bin/env python3
"""실험 문서에서 글자(와 그림 파일)를 꺼낸다. 표준 라이브러리만 쓴다.

지원: .hwp(한글 97 이후 바이너리) .hwpx .docx .pptx .pdf(pypdf/pdfplumber/PyMuPDF가 있을 때) .txt .md
이미지(.png .jpg 등)는 AI가 직접 보고 읽는다.

사용법:
    python extract_text.py 문서파일 [--out 결과.txt] [--images 그림폴더]
"""
import argparse
import io
import re
import struct
import sys
import zipfile
import zlib
import xml.etree.ElementTree as ET
from pathlib import Path

# ---------------------------------------------------------------- 공통

def local(tag):
    return tag.rsplit('}', 1)[-1] if isinstance(tag, str) else ''


def tidy(lines):
    out, blank = [], 0
    for ln in lines:
        ln = re.sub(r'[  ]+', ' ', ln).rstrip()
        if not ln.strip():
            blank += 1
            if blank > 1:
                continue
        else:
            blank = 0
        out.append(ln)
    return '\n'.join(out).strip() + '\n'


# ---------------------------------------------------------------- HWPX / DOCX / PPTX (XML 묶음)

def xml_text(path_in_zip, data, text_tag, para_tag, table_tag, row_tag, cell_tag, pic_tags=()):
    root = ET.fromstring(data)
    out = []

    def t_text(node):
        s = node.text or ''
        for sub in node:
            lt = local(sub.tag)
            if lt == 'tab':
                s += '\t'
            elif lt in ('lineBreak', 'br'):
                s += '\n'
            s += sub.tail or ''
        return s

    def table(tbl, dst):
        for tr in tbl:  # 바로 아래 행만 (칸 속 표는 walk 가 따로 처리)
            if local(tr.tag) != row_tag:
                continue
            cells = []
            for tc in tr:
                if local(tc.tag) != cell_tag:
                    continue
                cell_lines = []
                walk(tc, cell_lines)
                cells.append(' '.join(x.strip() for x in cell_lines if x.strip()))
            if cells:
                dst.append('| ' + ' | '.join(cells) + ' |')
        dst.append('')

    def para(p, dst):
        buf = []

        def flush():
            s = ''.join(buf).strip()
            if s:
                dst.append(s)
            buf.clear()

        def rec(n):
            for c in n:
                lt = local(c.tag)
                if lt == text_tag:
                    buf.append(t_text(c))
                elif lt == table_tag:
                    flush()
                    table(c, dst)
                elif lt in pic_tags:
                    buf.append(' [그림] ')
                elif lt == 'tab':
                    buf.append('\t')
                elif lt in ('lineBreak', 'br'):
                    buf.append('\n')
                else:
                    rec(c)
        rec(p)
        flush()

    def walk(node, dst):
        for c in node:
            lt = local(c.tag)
            if lt == para_tag:
                para(c, dst)
            elif lt == table_tag:
                table(c, dst)
            else:
                walk(c, dst)

    walk(root, out)
    return out


def num_key(name):
    m = re.findall(r'\d+', name)
    return int(m[-1]) if m else 0


def read_hwpx(path, img_dir):
    z = zipfile.ZipFile(path)
    names = z.namelist()
    secs = sorted([n for n in names if re.match(r'Contents/section\d+\.xml$', n, re.I)], key=num_key)
    lines = []
    for n in secs:
        lines += xml_text(n, z.read(n), 't', 'p', 'tbl', 'tr', 'tc', ('pic', 'container', 'ole'))
        lines.append('')
    if not any(x.strip() for x in lines) and 'Preview/PrvText.txt' in names:
        lines = z.read('Preview/PrvText.txt').decode('utf-8', 'replace').splitlines()
    save_zip_images(z, [n for n in names if n.startswith('BinData/')], img_dir)
    return lines


def read_docx(path, img_dir):
    z = zipfile.ZipFile(path)
    lines = xml_text('word/document.xml', z.read('word/document.xml'), 't', 'p', 'tbl', 'tr', 'tc', ('drawing', 'pict'))
    save_zip_images(z, [n for n in z.namelist() if n.startswith('word/media/')], img_dir)
    return lines


def read_pptx(path, img_dir):
    z = zipfile.ZipFile(path)
    slides = sorted([n for n in z.namelist() if re.match(r'ppt/slides/slide\d+\.xml$', n)], key=num_key)
    lines = []
    for i, n in enumerate(slides, 1):
        lines.append(f'--- 슬라이드 {i} ---')
        lines += xml_text(n, z.read(n), 't', 'p', 'tbl', 'tr', 'tc', ('pic',))
    save_zip_images(z, [n for n in z.namelist() if n.startswith('ppt/media/')], img_dir)
    return lines


def save_zip_images(z, names, img_dir):
    if not img_dir:
        return
    img_dir.mkdir(parents=True, exist_ok=True)
    for n in names:
        if re.search(r'\.(png|jpe?g|gif|bmp|webp|tiff?)$', n, re.I):
            (img_dir / Path(n).name).write_bytes(z.read(n))


# ---------------------------------------------------------------- HWP 5.x (OLE 복합 문서)

class CFB:
    """아주 작은 OLE(Compound File Binary) 읽기 도구."""
    END, FREE = 0xFFFFFFFE, 0xFFFFFFFF

    def __init__(self, data):
        if data[:8] != b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1':
            raise ValueError('HWP(OLE) 파일이 아닙니다.')
        self.d = data
        self.ss = 1 << struct.unpack_from('<H', data, 0x1E)[0]
        self.mss = 1 << struct.unpack_from('<H', data, 0x20)[0]
        nfat, dir_start = struct.unpack_from('<II', data, 0x2C)
        self.cutoff, mfat_start, nmfat, difat_start, ndifat = struct.unpack_from('<IIIII', data, 0x38)
        difat = list(struct.unpack_from('<109I', data, 0x4C))
        s, guard = difat_start, 0
        while s not in (self.END, self.FREE) and guard < ndifat + 1:
            ent = struct.unpack_from(f'<{self.ss // 4}I', data, self.off(s))
            difat += ent[:-1]
            s, guard = ent[-1], guard + 1
        self.fat = []
        for sec in difat[:nfat]:
            if sec in (self.END, self.FREE):
                continue
            self.fat += struct.unpack_from(f'<{self.ss // 4}I', data, self.off(sec))
        dir_data = self.chain(dir_start)
        self.entries = []
        for i in range(len(dir_data) // 128):
            e = dir_data[i * 128:(i + 1) * 128]
            nlen = struct.unpack_from('<H', e, 0x40)[0]
            name = e[:max(0, nlen - 2)].decode('utf-16-le', 'replace')
            typ = e[0x42]
            left, right, child = struct.unpack_from('<III', e, 0x44)
            start = struct.unpack_from('<I', e, 0x74)[0]
            size = struct.unpack_from('<Q', e, 0x78)[0]
            if self.ss == 512:
                size &= 0xFFFFFFFF
            self.entries.append(dict(name=name, type=typ, left=left, right=right, child=child, start=start, size=size))
        root = self.entries[0]
        self.ministream = self.chain(root['start'])[:root['size']] if root['size'] else b''
        self.minifat = []
        if nmfat and mfat_start != self.END:
            md = self.chain(mfat_start)
            self.minifat = list(struct.unpack_from(f'<{len(md) // 4}I', md, 0))
        self.paths = {}
        self._walk(root['child'], '')

    def off(self, sec):
        return (sec + 1) * self.ss

    def chain(self, start):
        out, s, seen = [], start, set()
        while s not in (self.END, self.FREE) and s < len(self.fat) and s not in seen:
            seen.add(s)
            o = self.off(s)
            out.append(self.d[o:o + self.ss])
            s = self.fat[s]
        return b''.join(out)

    def minichain(self, start, size):
        out, s, seen = [], start, set()
        while s not in (self.END, self.FREE) and s < len(self.minifat) and s not in seen:
            seen.add(s)
            o = s * self.mss
            out.append(self.ministream[o:o + self.mss])
            s = self.minifat[s]
        return b''.join(out)[:size]

    def _walk(self, idx, prefix):
        stack, seen = [(idx, prefix)], set()
        while stack:
            i, pre = stack.pop()
            if i == self.FREE or i >= len(self.entries) or i in seen:
                continue
            seen.add(i)
            e = self.entries[i]
            path = pre + e['name']
            if e['type'] in (1, 2):
                self.paths[path] = e
            stack.append((e['left'], pre))
            stack.append((e['right'], pre))
            if e['type'] == 1:
                stack.append((e['child'], path + '/'))

    def read(self, path):
        e = self.paths.get(path)
        if not e or e['type'] != 2:
            return None
        if e['size'] < self.cutoff:
            return self.minichain(e['start'], e['size'])
        return self.chain(e['start'])[:e['size']]


EXT_CTRL = {1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23}


def hwp_para_text(b):
    s, i, n = [], 0, len(b) // 2
    w = struct.unpack_from(f'<{n}H', b, 0)
    while i < n:
        c = w[i]
        if c < 32:
            if c in EXT_CTRL:
                if c == 9:
                    s.append('\t')
                i += 8
                continue
            if c == 10:
                s.append('\n')
            elif c in (24,):
                s.append('-')
            elif c in (30, 31):
                s.append(' ')
            i += 1
            continue
        if 0xD800 <= c < 0xDC00 and i + 1 < n:
            s.append(struct.pack('<HH', c, w[i + 1]).decode('utf-16-le', 'replace'))
            i += 2
            continue
        s.append(chr(c))
        i += 1
    return ''.join(s)


def read_hwp(path, img_dir):
    f = CFB(Path(path).read_bytes())
    head = f.read('FileHeader') or b''
    if not head.startswith(b'HWP Document File'):
        raise ValueError('HWP 5.x 문서가 아닙니다. (HWP 3.0 이하 옛 문서는 한글에서 다시 저장해 주세요)')
    flags = struct.unpack_from('<I', head, 36)[0]
    compressed, encrypted, distributed = flags & 1, flags & 2, flags & 4
    if encrypted:
        raise ValueError('암호가 걸린 문서입니다. 암호를 풀어 다시 저장하거나 PDF로 저장해 첨부해 주세요.')
    secs = sorted([p for p in f.paths if re.match(r'BodyText/Section\d+$', p)], key=num_key)
    lines = []
    if distributed or not secs:
        prv = f.read('PrvText')
        if prv:
            lines.append('[안내] 배포용(보호) 문서라 미리보기 글자만 읽었습니다. 전체 내용은 PDF로 저장해 첨부해 주세요.')
            lines += prv.decode('utf-16-le', 'replace').replace('\r', '').split('\n')
        return lines
    for p in secs:
        raw = f.read(p) or b''
        if compressed:
            try:
                raw = zlib.decompress(raw, -15)
            except zlib.error:
                raw = zlib.decompress(raw)
        pos = 0
        while pos + 4 <= len(raw):
            h = struct.unpack_from('<I', raw, pos)[0]
            tag, size = h & 0x3FF, (h >> 20) & 0xFFF
            pos += 4
            if size == 0xFFF:
                size = struct.unpack_from('<I', raw, pos)[0]
                pos += 4
            if tag == 67:  # HWPTAG_PARA_TEXT
                txt = hwp_para_text(raw[pos:pos + size]).strip()
                lines.append(txt)
            elif tag == 66:  # HWPTAG_PARA_HEADER: 글자 없는 빈 문단 자리
                pass
            pos += size
        lines.append('')
    if img_dir:
        img_dir.mkdir(parents=True, exist_ok=True)
        for p in f.paths:
            if p.startswith('BinData/') and re.search(r'\.(png|jpe?g|gif|bmp|wmf|emf)$', p, re.I):
                data = f.read(p) or b''
                try:
                    data = zlib.decompress(data, -15)
                except zlib.error:
                    pass
                (img_dir / Path(p).name).write_bytes(data)
    return lines


# ---------------------------------------------------------------- PDF

def read_pdf(path, img_dir):
    try:
        import pypdf  # noqa
        r = pypdf.PdfReader(str(path))
        out = []
        for i, pg in enumerate(r.pages, 1):
            out += [f'--- {i}쪽 ---', pg.extract_text() or '']
        return out
    except ImportError:
        pass
    try:
        import pdfplumber  # noqa
        with pdfplumber.open(str(path)) as pdf:
            out = []
            for i, pg in enumerate(pdf.pages, 1):
                out += [f'--- {i}쪽 ---', pg.extract_text() or '']
            return out
    except ImportError:
        pass
    try:
        import fitz  # noqa
        doc = fitz.open(str(path))
        return sum(([f'--- {i}쪽 ---', pg.get_text()] for i, pg in enumerate(doc, 1)), [])
    except ImportError:
        pass
    raise ValueError('PDF 글자를 꺼낼 라이브러리가 없습니다. PDF는 AI가 직접 읽게 하거나 "pip install pypdf" 후 다시 실행하세요.')


# ---------------------------------------------------------------- main

READERS = {'.hwpx': read_hwpx, '.hwp': read_hwp, '.docx': read_docx, '.pptx': read_pptx, '.pdf': read_pdf}


def extract(path, img_dir=None):
    path = Path(path)
    ext = path.suffix.lower()
    if ext in ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.heic'):
        raise ValueError('이미지 파일입니다. AI가 그림을 직접 보고 글자를 읽어야 합니다.')
    if ext in ('.txt', '.md', '.csv'):
        return path.read_text(encoding='utf-8', errors='replace')
    reader = READERS.get(ext)
    if reader is None:
        head = path.read_bytes()[:8]
        if head.startswith(b'PK'):
            reader = read_hwpx
        elif head.startswith(b'\xd0\xcf\x11\xe0'):
            reader = read_hwp
        elif head.startswith(b'%PDF'):
            reader = read_pdf
        else:
            raise ValueError(f'지원하지 않는 형식입니다: {ext}')
    return tidy(reader(path, Path(img_dir) if img_dir else None))


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding='utf-8')
        except Exception:
            pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('file')
    ap.add_argument('--out', help='글자를 저장할 파일 (없으면 화면에 출력)')
    ap.add_argument('--images', help='문서 속 그림을 꺼내 저장할 폴더')
    a = ap.parse_args()
    try:
        text = extract(a.file, a.images)
    except Exception as e:  # 사용자에게 쉬운 말로 알려 준다
        print(f'[읽기 실패] {e}', file=sys.stderr)
        return 1
    if a.out:
        Path(a.out).write_text(text, encoding='utf-8')
        print(f'저장: {a.out} ({len(text):,}자)')
    else:
        print(text)
    return 0


if __name__ == '__main__':
    sys.exit(main())
