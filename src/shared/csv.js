export function parseCsv(csvText) {
  const normalizedCsvText = String(csvText ?? "").replace(/^\uFEFF/, "");
  const wrappedSpreadsheetRows = parseWrappedSpreadsheetCsvExport(normalizedCsvText);

  if (wrappedSpreadsheetRows) {
    return wrappedSpreadsheetRows;
  }

  const delimiter = detectCsvDelimiter(normalizedCsvText);
  return mapCsvRowsToRecords(parseDelimitedRows(normalizedCsvText, delimiter));
}

function parseDelimitedRows(csvText, delimiter) {
  const rows = [];
  const currentRow = [];
  let currentField = "";
  let insideQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === "\"") {
      if (insideQuotes && nextChar === "\"") {
        currentField += "\"";
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (char === delimiter && !insideQuotes) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentField);

      if (currentRow.some((value) => value !== "")) {
        rows.push([...currentRow]);
      }

      currentRow.length = 0;
      currentField = "";
      continue;
    }

    currentField += char;
  }

  currentRow.push(currentField);

  if (currentRow.some((value) => value !== "")) {
    rows.push([...currentRow]);
  }

  return rows;
}

function mapCsvRowsToRecords(rows) {

  const [headers = [], ...dataRows] = rows;

  return dataRows.map((values) => {
    const record = {};

    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });

    return record;
  });
}

export function serializeCsv(rows, headers = []) {
  const normalizedHeaders = headers.length > 0
    ? [...headers]
    : [...new Set(rows.flatMap((row) => Object.keys(row ?? {})))];

  const lines = [
    normalizedHeaders.map(escapeCsvField).join(","),
    ...rows.map((row) => normalizedHeaders.map((header) => escapeCsvField(row?.[header] ?? "")).join(","))
  ];

  return `${lines.join("\r\n")}\r\n`;
}

function detectCsvDelimiter(csvText) {
  const candidateDelimiters = [",", ";", "\t"];
  const sampleLines = String(csvText ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (sampleLines.length === 0) {
    return ",";
  }

  const delimiterScores = new Map(
    candidateDelimiters.map((delimiter) => [delimiter, 0])
  );

  for (const line of sampleLines) {
    const counts = countDelimitersOutsideQuotes(line, candidateDelimiters);

    for (const delimiter of candidateDelimiters) {
      delimiterScores.set(delimiter, (delimiterScores.get(delimiter) ?? 0) + (counts[delimiter] ?? 0));
    }
  }

  const [bestDelimiter = ",", bestScore = 0] = [...delimiterScores.entries()]
    .sort((left, right) => right[1] - left[1])[0] ?? [",", 0];

  return bestScore > 0 ? bestDelimiter : ",";
}

function parseWrappedSpreadsheetCsvExport(csvText) {
  const lines = String(csvText ?? "").split(/\r?\n/);
  const [headerLine = ""] = lines;

  if (!isWrappedSpreadsheetCsvHeader(headerLine)) {
    return null;
  }

  const headerScore = countWrappedSpreadsheetLineTokens(headerLine);
  const minimumStartScore = Math.max(3, Math.floor(headerScore * 0.6));
  const spreadsheetRows = lines.map((line) => parseDelimitedRows(line, ";")[0] ?? []);
  const groupedInnerRows = [];

  spreadsheetRows.forEach((spreadsheetRow, index) => {
    const innerCells = [...spreadsheetRow];

    while (innerCells.at(-1) === "") {
      innerCells.pop();
    }

    const innerLine = innerCells.join(";");
    const startsInnerRow = countWrappedSpreadsheetLineTokens(lines[index]) >= minimumStartScore;

    if (startsInnerRow || groupedInnerRows.length === 0) {
      groupedInnerRows.push(innerLine);
      return;
    }

    groupedInnerRows[groupedInnerRows.length - 1] += `\n${innerLine}`;
  });

  const reconstructedCsv = groupedInnerRows
    .map(restoreWrappedFirstFieldQuote)
    .join("\n");
  const rows = mapCsvRowsToRecords(parseDelimitedRows(reconstructedCsv, ","));

  return rows.length > 0 ? rows : null;
}

function isWrappedSpreadsheetCsvHeader(line) {
  const text = String(line ?? "");

  return /^"[^"\r\n]+,""[^"\r\n]+/.test(text)
    && /;+\s*$/.test(text)
    && countWrappedSpreadsheetLineTokens(text) >= 3;
}

function countWrappedSpreadsheetLineTokens(line) {
  return (String(line ?? "").match(/,""/g) || []).length;
}

function restoreWrappedFirstFieldQuote(value) {
  const restoredValue = String(value ?? "")
    .replace(/^([^",\n]+)"([^"\n]+)",/, "$1,\"$2\",")
    .replace(/^([^",\n]*),/, "\"$1\",");
  let insideQuotes = false;

  for (let index = 0; index < restoredValue.length; index += 1) {
    if (restoredValue[index] !== "\"") {
      continue;
    }

    if (insideQuotes && restoredValue[index + 1] === "\"") {
      index += 1;
    } else {
      insideQuotes = !insideQuotes;
    }
  }

  return insideQuotes ? `${restoredValue}\",\"\"` : restoredValue;
}

function countDelimitersOutsideQuotes(line, delimiters) {
  const counts = Object.fromEntries(delimiters.map((delimiter) => [delimiter, 0]));
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === "\"") {
      if (insideQuotes && nextChar === "\"") {
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (!insideQuotes && Object.hasOwn(counts, char)) {
      counts[char] += 1;
    }
  }

  return counts;
}

function escapeCsvField(value) {
  const text = String(value ?? "");

  if (/["\r\n,]/.test(text)) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }

  return text;
}
