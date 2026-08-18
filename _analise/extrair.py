# -*- coding: utf-8 -*-
"""Extrai premio anual / mensal de todos os PDFs de ESTUDOS POR IDADE e compara com as planilhas."""
import glob, os, re, json, sys
import pdfplumber

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ESTUDOS POR IDADE')
BASE = os.path.normpath(BASE)

def num(s):
    s = s.strip().replace('R$', '').strip()
    s = s.replace('.', '').replace(',', '.')
    try:
        return float(s)
    except ValueError:
        return None

def idade_do_nome(path):
    m = re.search(r'(\d{1,3})\s*ANOS?', os.path.basename(path), re.I)
    return int(m.group(1)) if m else None

def parse_icatu(text):
    out = {}
    m = re.search(r'Morte com Vig[êe]ncia Vital[íi]cia \(cobertura b[áa]sica\)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)\s+(\d+)\s*Anos', text)
    if m:
        out['capital'] = num(m.group(1)); out['mensal'] = num(m.group(2))
        out['anual'] = num(m.group(3)); out['pgto_anos'] = int(m.group(4))
    m2 = re.search(r'IDADE:\s*(\d+)\s*anos', text)
    if m2: out['idade_pdf'] = int(m2.group(1))
    m3 = re.search(r'DATA DO ESTUDO:\s*([\d/]+)', text)
    if m3: out['data'] = m3.group(1)
    out['produto'] = 'Vida Horizonte'
    return out

def parse_mag(text):
    out = {}
    m = re.search(r'(WHOLE LIFE [^\n]*?)\s*\((\d+)\)\s*R\$\s*([\d\.,]+)\s*R\$\s*([\d\.,]+)', text)
    if m:
        out['produto'] = m.group(1).strip(); out['cod'] = m.group(2)
        out['capital'] = num(m.group(3)); out['anual'] = num(m.group(4))
    m2 = re.search(r'^\s*(\d+)\s*anos\s*$', text, re.M)
    if m2: out['idade_pdf'] = int(m2.group(1))
    m3 = re.search(r'Realizado em ([^\.\n]+)', text)
    if m3: out['data'] = m3.group(1).strip()
    m4 = re.search(r'Antecipa[çc][ãa]o de pagamento por tempo:\s*(\d+)\s*anos', text)
    if m4: out['pgto_anos'] = int(m4.group(1))
    m5 = re.search(r'Sexo biol[óo]gico\s*\n?\s*(Masculino|Feminino)', text)
    if m5: out['sexo_pdf'] = m5.group(1)
    return out

def parse_metlife(text):
    out = {}
    m = re.search(r'Morte\s+(Vital[íi]cio|\d+)\s+(\d+)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)', text)
    if m:
        out['cobertura'] = m.group(1); out['pgto_anos'] = int(m.group(2))
        out['capital'] = num(m.group(3)); out['mensal'] = num(m.group(4)); out['anual'] = num(m.group(5))
    m2 = re.search(r'IOF Total\s+([\d\.,]+)\s+([\d\.,]+)', text)
    if m2: out['iof_mensal'] = num(m2.group(1)); out['iof_anual'] = num(m2.group(2))
    m3 = re.search(r'Pr[êe]mio Total\s+([\d\.,]+)\s+([\d\.,]+)', text)
    if m3: out['total_mensal'] = num(m3.group(1)); out['total_anual'] = num(m3.group(2))
    m4 = re.search(r'Idade:\s*(\d+)', text)
    if m4: out['idade_pdf'] = int(m4.group(1))
    m5 = re.search(r'Sexo:\s*(\w+)', text)
    if m5: out['sexo_pdf'] = m5.group(1)
    m6 = re.search(r'Fumante:\s*(\w+)', text)
    if m6: out['fumante'] = m6.group(1)
    m7 = re.search(r'Data da simula[çc][ãa]o:\s*([\d/]+)', text)
    if m7: out['data'] = m7.group(1)
    m8 = re.search(r'Cota[çc][ãa]o de seguro de vida individual\s*\n\s*([^\n]+)\s*\n\s*Data da simula', text)
    if m8: out['produto'] = m8.group(1).strip()
    return out

def parse_prudential(text):
    out = {}
    m = re.search(r'TOTAL MENSAL:\s*R\$\s*([\d\.,]+)\s*\+\s*IOF\s*\(([\d\.,]+)%\)\s*=\s*R\$\s*([\d\.,]+)', text)
    if m:
        out['mensal'] = num(m.group(1)); out['iof_pct'] = m.group(2); out['mensal_c_iof'] = num(m.group(3))
    m1b = re.search(r'TOTAL POR ANO\s*=\s*R\$\s*([\d\.,]+)', text)
    if m1b: out['mensal_x12'] = num(m1b.group(1))
    m2 = re.search(r'TOTAL ANUAL:\s*R\$\s*([\d\.,]+)\s*\+\s*IOF\s*\([\d\.,]+%\)\s*=\s*R\$\s*([\d\.,]+)', text)
    if m2: out['anual'] = num(m2.group(1)); out['anual_c_iof'] = num(m2.group(2))
    m3 = re.search(r'Idade:\s*(\d+)\s*anos', text)
    if m3: out['idade_pdf'] = int(m3.group(1))
    m4 = re.search(r'Sexo:\s*(\w+)', text)
    if m4: out['sexo_pdf'] = m4.group(1)
    m5 = re.search(r'Cob\. B[áa]sica\s+([^\n]*?)\s+([\d\.,]+)\s+(\w+)\s+([\d\.,]+)', text)
    if m5:
        out['capital'] = num(m5.group(2)); out['classe'] = m5.group(3)
    m6 = re.search(r'Vida Inteira\s+Vida Inteira\s+(\d+)\s*anos', text)
    if m6: out['pgto_anos'] = int(m6.group(1))
    m7 = re.search(r'Data da impress[ãa]o:\s*([^\n]+?)\s*Data da', text)
    if m7: out['data'] = m7.group(1)
    out['produto'] = 'Vida Inteira'
    return out

PARSERS = {'ICATU': parse_icatu, 'MAG': parse_mag, 'METLIFE': parse_metlife, 'PRUDENTIAL': parse_prudential}

resultados = []
pdfs = sorted(glob.glob(os.path.join(BASE, '**', '*.pdf'), recursive=True))
for i, f in enumerate(pdfs):
    rel = os.path.relpath(f, BASE)
    partes = rel.split(os.sep)
    seguradora = partes[0]
    grupo = partes[1] if len(partes) > 2 else ''
    try:
        with pdfplumber.open(f) as pdf:
            nmax = 9 if seguradora == 'PRUDENTIAL' else 5
            texto = '\n'.join((p.extract_text() or '') for p in pdf.pages[:nmax])
        d = PARSERS[seguradora](texto)
    except Exception as e:
        d = {'erro': str(e)}
    d.update({'arquivo': rel, 'seguradora': seguradora, 'grupo': grupo,
              'idade_arquivo': idade_do_nome(f)})
    resultados.append(d)
    if (i + 1) % 100 == 0:
        print('processados', i + 1, file=sys.stderr)

with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'extraido.json'), 'w', encoding='utf-8') as fh:
    json.dump(resultados, fh, ensure_ascii=False, indent=1)
print('TOTAL', len(resultados))
