const MAX_FORMULA_LENGTH = 200;
const MAX_DICE_PER_TERM = 100;
const MAX_TOTAL_DICE = 500;
const MAX_DIE_SIDES = 1000;

export class DiceFormulaError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "DiceFormulaError";
    this.code = code;
  }
}

export function rollDiceFormula(formula, { random = Math.random, hitDiceMode = false, rollMode = "" } = {}) {
  const source = String(formula ?? "").trim();
  if (!source) throw new DiceFormulaError("empty", "Formula is empty.");
  if (source.length > MAX_FORMULA_LENGTH) throw new DiceFormulaError("too-long", "Formula is too long.");

  const tokens = tokenize(source);
  const normalizedRollMode = rollMode === "advantage" || rollMode === "disadvantage" ? rollMode : "";
  const diceTokens = tokens.filter((token) => token.type === "dice");
  if (normalizedRollMode && (diceTokens.length !== 1 || diceTokens[0].count !== 1)) {
    throw new DiceFormulaError("roll-mode-single-die", "Advantage and disadvantage require exactly one die.");
  }
  const groups = [];
  let totalDice = 0;
  let position = 0;

  const peek = () => tokens[position] ?? null;
  const consume = (type) => {
    const token = peek();
    if (!token || token.type !== type) {
      throw new DiceFormulaError("syntax", `Expected ${type}.`);
    }
    position += 1;
    return token;
  };

  const parsePrimary = () => {
    const token = peek();
    if (!token) throw new DiceFormulaError("syntax", "Formula ended unexpectedly.");

    if (token.type === "number") {
      position += 1;
      return token.value;
    }

    if (token.type === "dice") {
      position += 1;
      if (token.count > MAX_DICE_PER_TERM) {
        throw new DiceFormulaError("too-many-dice", `Maximum ${MAX_DICE_PER_TERM} dice per term.`);
      }
      if (token.sides < 2 || token.sides > MAX_DIE_SIDES) {
        throw new DiceFormulaError("invalid-sides", `Die sides must be between 2 and ${MAX_DIE_SIDES}.`);
      }
      totalDice += token.count;
      if (totalDice > MAX_TOTAL_DICE) {
        throw new DiceFormulaError("too-many-dice", `Maximum ${MAX_TOTAL_DICE} dice per formula.`);
      }

      const minimum = Math.floor(token.sides / 2) + 1;
      const rawRolls = Array.from({ length: normalizedRollMode ? 2 : token.count }, () => {
        const sample = Number(random());
        const safeSample = Number.isFinite(sample) ? Math.max(0, Math.min(0.9999999999999999, sample)) : 0;
        return Math.floor(safeSample * token.sides) + 1;
      });
      const rolls = hitDiceMode
        ? rawRolls.map((value) => Math.max(value, minimum))
        : rawRolls;
      const keptRollIndex = normalizedRollMode
        ? rawRolls.reduce((bestIndex, value, index) => {
            const bestValue = rawRolls[bestIndex];
            return normalizedRollMode === "advantage"
              ? (value > bestValue ? index : bestIndex)
              : (value < bestValue ? index : bestIndex);
          }, 0)
        : null;
      const subtotal = keptRollIndex === null
        ? rolls.reduce((sum, value) => sum + value, 0)
        : rolls[keptRollIndex];
      groups.push({
        id: `dice-group-${groups.length + 1}`,
        notation: `${token.count}d${token.sides}`,
        count: token.count,
        sides: token.sides,
        rawRolls,
        rolls,
        subtotal,
        hitDiceMode: Boolean(hitDiceMode),
        minimum: hitDiceMode ? minimum : null,
        rollMode: normalizedRollMode,
        keptRollIndex
      });
      return subtotal;
    }

    if (token.type === "(") {
      position += 1;
      const value = parseExpression();
      consume(")");
      return value;
    }

    throw new DiceFormulaError("syntax", `Unexpected token ${token.raw}.`);
  };

  const parseUnary = () => {
    const token = peek();
    if (token?.type === "+" || token?.type === "-") {
      position += 1;
      const value = parseUnary();
      return token.type === "-" ? -value : value;
    }
    return parsePrimary();
  };

  const parseTerm = () => {
    let value = parseUnary();
    while (peek()?.type === "*" || peek()?.type === "/") {
      const operator = tokens[position++].type;
      const right = parseUnary();
      if (operator === "/" && right === 0) throw new DiceFormulaError("division-zero", "Division by zero.");
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  };

  const parseExpression = () => {
    let value = parseTerm();
    while (peek()?.type === "+" || peek()?.type === "-") {
      const operator = tokens[position++].type;
      const right = parseTerm();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };

  const calculatedTotal = parseExpression();
  if (position !== tokens.length) throw new DiceFormulaError("syntax", `Unexpected token ${peek()?.raw || ""}.`);
  if (!Number.isFinite(calculatedTotal)) throw new DiceFormulaError("invalid-result", "Formula result is not finite.");

  const d20Group = diceTokens.length === 1 && diceTokens[0].count === 1 && diceTokens[0].sides === 20
    ? groups[0]
    : null;
  const selectedRollIndex = d20Group?.keptRollIndex ?? 0;
  const naturalD20 = Number(d20Group?.rawRolls?.[selectedRollIndex]);
  const criticalOutcome = naturalD20 === 20 ? "critical" : naturalD20 === 1 ? "fumble" : "";
  if (criticalOutcome && d20Group) {
    d20Group.rolls[selectedRollIndex] = naturalD20;
    d20Group.subtotal = naturalD20;
  }
  const total = criticalOutcome ? naturalD20 : calculatedTotal;

  return {
    formula: source,
    normalizedFormula: tokens.map((token) => token.normalized).join(""),
    total,
    groups,
    hitDiceMode: Boolean(hitDiceMode && groups.length > 0),
    rollMode: groups.length > 0 ? normalizedRollMode : "",
    criticalOutcome
  };
}

export function isValidDiceFormula(formula) {
  try {
    rollDiceFormula(formula, { random: () => 0 });
    return true;
  } catch {
    return false;
  }
}

export function findDiceFormulaMatches(text) {
  const source = String(text ?? "");
  const candidatePattern = /(?:\(\s*)?(?:\d*d\d+|\d+)(?:\s*[+\-*/]\s*(?:\d*d\d+|\d+))*(?:\s*\))?/gi;
  const matches = [];

  for (const match of source.matchAll(candidatePattern)) {
    const formula = match[0];
    const start = match.index ?? 0;
    const end = start + formula.length;
    const before = source[start - 1] ?? "";
    const after = source[end] ?? "";
    if (!/[dD]/.test(formula) || /[\w]/.test(before) || /[\w]/.test(after) || !isValidDiceFormula(formula)) continue;
    matches.push({ formula, start, end });
  }

  return matches;
}

export function findDiceModifierMatches(text) {
  const source = String(text ?? "");
  const matches = [];
  const candidatePattern = /[+\-]\d+/g;

  for (const match of source.matchAll(candidatePattern)) {
    const modifier = match[0];
    const start = match.index ?? 0;
    const end = start + modifier.length;
    const before = source[start - 1] ?? "";
    const after = source[end] ?? "";
    if (/[\w)]/.test(before) || /[\w(]/.test(after)) continue;
    matches.push({
      formula: `d20${modifier}`,
      label: modifier,
      start,
      end
    });
  }

  return matches;
}

function tokenize(source) {
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    const remaining = source.slice(index);
    const whitespace = remaining.match(/^\s+/);
    if (whitespace) {
      index += whitespace[0].length;
      continue;
    }

    const dice = remaining.match(/^(\d*)[dD](\d+)/);
    if (dice) {
      const count = dice[1] ? Number(dice[1]) : 1;
      const sides = Number(dice[2]);
      if (!Number.isSafeInteger(count) || count < 1) throw new DiceFormulaError("invalid-count", "Dice count must be positive.");
      if (!Number.isSafeInteger(sides)) throw new DiceFormulaError("invalid-sides", "Invalid die sides.");
      tokens.push({ type: "dice", raw: dice[0], normalized: `${count}d${sides}`, count, sides });
      index += dice[0].length;
      continue;
    }

    const number = remaining.match(/^\d+(?:\.\d+)?/);
    if (number) {
      const value = Number(number[0]);
      if (!Number.isFinite(value)) throw new DiceFormulaError("invalid-number", "Invalid number.");
      tokens.push({ type: "number", raw: number[0], normalized: number[0], value });
      index += number[0].length;
      continue;
    }

    const operator = remaining[0];
    if ("+-*/()".includes(operator)) {
      tokens.push({ type: operator, raw: operator, normalized: operator });
      index += 1;
      continue;
    }

    throw new DiceFormulaError("syntax", `Invalid character ${operator}.`);
  }

  if (tokens.length === 0) throw new DiceFormulaError("empty", "Formula is empty.");
  return tokens;
}
