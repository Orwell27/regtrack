/** Parse the original quoted, multiline, semicolon-separated government inventory. */
export function parseInventoryCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], value = "", quoted = false, endedQuote = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"') {
        if (input[i + 1] === '"') { value += '"'; i++; }
        else { quoted = false; endedQuote = true; }
      } else value += c;
    } else if (c === '"' && !value && !endedQuote) quoted = true;
    else if (c === ';') { row.push(value); value = ""; endedQuote = false; }
    else if (c === '\r' || c === '\n') {
      if (c === '\r' && input[i + 1] === '\n') i++;
      row.push(value); rows.push(row); row = []; value = ""; endedQuote = false;
    } else {
      if (endedQuote || c === '"') throw Error("Caracteres fuera de un campo entrecomillado");
      value += c;
    }
  }
  if (quoted) throw Error("Campo entrecomillado sin cerrar");
  if (value || row.length || endedQuote) { row.push(value); rows.push(row); }
  return rows;
}

export function readInventoryRecords(csv: string) {
  const rows = parseInventoryCsv(csv);
  const expectedHeader = ["Identificador del compromiso", "Origen", "Compromiso", "Línea estratégica", "Discurso de investidura (Sí/No)", "Iniciativas semestres anteriores", "Iniciativas semestre actual", "Tipo y fuente de verificación iniciativas semestre actual", "ODS", "COFOG", "Temas", "Principales preocupaciones de la ciudadanía", ""];
  if (JSON.stringify(rows[2]) !== JSON.stringify(expectedHeader)) throw Error("Cabecera del inventario no reconocida");
  const ids = new Set<string>();
  return rows.slice(3).flatMap((row, index) => {
    if (row.every(value => !value.trim())) return [];
    const id = row[0];
    if (!/^[1-9]\d*$/.test(id) || ids.has(id) || row.length !== rows[2].length || !row[1] || !row[2]) throw Error(`Registro inválido o duplicado: ${index + 1}`);
    ids.add(id);
    return [{
      id: `c-${id}`, officialId: id, text: row[2], origin: row[1], strategicLine: row[3],
      investitureFlag: row[4], previousInitiatives: row[5], currentInitiatives: row[6],
      verificationSources: row[7], ods: row[8], cofog: row[9], topics: row[10], citizenConcerns: row[11],
      logicalDataRecord: index + 1,
    }];
  });
}
